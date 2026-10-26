import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import CollegeFinder from './CollegeFinder'
import './Dashboard.css'

const defaultCourses = [
  {
    id: 'cse',
    name: 'Computer Science Engineering',
    category: 'Engineering',
    icon: '💻',
    description: 'Explore programming, software development, and computer systems.',
    careers: 'Software Developer, Web Developer, Systems Engineer',
  },
  {
    id: 'aiml',
    name: 'Artificial Intelligence & Machine Learning',
    category: 'Artificial Intelligence',
    icon: '🤖',
    description: 'Learn about intelligent systems, machine learning, and automation.',
    careers: 'AI Engineer, ML Engineer, AI Researcher',
  },
  {
    id: 'ds',
    name: 'Data Science',
    category: 'Data',
    icon: '📊',
    description: 'Discover data analysis, statistics, and predictive modelling.',
    careers: 'Data Analyst, Data Scientist, Business Analyst',
  },
  {
    id: 'cyber',
    name: 'Cyber Security',
    category: 'Security',
    icon: '🔐',
    description: 'Understand digital security, networks, and threat prevention.',
    careers: 'Security Analyst, SOC Analyst, Security Engineer',
  },
  {
    id: 'iot',
    name: 'Internet of Things',
    category: 'Technology',
    icon: '🌐',
    description: 'Connect physical devices using sensors, embedded systems, and networks.',
    careers: 'IoT Developer, Embedded Engineer, IoT Solutions Engineer',
  },
  {
    id: 'ece',
    name: 'Electronics & Communication',
    category: 'Engineering',
    icon: '⚡',
    description: 'Explore electronics, communication systems, and hardware design.',
    careers: 'Electronics Engineer, Network Engineer, Hardware Engineer',
  },
]

const initialSaved = () => {
  try {
    return JSON.parse(localStorage.getItem('coursecompass_saved_courses') || '[]')
  } catch {
    return []
  }
}

