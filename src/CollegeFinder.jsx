import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import './CollegeFinder.css'

const EMPTY_FILTERS = {
  search: '',
  city: 'All cities',
  collegeType: 'All types',
  branch: 'All branches',
  sort: 'name',
}

function asText(value) {
  return value == null ? '' : String(value)
}

function formatMoney(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return 'Not provided'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatLpa(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? `₹${amount.toFixed(1)} LPA` : 'Not provided'
}

function getPrograms(college) {
  const value = college.college_programs
  if (Array.isArray(value)) return value
  return value ? [value] : []
}

export default function CollegeFinder() {
  const [colleges, setColleges] = useState([])
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedCollege, setSelectedCollege] = useState(null)

  useEffect(() => {
    let active = true

    async function loadColleges() {
      setLoading(true)
      setLoadError('')

      const { data, error } = await supabase
        .from('colleges')
        .select('*, college_programs(*)')
        .order('name', { ascending: true })
        .limit(500)

      if (!active) return

      if (error) {
        console.error('Unable to load colleges:', error)
        setLoadError(
          error.code === '42P01' || error.code === 'PGRST205'
            ? 'The college database is not set up yet. Run the supplied Supabase SQL setup, then refresh this page.'
            : 'Colleges could not be loaded. Check your Supabase connection and table permissions, then try again.',
        )
        setColleges([])
      } else {
        setColleges(data ?? [])
      }

      setLoading(false)
    }

    loadColleges()
    return () => {
      active = false
    }
  }, [])

  const cities = useMemo(() => {
    const values = colleges.map((college) => asText(college.city).trim()).filter(Boolean)
    return ['All cities', ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))]
  }, [colleges])

  const collegeTypes = useMemo(() => {
    const values = colleges.map((college) => asText(college.college_type).trim()).filter(Boolean)
    return ['All types', ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))]
  }, [colleges])

  const branches = useMemo(() => {
    const values = colleges.flatMap((college) =>
      getPrograms(college).map((program) => asText(program.branch).trim()),
    ).filter(Boolean)
    return ['All branches', ...Array.from(new Set(values)).sort((a, b) => a.localeCompare(b))]
  }, [colleges])

  const filteredColleges = useMemo(() => {
    const query = filters.search.trim().toLowerCase()

    const results = colleges.filter((college) => {
      const programs = getPrograms(college)
      const searchable = [
        college.name,
        college.city,
        college.state,
        college.college_type,
        college.description,
        college.accreditation,
        ...programs.flatMap((program) => [program.branch, program.exam, program.category]),
      ].map(asText).join(' ').toLowerCase()

      const matchesSearch = !query || searchable.includes(query)
      const matchesCity = filters.city === 'All cities' || college.city === filters.city
      const matchesType = filters.collegeType === 'All types' || college.college_type === filters.collegeType
      const matchesBranch = filters.branch === 'All branches' || programs.some((program) => program.branch === filters.branch)

      return matchesSearch && matchesCity && matchesType && matchesBranch
    })

    if (filters.sort === 'city') {
      return [...results].sort((a, b) => asText(a.city).localeCompare(asText(b.city)) || asText(a.name).localeCompare(asText(b.name)))
    }
    if (filters.sort === 'fee') {
      return [...results].sort((a, b) => {
        const aFee = Number(a.annual_fee_min ?? Infinity)
        const bFee = Number(b.annual_fee_min ?? Infinity)
        return aFee - bFee
      })
    }
    return [...results].sort((a, b) => asText(a.name).localeCompare(asText(b.name)))
  }, [colleges, filters])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS)
  }

  return (
    <section className="ccf-page" aria-labelledby="ccf-title">
      <div className="ccf-hero">
        <div className="ccf-hero-copy">
          <span className="ccf-eyebrow">MAKE YOUR NEXT MOVE</span>
          <h1 id="ccf-title">Find your college</h1>
          <p>Explore colleges, compare available branches, and review admission details in one place.</p>
        </div>
        <div className="ccf-hero-icon" aria-hidden="true">🏛️</div>
      </div>

      <div className="ccf-summary-row">
        <div className="ccf-summary-card"><span className="ccf-summary-icon">🏫</span><div><strong>{loading ? '—' : colleges.length}</strong><span>Colleges listed</span></div></div>
        <div className="ccf-summary-card"><span className="ccf-summary-icon">📍</span><div><strong>{loading ? '—' : Math.max(0, cities.length - 1)}</strong><span>Cities covered</span></div></div>
        <div className="ccf-summary-card"><span className="ccf-summary-icon">🎓</span><div><strong>{loading ? '—' : Math.max(0, branches.length - 1)}</strong><span>Branch options</span></div></div>
      </div>

      <div className="ccf-filter-panel">
        <label className="ccf-search">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Search college, city, or branch..."
            aria-label="Search colleges"
          />
        </label>
        <div className="ccf-filter-controls">
          <label><span>City</span><select value={filters.city} onChange={(event) => updateFilter('city', event.target.value)}>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
          <label><span>College type</span><select value={filters.collegeType} onChange={(event) => updateFilter('collegeType', event.target.value)}>{collegeTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
          <label><span>Branch</span><select value={filters.branch} onChange={(event) => updateFilter('branch', event.target.value)}>{branches.map((branch) => <option key={branch}>{branch}</option>)}</select></label>
          <label><span>Sort by</span><select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="name">College name</option><option value="city">City</option><option value="fee">Lowest listed fee</option></select></label>
        </div>
        <div className="ccf-filter-footer"><span>{loading ? 'Loading colleges…' : `Showing ${filteredColleges.length} of ${colleges.length} colleges`}</span><button type="button" onClick={clearFilters}>Clear filters</button></div>
      </div>

      {loadError && <div className="ccf-alert" role="alert"><strong>College data unavailable</strong><p>{loadError}</p></div>}

      {loading ? (
        <div className="ccf-state"><span className="ccf-spinner" /><p>Loading colleges…</p></div>
      ) : !loadError && filteredColleges.length === 0 ? (
        <div className="ccf-state ccf-empty"><span>🔎</span><h2>No colleges found</h2><p>{colleges.length === 0 ? 'Your database is connected, but there are no college records yet. Add colleges in Supabase to populate this page.' : 'Try changing your search or filters.'}</p>{(filters.search || filters.city !== 'All cities' || filters.collegeType !== 'All types' || filters.branch !== 'All branches') && <button type="button" onClick={clearFilters}>Clear all filters</button>}</div>
      ) : (
        <div className="ccf-college-grid">
          {filteredColleges.map((college) => {
            const programs = getPrograms(college)
            const visibleBranches = programs.map((program) => program.branch).filter(Boolean)
            return (
              <article className="ccf-college-card" key={college.id}>
                <div className="ccf-card-top"><span className="ccf-college-emblem">🏛️</span><span className="ccf-type-pill">{college.college_type || 'College'}</span></div>
                <h2>{college.name}</h2>
                <p className="ccf-location">📍 {[college.city, college.state].filter(Boolean).join(', ') || 'Location not provided'}</p>
                <p className="ccf-description">{college.description || 'Explore this institution and review its available programmes and admission details.'}</p>
                <div className="ccf-branch-list"><span className="ccf-meta-label">Available branches</span><div>{visibleBranches.length ? visibleBranches.slice(0, 3).map((branch) => <span className="ccf-branch-chip" key={branch}>{branch}</span>) : <span className="ccf-muted">Not provided yet</span>}{visibleBranches.length > 3 && <span className="ccf-branch-chip">+{visibleBranches.length - 3} more</span>}</div></div>
                <div className="ccf-card-stats"><div><span>Annual fee from</span><strong>{formatMoney(college.annual_fee_min)}</strong></div><div><span>Avg. placement</span><strong>{formatLpa(college.placement_average_lpa)}</strong></div></div>
                <button className="ccf-details-button" type="button" onClick={() => setSelectedCollege(college)}>View college details <span>→</span></button>
              </article>
            )
          })}
        </div>
      )}

      {selectedCollege && (
        <div className="ccf-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedCollege(null) }}>
          <section className="ccf-modal" role="dialog" aria-modal="true" aria-labelledby="ccf-modal-title">
            <button className="ccf-modal-close" type="button" onClick={() => setSelectedCollege(null)} aria-label="Close college details">×</button>
            <span className="ccf-eyebrow">COLLEGE DETAILS</span>
            <h2 id="ccf-modal-title">{selectedCollege.name}</h2>
            <p className="ccf-location">📍 {[selectedCollege.city, selectedCollege.state].filter(Boolean).join(', ') || 'Location not provided'}</p>
            {selectedCollege.description && <p>{selectedCollege.description}</p>}
            <div className="ccf-detail-grid">
              <div><span>College type</span><strong>{selectedCollege.college_type || 'Not provided'}</strong></div>
              <div><span>Established</span><strong>{selectedCollege.established_year || 'Not provided'}</strong></div>
              <div><span>Accreditation</span><strong>{selectedCollege.accreditation || 'Not provided'}</strong></div>
              <div><span>Annual fee range</span><strong>{formatMoney(selectedCollege.annual_fee_min)} – {formatMoney(selectedCollege.annual_fee_max)}</strong></div>
              <div><span>Average placement</span><strong>{formatLpa(selectedCollege.placement_average_lpa)}</strong></div>
              <div><span>Highest placement</span><strong>{formatLpa(selectedCollege.placement_highest_lpa)}</strong></div>
            </div>
            <h3>Programmes and admission details</h3>
            {getPrograms(selectedCollege).length ? <div className="ccf-program-list">{getPrograms(selectedCollege).map((program) => <div className="ccf-program-row" key={program.id || `${program.branch}-${program.exam}-${program.category}`}><strong>{program.branch || 'Branch not specified'}</strong><span>{[program.exam, program.category, program.cutoff_year ? `Cutoff year: ${program.cutoff_year}` : ''].filter(Boolean).join(' · ') || 'Admission details not provided'}</span><span>Annual fee: {formatMoney(program.annual_fee)}</span><span>Cutoff rank: {program.cutoff_rank ?? 'Not provided'}</span></div>)}</div> : <p className="ccf-muted">Programme details have not been added yet.</p>}
            {selectedCollege.website_url && <a className="ccf-website-link" href={selectedCollege.website_url} target="_blank" rel="noreferrer">Visit official website ↗</a>}
          </section>
        </div>
      )}
    </section>
  )
}
