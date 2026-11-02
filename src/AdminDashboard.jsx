import './AdminDashboard.css'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

function getNowIso() {
  return new Date().toISOString()
}

export default function AdminDashboard({ user, onLogout }) {
  const [profiles, setProfiles] = useState([])
  const [colleges, setColleges] = useState([])
  const [courses, setCourses] = useState([])

  const [activePage, setActivePage] = useState('dashboard')

  const [loading, setLoading] = useState(true)
  const [collegesLoading, setCollegesLoading] = useState(true)
  const [coursesLoading, setCoursesLoading] = useState(true)

  const [updatingId, setUpdatingId] = useState(null)
  const [collegeUpdatingId, setCollegeUpdatingId] = useState(null)
  const [courseUpdatingId, setCourseUpdatingId] = useState(null)

  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [collegeError, setCollegeError] = useState('')
  const [courseError, setCourseError] = useState('')

  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [collegeFilter, setCollegeFilter] = useState('all')
  const [collegeSearch, setCollegeSearch] = useState('')

  const [courseFilter, setCourseFilter] = useState('all')
  const [courseSearch, setCourseSearch] = useState('')

  // Load user profiles.
  const loadProfiles = useCallback(async () => {
    setLoading(true)

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(
          'id, full_name, email, role, approval_status, created_at'
        )
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Profiles fetch error:', fetchError)
        setError(`Unable to load profiles: ${fetchError.message}`)
        setProfiles([])
        return
      }

      setProfiles(data || [])
      setError('')
    } catch (err) {
      console.error('Unexpected profiles error:', err)
      setError(err.message || 'Unexpected error loading profiles.')
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Load all colleges, including unpublished colleges.
  const loadColleges = useCallback(async () => {
    setCollegesLoading(true)
    setCollegeError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('colleges')
        .select(
          'id, name, slug, city, state, institution_type, is_published, created_at'
        )
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Colleges fetch error:', fetchError)

        setCollegeError(
          `Unable to fetch colleges: ${fetchError.message} ` +
          `(code: ${fetchError.code || 'unknown'})`
        )

        setColleges([])
        return
      }

      setColleges(data || [])
    } catch (err) {
      console.error('Unexpected colleges error:', err)

      setCollegeError(
        err.message || 'Unexpected error loading colleges.'
      )

      setColleges([])
    } finally {
      setCollegesLoading(false)
    }
  }, [])

  // Load courses and their associated college details.
  const loadCourses = useCallback(async () => {
    setCoursesLoading(true)
    setCourseError('')

    try {
      const { data, error: fetchError } = await supabase
        .from('courses')
        .select(`
          id,
          college_id,
          name,
          degree_level,
          duration_years,
          total_seats,
          annual_fee,
          total_fee,
          course_description,
          is_published,
          created_at,
          colleges (
            id,
            name,
            city,
            state,
            is_published
          )
        `)
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Courses fetch error:', fetchError)

        setCourseError(
          `Unable to fetch courses: ${fetchError.message} ` +
          `(code: ${fetchError.code || 'unknown'})`
        )

        setCourses([])
        return
      }

      setCourses(data || [])
    } catch (err) {
      console.error('Unexpected courses error:', err)

      setCourseError(
        err.message || 'Unexpected error loading courses.'
      )

      setCourses([])
    } finally {
      setCoursesLoading(false)
    }
  }, [])

  // Initial data loading.
  useEffect(() => {
    let active = true

    async function initialize() {
      if (!active) return
      await Promise.all([loadProfiles(), loadColleges(), loadCourses()])
    }

    initialize()

    return () => {
      active = false
    }
  }, [loadProfiles, loadColleges, loadCourses])

  // Refresh every section.
  async function refreshAll() {
    setMessage('')
    setError('')
    setCollegeError('')
    setCourseError('')

    await Promise.all([
      loadProfiles(),
      loadColleges(),
      loadCourses(),
    ])
  }

  // Approve, reject, or change a user's role.
  async function updateProfile(profile, changes) {
    if (profile.id === user?.id && changes.role) {
      setError('You cannot change your own role here.')
      setMessage('')
      return
    }

    setUpdatingId(profile.id)
    setError('')
    setMessage('')

    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(changes)
        .eq('id', profile.id)
        .select('id')

      if (updateError) {
        console.error('Profile update error:', updateError)

        setError(
          `Unable to update account: ${updateError.message}`
        )

        return
      }

      if (!data || data.length === 0) {
        setError(
          'No account was updated. Check your admin UPDATE policy on profiles.'
        )

        return
      }

      setMessage('Account updated successfully.')

      await loadProfiles()
    } catch (err) {
      console.error('Unexpected profile update error:', err)

      setError(
        err.message || 'Unexpected error updating account.'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  // Publish or unpublish a college.
  async function handleUpdateCollege(college, publish) {
    setCollegeUpdatingId(college.id)
    setCollegeError('')
    setMessage('')
    setError('')

    try {
      const { data, error: updateError } = await supabase
        .from('colleges')
        .update({
          is_published: publish,
          updated_at: getNowIso(),
        })
        .eq('id', college.id)
        .select('id, name, is_published')
        .maybeSingle()

      if (updateError) {
        console.error('College update error:', updateError)

        setCollegeError(
          `Unable to update college: ${updateError.message} ` +
          `(code: ${updateError.code || 'unknown'})`
        )

        return
      }

      if (!data) {
        setCollegeError(
          'No college was updated. Check that the record exists and your admin UPDATE policy permits this operation.'
        )

        return
      }

      setMessage(
        publish
          ? `${data.name} has been published successfully.`
          : `${data.name} has been unpublished.`
      )

      await Promise.all([
        loadColleges(),
        loadCourses(),
      ])
    } catch (err) {
      console.error('Unexpected college update error:', err)

      setCollegeError(
        err.message || 'Unexpected error updating college.'
      )
    } finally {
      setCollegeUpdatingId(null)
    }
  }

  // Publish or unpublish a course.
  async function handleUpdateCourse(course, publish) {
    setCourseUpdatingId(course.id)
    setCourseError('')
    setMessage('')
    setError('')

    /*
     * CORRECTION:
     * A course without college_id is a standalone course.
     * Standalone courses can be published independently.
     *
     * A course with college_id must have a published college.
     */
    const isLinkedCourse = Boolean(course.college_id)

    const linkedCollegePublished =
      course.colleges?.is_published === true

    if (
      publish &&
      isLinkedCourse &&
      !linkedCollegePublished
    ) {
      setCourseError(
        'Publish the associated college first, then publish this course.'
      )

      setCourseUpdatingId(null)
      return
    }

    try {
      const { data, error: updateError } = await supabase
        .from('courses')
        .update({
          is_published: publish,
          updated_at: getNowIso(),
        })
        .eq('id', course.id)
        .select('id, name, is_published')
        .maybeSingle()

      if (updateError) {
        console.error('Course update error:', updateError)

        setCourseError(
          `Unable to update course: ${updateError.message} ` +
          `(code: ${updateError.code || 'unknown'})`
        )

        return
      }

      if (!data) {
        setCourseError(
          'No course was updated. Check that the record exists and your admin UPDATE policy permits this operation.'
        )

        return
      }

      setMessage(
        publish
          ? `${data.name} has been published successfully.`
          : `${data.name} has been unpublished.`
      )

      await loadCourses()
    } catch (err) {
      console.error('Unexpected course update error:', err)

      setCourseError(
        err.message || 'Unexpected error updating course.'
      )
    } finally {
      setCourseUpdatingId(null)
    }
  }

  // Profile search and filters.
  const filteredProfiles = profiles.filter((profile) => {
    const matchesFilter =
      filter === 'all' ||
      profile.role === filter ||
      profile.approval_status === filter

    const searchText = search.toLowerCase()

    const matchesSearch =
      (profile.full_name || '')
        .toLowerCase()
        .includes(searchText) ||
      (profile.email || '')
        .toLowerCase()
        .includes(searchText) ||
      String(profile.id || '')
        .toLowerCase()
        .includes(searchText)

    return matchesFilter && matchesSearch
  })

  // College search and filters.
  const filteredColleges = colleges.filter((college) => {
    const matchesFilter =
      collegeFilter === 'all' ||
      (collegeFilter === 'pending' &&
        !college.is_published) ||
      (collegeFilter === 'published' &&
        college.is_published)

    const searchText = collegeSearch.toLowerCase()

    const matchesSearch =
      (college.name || '')
        .toLowerCase()
        .includes(searchText) ||
      (college.slug || '')
        .toLowerCase()
        .includes(searchText) ||
      (college.city || '')
        .toLowerCase()
        .includes(searchText) ||
      (college.state || '')
        .toLowerCase()
        .includes(searchText)

    return matchesFilter && matchesSearch
  })

  // Course search and filters.
  const filteredCourses = courses.filter((course) => {
    const matchesFilter =
      courseFilter === 'all' ||
      (courseFilter === 'pending' &&
        !course.is_published) ||
      (courseFilter === 'published' &&
        course.is_published)

    const searchText = courseSearch.toLowerCase()

    const matchesSearch =
      (course.name || '')
        .toLowerCase()
        .includes(searchText) ||
      (course.degree_level || '')
        .toLowerCase()
        .includes(searchText) ||
      (course.colleges?.name || '')
        .toLowerCase()
        .includes(searchText) ||
      (course.colleges?.city || '')
        .toLowerCase()
        .includes(searchText)

    return matchesFilter && matchesSearch
  })

  // Dashboard counts.
  const countRole = (role) =>
    profiles.filter((profile) => profile.role === role).length

  const countStatus = (status) =>
    profiles.filter(
      (profile) => profile.approval_status === status
    ).length

  const countUnpublishedColleges = colleges.filter(
    (college) => !college.is_published
  ).length

  const countPublishedColleges = colleges.filter(
    (college) => college.is_published
  ).length

  const countUnpublishedCourses = courses.filter(
    (course) => !course.is_published
  ).length

  const countPublishedCourses = courses.filter(
    (course) => course.is_published
  ).length

  function formatMoney(value) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return 'Not specified'
    }

    const amount = Number(value)

    if (!Number.isFinite(amount)) {
      return 'Not specified'
    }

    return amount.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    })
  }

  const pageTitles = {
    dashboard: 'Dashboard',
    courses: 'Course Management',
    users: 'User Management',
    colleges: 'College Management',
  }

  const isRefreshing =
    loading || collegesLoading || coursesLoading

  return (
    <div className="admin-page">
      {/* HEADER */}
      <header className="admin-header">
        <div className="admin-header-brand">
          <div className="admin-header-logo">CC</div>

          <div>
            <h1>CourseCompass Admin</h1>
            <p>Administration &amp; Management Portal</p>
          </div>
        </div>

        <div className="admin-header-right">
          <span className="admin-online-indicator">
            <span />
            Administrator
          </span>

          <button
            className="admin-logout"
            onClick={onLogout}
            type="button"
          >
            <span>↪</span> Logout
          </button>
        </div>
      </header>

      <div className="admin-layout">
        {/* SIDEBAR */}
        <aside className="admin-sidebar">
          <div className="admin-sidebar-title">
            <span className="admin-sidebar-logo">CC</span>

            <div>
              <strong>CourseCompass</strong>
              <small>ADMIN PANEL</small>
            </div>
          </div>

          <p className="admin-sidebar-label">ADMIN WORKSPACE</p>

          <nav className="admin-sidebar-nav">
            <button
              type="button"
              className={`admin-nav-item ${activePage === 'dashboard' ? 'active' : ''
                }`}
              onClick={() => setActivePage('dashboard')}
            >
              <span className="admin-nav-icon">⌂</span>
              <span className="admin-nav-text">Dashboard</span>
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activePage === 'courses' ? 'active' : ''
                }`}
              onClick={() => setActivePage('courses')}
            >
              <span className="admin-nav-icon">▤</span>
              <span className="admin-nav-text">
                Course Management
              </span>

              {countUnpublishedCourses > 0 && (
                <span className="admin-nav-count">
                  {countUnpublishedCourses}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activePage === 'users' ? 'active' : ''
                }`}
              onClick={() => setActivePage('users')}
            >
              <span className="admin-nav-icon">♙</span>
              <span className="admin-nav-text">
                User Management
              </span>

              {countStatus('pending') > 0 && (
                <span className="admin-nav-count">
                  {countStatus('pending')}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`admin-nav-item ${activePage === 'colleges' ? 'active' : ''
                }`}
              onClick={() => setActivePage('colleges')}
            >
              <span className="admin-nav-icon">▦</span>
              <span className="admin-nav-text">
                College Management
              </span>

              {countUnpublishedColleges > 0 && (
                <span className="admin-nav-count">
                  {countUnpublishedColleges}
                </span>
              )}
            </button>
          </nav>

          <div className="admin-sidebar-footer">
            <span className="admin-sidebar-avatar">A</span>

            <div className="admin-sidebar-user">
              <strong>Administrator</strong>
              <small>{user?.email || 'Admin account'}</small>
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="admin-content">
          <div className="admin-page-heading">
            <div>
              <p className="admin-breadcrumb">
                COURSECOMPASS / ADMIN
              </p>

              <h2>{pageTitles[activePage]}</h2>

              <p className="admin-page-subtitle">
                {activePage === 'dashboard' &&
                  'Monitor your platform and review important activity.'}

                {activePage === 'courses' &&
                  'Review, manage and publish courses submitted by coordinators.'}

                {activePage === 'users' &&
                  'Manage user accounts, approvals and account roles.'}

                {activePage === 'colleges' &&
                  'Review college information and control publication.'}
              </p>
            </div>

            <button
              type="button"
              className="admin-refresh"
              onClick={refreshAll}
              disabled={isRefreshing}
            >
              ↻ {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>

          {/* SUCCESS MESSAGE */}
          {message && (
            <div
              className="admin-message success"
              role="status"
            >
              <span>✓</span> {message}
            </div>
          )}

          {/* GENERAL ERROR */}
          {error && (
            <div
              className="admin-message error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* DASHBOARD */}
          {activePage === 'dashboard' && (
            <>
              <section className="admin-welcome">
                <div className="admin-welcome-content">
                  <span className="admin-welcome-tag">
                    ADMIN OVERVIEW
                  </span>

                  <h3>Welcome back, Administrator!</h3>

                  <p>
                    You are signed in as{' '}
                    <strong>{user?.email || 'Admin'}</strong>.
                    Manage your colleges, courses and users from
                    one place.
                  </p>
                </div>

                <div
                  className="admin-welcome-art"
                  aria-hidden="true"
                >
                  <span>CC</span>
                </div>
              </section>

              <section className="admin-stats">
                <div className="admin-stat-card stat-blue">
                  <div className="admin-stat-top">
                    <span>Total Accounts</span>
                    <span className="admin-stat-icon">♙</span>
                  </div>
                  <strong>{profiles.length}</strong>
                  <small>Registered users</small>
                </div>

                <div className="admin-stat-card stat-purple">
                  <div className="admin-stat-top">
                    <span>Students</span>
                    <span className="admin-stat-icon">♟</span>
                  </div>
                  <strong>{countRole('student')}</strong>
                  <small>Student accounts</small>
                </div>

                <div className="admin-stat-card stat-cyan">
                  <div className="admin-stat-top">
                    <span>Coordinators</span>
                    <span className="admin-stat-icon">♧</span>
                  </div>
                  <strong>{countRole('coordinator')}</strong>
                  <small>Coordinator accounts</small>
                </div>

                <div className="admin-stat-card stat-amber">
                  <div className="admin-stat-top">
                    <span>Pending Users</span>
                    <span className="admin-stat-icon">◷</span>
                  </div>
                  <strong>{countStatus('pending')}</strong>
                  <small>Awaiting account approval</small>
                </div>

                <div className="admin-stat-card stat-orange">
                  <div className="admin-stat-top">
                    <span>Pending Colleges</span>
                    <span className="admin-stat-icon">▦</span>
                  </div>
                  <strong>{countUnpublishedColleges}</strong>
                  <small>Awaiting publication</small>
                </div>

                <div className="admin-stat-card stat-green">
                  <div className="admin-stat-top">
                    <span>Published Colleges</span>
                    <span className="admin-stat-icon">✓</span>
                  </div>
                  <strong>{countPublishedColleges}</strong>
                  <small>Visible colleges</small>
                </div>

                <div className="admin-stat-card stat-pink">
                  <div className="admin-stat-top">
                    <span>Pending Courses</span>
                    <span className="admin-stat-icon">▤</span>
                  </div>
                  <strong>{countUnpublishedCourses}</strong>
                  <small>Awaiting publication</small>
                </div>

                <div className="admin-stat-card stat-teal">
                  <div className="admin-stat-top">
                    <span>Published Courses</span>
                    <span className="admin-stat-icon">✓</span>
                  </div>
                  <strong>{countPublishedCourses}</strong>
                  <small>Visible courses</small>
                </div>
              </section>

              <section className="admin-panel">
                <div className="admin-panel-heading">
                  <div>
                    <h3>Quick Management</h3>
                    <p>
                      Choose a section to manage your platform.
                    </p>
                  </div>
                </div>

                <div className="admin-quick-grid">
                  <button
                    type="button"
                    className="admin-quick-card"
                    onClick={() => setActivePage('courses')}
                  >
                    <span className="admin-quick-icon quick-blue">
                      ▤
                    </span>

                    <span className="admin-quick-title">
                      Course Management
                    </span>

                    <span className="admin-quick-description">
                      Review and publish courses
                    </span>

                    <span className="admin-quick-arrow">→</span>
                  </button>

                  <button
                    type="button"
                    className="admin-quick-card"
                    onClick={() => setActivePage('users')}
                  >
                    <span className="admin-quick-icon quick-purple">
                      ♙
                    </span>

                    <span className="admin-quick-title">
                      User Management
                    </span>

                    <span className="admin-quick-description">
                      Approve users and manage roles
                    </span>

                    <span className="admin-quick-arrow">→</span>
                  </button>

                  <button
                    type="button"
                    className="admin-quick-card"
                    onClick={() => setActivePage('colleges')}
                  >
                    <span className="admin-quick-icon quick-green">
                      ▦
                    </span>

                    <span className="admin-quick-title">
                      College Management
                    </span>

                    <span className="admin-quick-description">
                      Review and publish colleges
                    </span>

                    <span className="admin-quick-arrow">→</span>
                  </button>
                </div>
              </section>
            </>
          )}

          {/* COLLEGE MANAGEMENT */}
          {activePage === 'colleges' && (
            <section className="admin-panel">
              <div className="admin-users-heading">
                <div>
                  <h3>College Management</h3>
                  <p>
                    Review college submissions and publish
                    colleges for students.
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-refresh"
                  onClick={loadColleges}
                  disabled={collegesLoading}
                >
                  {collegesLoading
                    ? 'Loading...'
                    : 'Refresh Colleges'}
                </button>
              </div>

              {collegeError && (
                <div
                  className="admin-message error"
                  role="alert"
                >
                  {collegeError}
                </div>
              )}

              <div className="admin-filters">
                <input
                  type="search"
                  placeholder="Search college, city or state..."
                  value={collegeSearch}
                  onChange={(event) =>
                    setCollegeSearch(event.target.value)
                  }
                />

                <select
                  value={collegeFilter}
                  onChange={(event) =>
                    setCollegeFilter(event.target.value)
                  }
                >
                  <option value="all">All colleges</option>
                  <option value="pending">
                    Awaiting publication
                  </option>
                  <option value="published">Published</option>
                </select>
              </div>

              {collegesLoading ? (
                <p className="admin-empty">
                  Loading colleges...
                </p>
              ) : collegeError && colleges.length === 0 ? (
                <p className="admin-empty">
                  Could not load colleges. Check Supabase
                  permissions and database columns.
                </p>
              ) : filteredColleges.length === 0 ? (
                <p className="admin-empty">
                  No matching colleges found. Select All colleges
                  and refresh.
                </p>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>College</th>
                        <th>Location</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredColleges.map((college) => {
                        const isUpdating =
                          collegeUpdatingId === college.id

                        return (
                          <tr key={college.id}>
                            <td>
                              <strong>
                                {college.name || 'Unnamed college'}
                              </strong>

                              <small>
                                {college.slug || college.id}
                              </small>
                            </td>

                            <td>
                              {[
                                college.city,
                                college.state,
                              ]
                                .filter(Boolean)
                                .join(', ') || '—'}
                            </td>

                            <td>
                              {college.institution_type || '—'}
                            </td>

                            <td>
                              <span
                                className={`admin-status ${college.is_published
                                  ? 'approved'
                                  : 'pending'
                                  }`}
                              >
                                {college.is_published
                                  ? 'Published'
                                  : 'Awaiting publication'}
                              </span>
                            </td>

                            <td>
                              <div className="admin-actions">
                                {college.is_published ? (
                                  <button
                                    type="button"
                                    className="reject-btn"
                                    disabled={isUpdating}
                                    onClick={() =>
                                      handleUpdateCollege(
                                        college,
                                        false
                                      )
                                    }
                                  >
                                    {isUpdating
                                      ? 'Saving...'
                                      : 'Unpublish'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="approve-btn"
                                    disabled={isUpdating}
                                    onClick={() =>
                                      handleUpdateCollege(
                                        college,
                                        true
                                      )
                                    }
                                  >
                                    {isUpdating
                                      ? 'Publishing...'
                                      : 'Approve & Publish'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* COURSE MANAGEMENT */}
          {activePage === 'courses' && (
            <section className="admin-panel">
              <div className="admin-users-heading">
                <div>
                  <h3>Course Management</h3>
                  <p>
                    Review courses added by coordinators and
                    publish approved courses.
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-refresh"
                  onClick={loadCourses}
                  disabled={coursesLoading}
                >
                  {coursesLoading
                    ? 'Loading...'
                    : 'Refresh Courses'}
                </button>
              </div>

              {courseError && (
                <div
                  className="admin-message error"
                  role="alert"
                >
                  {courseError}
                </div>
              )}

              <div className="admin-filters">
                <input
                  type="search"
                  placeholder="Search course or college..."
                  value={courseSearch}
                  onChange={(event) =>
                    setCourseSearch(event.target.value)
                  }
                />

                <select
                  value={courseFilter}
                  onChange={(event) =>
                    setCourseFilter(event.target.value)
                  }
                >
                  <option value="all">All courses</option>
                  <option value="pending">
                    Awaiting publication
                  </option>
                  <option value="published">Published</option>
                </select>
              </div>

              {coursesLoading ? (
                <p className="admin-empty">
                  Loading courses...
                </p>
              ) : courseError && courses.length === 0 ? (
                <p className="admin-empty">
                  Could not load courses. Check the courses table,
                  column names, foreign key relationship, and
                  SELECT permissions.
                </p>
              ) : filteredCourses.length === 0 ? (
                <p className="admin-empty">
                  No matching courses found. Select All courses
                  and refresh.
                </p>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>College</th>
                        <th>Duration</th>
                        <th>Seats</th>
                        <th>Annual Fee</th>
                        <th>Total Fee</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredCourses.map((course) => {
                        const isUpdating =
                          courseUpdatingId === course.id

                        const isLinkedCourse =
                          Boolean(course.college_id)

                        const collegePublished =
                          course.colleges?.is_published === true

                        // Standalone courses may publish directly.
                        // Linked courses require a published college.
                        const canPublish =
                          !isLinkedCourse || collegePublished

                        return (
                          <tr key={course.id}>
                            <td>
                              <strong>
                                {course.name || 'Unnamed course'}
                              </strong>

                              <small>
                                {course.degree_level ||
                                  'Degree not specified'}
                              </small>

                              {course.course_description && (
                                <small>
                                  {course.course_description}
                                </small>
                              )}
                            </td>

                            <td>
                              <strong>
                                {course.colleges?.name ||
                                  (isLinkedCourse
                                    ? 'College details unavailable'
                                    : 'Standalone course')}
                              </strong>

                              <small>
                                {[
                                  course.colleges?.city,
                                  course.colleges?.state,
                                ]
                                  .filter(Boolean)
                                  .join(', ') || '—'}
                              </small>

                              {isLinkedCourse &&
                                !collegePublished && (
                                  <small className="admin-warning-text">
                                    College is not published
                                  </small>
                                )}
                            </td>

                            <td>
                              {course.duration_years
                                ? `${course.duration_years} years`
                                : '—'}
                            </td>

                            <td>
                              {course.total_seats ?? '—'}
                            </td>

                            <td>
                              {formatMoney(course.annual_fee)}
                            </td>

                            <td>
                              {formatMoney(course.total_fee)}
                            </td>

                            <td>
                              <span
                                className={`admin-status ${course.is_published
                                  ? 'approved'
                                  : 'pending'
                                  }`}
                              >
                                {course.is_published
                                  ? 'Published'
                                  : 'Awaiting publication'}
                              </span>
                            </td>

                            <td>
                              <div className="admin-actions">
                                {course.is_published ? (
                                  <button
                                    type="button"
                                    className="reject-btn"
                                    disabled={isUpdating}
                                    onClick={() =>
                                      handleUpdateCourse(
                                        course,
                                        false
                                      )
                                    }
                                  >
                                    {isUpdating
                                      ? 'Saving...'
                                      : 'Unpublish'}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    className="approve-btn"
                                    disabled={
                                      isUpdating || !canPublish
                                    }
                                    title={
                                      !canPublish
                                        ? 'Publish the associated college first'
                                        : 'Publish this course'
                                    }
                                    onClick={() =>
                                      handleUpdateCourse(
                                        course,
                                        true
                                      )
                                    }
                                  >
                                    {isUpdating
                                      ? 'Publishing...'
                                      : !canPublish
                                        ? 'Publish College First'
                                        : 'Publish Course'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* USER MANAGEMENT */}
          {activePage === 'users' && (
            <section className="admin-panel">
              <div className="admin-users-heading">
                <div>
                  <h3>User Management</h3>
                  <p>
                    Review accounts and manage user access.
                  </p>
                </div>

                <button
                  type="button"
                  className="admin-refresh"
                  onClick={loadProfiles}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Refresh Users'}
                </button>
              </div>

              {error && (
                <div
                  className="admin-message error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <div className="admin-filters">
                <input
                  type="search"
                  placeholder="Search name, email or user ID..."
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />

                <select
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value)
                  }
                >
                  <option value="all">All accounts</option>
                  <option value="student">Students</option>
                  <option value="coordinator">Coordinators</option>
                  <option value="admin">Admins</option>
                  <option value="pending">Pending approval</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {loading ? (
                <p className="admin-empty">
                  Loading accounts...
                </p>
              ) : error && profiles.length === 0 ? (
                <p className="admin-empty">
                  Unable to load accounts. Check Supabase
                  permissions.
                </p>
              ) : filteredProfiles.length === 0 ? (
                <p className="admin-empty">
                  No matching accounts found.
                </p>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredProfiles.map((profile) => {
                        const isSelf =
                          profile.id === user?.id

                        const isUpdating =
                          updatingId === profile.id

                        return (
                          <tr key={profile.id}>
                            <td>
                              <strong>
                                {profile.full_name ||
                                  'Unnamed user'}
                              </strong>

                              <small>
                                {profile.email ||
                                  'No email recorded'}
                              </small>

                              {isSelf && (
                                <small>Your account</small>
                              )}
                            </td>

                            <td>
                              <span className="admin-role">
                                {profile.role || '—'}
                              </span>
                            </td>

                            <td>
                              <span
                                className={`admin-status ${profile.approval_status ||
                                  'pending'
                                  }`}
                              >
                                {profile.approval_status ||
                                  'Unknown'}
                              </span>
                            </td>

                            <td>
                              {profile.created_at
                                ? new Date(
                                  profile.created_at
                                ).toLocaleDateString()
                                : '—'}
                            </td>

                            <td>
                              <div className="admin-actions">
                                {profile.approval_status !==
                                  'approved' && (
                                    <button
                                      type="button"
                                      className="approve-btn"
                                      disabled={isUpdating}
                                      onClick={() =>
                                        updateProfile(profile, {
                                          approval_status:
                                            'approved',
                                        })
                                      }
                                    >
                                      Approve
                                    </button>
                                  )}

                                {profile.approval_status !==
                                  'rejected' && (
                                    <button
                                      type="button"
                                      className="reject-btn"
                                      disabled={isUpdating}
                                      onClick={() =>
                                        updateProfile(profile, {
                                          approval_status:
                                            'rejected',
                                        })
                                      }
                                    >
                                      Reject
                                    </button>
                                  )}

                                {!isSelf &&
                                  profile.role === 'student' && (
                                    <button
                                      type="button"
                                      className="role-btn"
                                      disabled={isUpdating}
                                      onClick={() =>
                                        updateProfile(profile, {
                                          role: 'coordinator',
                                        })
                                      }
                                    >
                                      Make Coordinator
                                    </button>
                                  )}

                                {!isSelf &&
                                  profile.role ===
                                  'coordinator' && (
                                    <button
                                      type="button"
                                      className="role-btn"
                                      disabled={isUpdating}
                                      onClick={() =>
                                        updateProfile(profile, {
                                          role: 'student',
                                        })
                                      }
                                    >
                                      Make Student
                                    </button>
                                  )}

                                {isUpdating && (
                                  <span>Saving...</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* FOOTER */}
          <footer className="admin-footer">
            <span>CourseCompass Admin Portal</span>
            <span>College discovery &amp; management</span>
          </footer>
        </main>
      </div>
    </div>
  )
}