export default function Dashboard({ user, onLogout, onNavigate }) {
  const [activePage, setActivePage] = useState('overview')
  const [profile, setProfile] = useState(null)
  const [courses, setCourses] = useState(defaultCourses)
  const [savedIds, setSavedIds] = useState(initialSaved)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true

    async function loadDashboard() {
      if (user?.id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, email, role')
          .eq('id', user.id)
          .maybeSingle()

        if (active) setProfile(profileData)
      }

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .limit(100)

      if (active) {
        if (!error && data?.length) {
          const mapped = data.map((course, index) => ({
            id: course.id ?? `database-course-${index}`,
            name:
              course.name ??
              course.course_name ??
              course.title ??
              'Course',
            category:
              course.category ??
              course.domain ??
              'Other',
            icon: '🎓',
            description:
              course.description ??
              'Explore this course and learn about its opportunities.',
            careers:
              course.careers ??
              'Career opportunities depend on your skills and experience.',
          }))

          setCourses(mapped)
        }

        setLoadingCourses(false)
      }
    }

    loadDashboard()

    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    localStorage.setItem(
      'coursecompass_saved_courses',
      JSON.stringify(savedIds),
    )
  }, [savedIds])

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    'Student'

  const categories = [
    'All',
    ...new Set(courses.map((course) => course.category).filter(Boolean)),
  ]

  const filteredCourses = courses.filter((course) => {
    const matchesSearch = [
      course.name,
      course.category,
      course.description,
      course.careers,
    ]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchesCategory =
      category === 'All' || course.category === category

    const matchesSaved =
      activePage !== 'saved' || savedIds.includes(String(course.id))

    return matchesSearch && matchesCategory && matchesSaved
  })

  function toggleSaved(course) {
    const id = String(course.id)

    setSavedIds((previous) =>
      previous.includes(id)
        ? previous.filter((savedId) => savedId !== id)
        : [...previous, id],
    )

    setMessage(
      savedIds.includes(id)
        ? 'Course removed from saved courses.'
        : 'Course saved successfully.',
    )

    window.setTimeout(() => setMessage(''), 2500)
  }

  function navigate(page) {
    setActivePage(page)
    setSelectedCourse(null)
    setSearch('')
    setCategory('All')
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage(error.message)
      return
    }

    if (onLogout) onLogout()
  }

  const pageTitles = {
    overview: 'Dashboard Overview',
    courses: 'Explore Courses',
    colleges: 'College Finder',
    saved: 'Your Saved Courses',
    profile: 'My Profile',
  }

  return (
    <div className="cc-dashboard">
      <aside className="cc-sidebar">
        <button
          className="cc-brand"
          onClick={() => navigate('overview')}
          aria-label="CourseCompass home"
        >
          <span className="cc-brand-icon">C</span>
          <span>
            Course<span>Compass</span>
          </span>
        </button>

        <div className="cc-sidebar-label">WORKSPACE</div>

        <nav className="cc-side-nav">
          <button
            className={activePage === 'overview' ? 'active' : ''}
            onClick={() => navigate('overview')}
          >
            <span>▦</span> Overview
          </button>

          <button
            className={activePage === 'courses' ? 'active' : ''}
            onClick={() => navigate('courses')}
          >
            <span>▤</span> Explore Courses
          </button>

          <button
            className={activePage === 'colleges' ? 'active' : ''}
            onClick={() => navigate('colleges')}
          >
            <span>⌂</span> College Finder
          </button>

          <button
            className={activePage === 'saved' ? 'active' : ''}
            onClick={() => navigate('saved')}
          >
            <span>♡</span> Saved Courses
            <span className="cc-nav-count">{savedIds.length}</span>
          </button>

          <button
            className={activePage === 'profile' ? 'active' : ''}
            onClick={() => navigate('profile')}
          >
            <span>◎</span> My Profile
          </button>
        </nav>

        <div className="cc-sidebar-bottom">
          <div className="cc-help-card">
            <div className="cc-help-icon">✦</div>
            <h4>Your future starts here</h4>
            <p>Explore courses and discover your possibilities.</p>
            <button onClick={() => navigate('courses')}>
              Explore now →
            </button>
          </div>

          <button className="cc-logout" onClick={handleLogout}>
            <span>↪</span> Log out
          </button>
        </div>
      </aside>

      <main className="cc-main">
        <header className="cc-topbar">
          <div className="cc-breadcrumb">
            <span>CourseCompass</span>
            <span className="cc-breadcrumb-divider">/</span>
            {pageTitles[activePage]}
          </div>

          <button
            className="cc-user-chip"
            onClick={() => navigate('profile')}
          >
            <span className="cc-avatar">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="cc-user-chip-name">{displayName}</span>
            <span className="cc-chevron">⌄</span>
          </button>
        </header>

        <div className="cc-content">
          {message && (
            <div className="cc-toast" role="status">
              {message}
            </div>
          )}

          {activePage === 'overview' && (
            <>
              <section className="cc-welcome">
                <div className="cc-welcome-copy">
                  <span className="cc-eyebrow">YOUR LEARNING JOURNEY</span>
                  <h1>
                    Welcome back, {displayName.split(' ')[0]}!
                    <span className="cc-wave"> 👋</span>
                  </h1>
                  <p>
                    Your future is full of possibilities. Explore your
                    interests and take the next step toward your dream career.
                  </p>

                  <button
                    className="cc-primary-btn"
                    onClick={() => navigate('courses')}
                  >
                    Explore courses <span>→</span>
                  </button>
                </div>

                <div className="cc-welcome-art" aria-hidden="true">
                  <div className="cc-art-orbit cc-orbit-one" />
                  <div className="cc-art-orbit cc-orbit-two" />
                  <div className="cc-art-book">📚</div>
                  <div className="cc-art-star cc-star-one">✦</div>
                  <div className="cc-art-star cc-star-two">✧</div>
                  <div className="cc-art-pill">Discover your path</div>
                </div>
              </section>

              <section className="cc-stats-grid">
                <article className="cc-stat-card">
                  <div className="cc-stat-top">
                    <span className="cc-stat-icon purple">▤</span>
                    <span className="cc-stat-label">Available courses</span>
                  </div>
                  <strong>{courses.length}</strong>
                  <p>Courses to explore</p>
                </article>

                <article className="cc-stat-card">
                  <div className="cc-stat-top">
                    <span className="cc-stat-icon pink">♡</span>
                    <span className="cc-stat-label">Saved courses</span>
                  </div>
                  <strong>{savedIds.length}</strong>
                  <p>Your personal shortlist</p>
                </article>

                <article className="cc-stat-card">
                  <div className="cc-stat-top">
                    <span className="cc-stat-icon blue">◎</span>
                    <span className="cc-stat-label">Career assessment</span>
                  </div>
                  <strong>Ready</strong>
                  <p>Discover your interests</p>
                </article>

                <article className="cc-stat-card">
                  <div className="cc-stat-top">
                    <span className="cc-stat-icon green">↗</span>
                    <span className="cc-stat-label">Your next step</span>
                  </div>
                  <strong>Explore</strong>
                  <p>Find your future direction</p>
                </article>
              </section>

              <section className="cc-section">
                <div className="cc-section-heading">
                  <div>
                    <span className="cc-eyebrow">START EXPLORING</span>
                    <h2>Popular courses</h2>
                    <p>Discover fields that could shape your future.</p>
                  </div>
                  <button
                    className="cc-text-btn"
                    onClick={() => navigate('courses')}
                  >
                    View all courses →
                  </button>
                </div>

                <div className="cc-course-grid">
                  {courses.slice(0, 3).map((course) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      saved={savedIds.includes(String(course.id))}
                      onOpen={() => setSelectedCourse(course)}
                      onSave={() => toggleSaved(course)}
                    />
                  ))}
                </div>
              </section>

              <section className="cc-next-step">
                <div className="cc-next-step-icon">✦</div>
                <div>
                  <h3>Not sure which course is right for you?</h3>
                  <p>
                    Start by exploring different fields, their skills, and
                    possible career opportunities.
                  </p>
                </div>
                <button
                  className="cc-secondary-btn"
                  onClick={() => navigate('courses')}
                >
                  Find your path →
                </button>
              </section>
            </>
          )}

          {activePage === 'courses' && (
            <section className="cc-section cc-page-section">
              <div className="cc-section-heading">
                <div>
                  <span className="cc-eyebrow">FIND YOUR DIRECTION</span>
                  <h1>Explore courses</h1>
                  <p>Search different fields and discover career options.</p>
                </div>
              </div>

              <div className="cc-course-tools">
                <label className="cc-search-box">
                  <span>⌕</span>
                  <input
                    type="search"
                    placeholder="Search courses, skills, or careers..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>

                <select
                  aria-label="Filter by category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item === 'All' ? 'All categories' : item}
                    </option>
                  ))}
                </select>
              </div>

              {loadingCourses && (
                <p className="cc-info-message">Loading courses…</p>
              )}

              <div className="cc-course-grid">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    saved={savedIds.includes(String(course.id))}
                    onOpen={() => setSelectedCourse(course)}
                    onSave={() => toggleSaved(course)}
                  />
                ))}
              </div>

              {!loadingCourses && filteredCourses.length === 0 && (
                <div className="cc-empty-state">
                  <span>🔎</span>
                  <h3>No courses found</h3>
                  <p>Try a different search term or category.</p>
                  <button
                    className="cc-secondary-btn"
                    onClick={() => {
                      setSearch('')
                      setCategory('All')
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </section>
          )}

          {activePage === 'colleges' && <CollegeFinder />}

          {activePage === 'saved' && (
            <section className="cc-section cc-page-section">
              <div className="cc-section-heading">
                <div>
                  <span className="cc-eyebrow">YOUR SHORTLIST</span>
                  <h1>Saved courses</h1>
                  <p>Keep track of courses you want to explore further.</p>
                </div>
              </div>

              <div className="cc-course-grid">
                {filteredCourses.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    saved
                    onOpen={() => setSelectedCourse(course)}
                    onSave={() => toggleSaved(course)}
                  />
                ))}
              </div>

              {filteredCourses.length === 0 && (
                <div className="cc-empty-state">
                  <span>♡</span>
                  <h3>Your shortlist is empty</h3>
                  <p>Save courses you like and find them here later.</p>
                  <button
                    className="cc-primary-btn"
                    onClick={() => navigate('courses')}
                  >
                    Explore courses →
                  </button>
                </div>
              )}
            </section>
          )}

          {activePage === 'profile' && (
            <section className="cc-section cc-page-section">
              <span className="cc-eyebrow">YOUR ACCOUNT</span>
              <h1>My profile</h1>
              <p className="cc-profile-intro">
                Review your current account information.
              </p>

              <div className="cc-profile-card">
                <div className="cc-profile-avatar">
                  {displayName.charAt(0).toUpperCase()}
                </div>

                <h2>{displayName}</h2>
                <p>{user?.email || profile?.email || 'No email available'}</p>

                <div className="cc-profile-divider" />

                <div className="cc-profile-row">
                  <span>Full name</span>
                  <strong>{profile?.full_name || displayName}</strong>
                </div>

                <div className="cc-profile-row">
                  <span>Email address</span>
                  <strong>{user?.email || profile?.email || '—'}</strong>
                </div>

                <div className="cc-profile-row">
                  <span>Account role</span>
                  <strong>{profile?.role || 'student'}</strong>
                </div>

                <div className="cc-profile-row">
                  <span>Saved courses</span>
                  <strong>{savedIds.length}</strong>
                </div>

                <p className="cc-profile-note">
                  Profile editing and education details will be added in a
                  later development step.
                </p>
              </div>
            </section>
          )}

          <footer className="cc-dashboard-footer">
            <span>© {new Date().getFullYear()} CourseCompass</span>
            <span>Explore possibilities. Build your future.</span>
          </footer>
        </div>
      </main>

      {selectedCourse && (
        <div
          className="cc-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedCourse(null)
            }
          }}
        >
          <div
            className="cc-course-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cc-course-title"
          >
            <button
              className="cc-modal-close"
              onClick={() => setSelectedCourse(null)}
              aria-label="Close course details"
            >
              ×
            </button>

            <div className="cc-modal-icon">{selectedCourse.icon}</div>
            <span className="cc-eyebrow">{selectedCourse.category}</span>
            <h2 id="cc-course-title">{selectedCourse.name}</h2>
            <p>{selectedCourse.description}</p>

            <div className="cc-modal-careers">
              <h3>Possible career paths</h3>
              <p>{selectedCourse.careers}</p>
            </div>

            <button
              className="cc-primary-btn cc-modal-save"
              onClick={() => toggleSaved(selectedCourse)}
            >
              {savedIds.includes(String(selectedCourse.id))
                ? '♥ Remove from saved'
                : '♡ Save this course'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CourseCard({ course, saved, onOpen, onSave }) {
  return (
    <article className="cc-course-card">
      <div className="cc-course-card-top">
        <span className="cc-course-icon">{course.icon}</span>

        <button
          className={`cc-save-btn ${saved ? 'is-saved' : ''}`}
          onClick={onSave}
          aria-label={saved ? 'Remove saved course' : 'Save course'}
          title={saved ? 'Remove saved course' : 'Save course'}
        >
          {saved ? '♥' : '♡'}
        </button>
      </div>

      <span className="cc-course-category">{course.category}</span>
      <h3>{course.name}</h3>
      <p>{course.description}</p>

      <button className="cc-course-link" onClick={onOpen}>
        View details <span>→</span>
      </button>
    </article>
  )
}
