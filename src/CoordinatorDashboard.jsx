import { useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import './CoordinatorDashboard.css';

function getNowIso() {
  return new Date().toISOString();
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f4f7fb',
    color: '#1e293b',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    background: '#172554',
    color: 'white',
    padding: '18px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  container: { maxWidth: 1400, margin: '0 auto', padding: 24 },
  button: {
    border: 0,
    borderRadius: 7,
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: 11,
    border: '1px solid #cbd5e1',
    borderRadius: 7,
    marginTop: 5,
    marginBottom: 12,
    fontSize: 14,
    background: 'white',
  },
  card: {
    background: 'white',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
    marginBottom: 22,
  },
  tableWrap: {
    overflowX: 'auto',
    background: 'white',
    borderRadius: 10,
  },
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    minWidth: 800,
  },
  cell: {
    textAlign: 'left',
    padding: 12,
    borderBottom: '1px solid #e2e8f0',
    fontSize: 14,
    verticalAlign: 'top',
  },
  label: {
    display: 'block',
    fontSize: 14,
    fontWeight: 600,
  },
  sectionTitle: { marginTop: 28, marginBottom: 14 },
};

const primaryButton = {
  ...styles.button,
  background: '#2563eb',
  color: 'white',
};

const secondaryButton = {
  ...styles.button,
  background: '#e2e8f0',
  color: '#1e293b',
};

const dangerButton = {
  ...styles.button,
  background: '#fee2e2',
  color: '#991b1b',
};

const STREAMS = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Medical' },
  { id: 3, name: 'Commerce' },
  { id: 4, name: 'Science' },
  { id: 5, name: 'Law' },
  { id: 6, name: 'Design' },
];

const DEGREE_LEVELS = [
  'undergraduate',
  'postgraduate',
  'diploma',
  'doctoral',
];

const emptyCollege = {
  name: '',
  city: '',
  state: 'Karnataka',
  address: '',
  website: '',
  institution_type: '',
  description: '',
  established_year: '',
  logo_url: '',
  cover_url: '',
  latitude: '',
  longitude: '',
  nirf_rank: '',
  campus_area_acres: '',
  infrastructure: '',
  hostel_available: false,
  hostel_details: '',
  hostel_fee_annual: '',
  tuition_fee_annual: '',
  other_fee_annual: '',
  avg_package_lpa: '',
  highest_package_lpa: '',
  placement_rate: '',
  top_recruiters: '',
};

const emptyCourse = {
  college_id: '',
  name: '',
  degree_level: 'undergraduate',
  duration_years: '',
  duration: '',
  stream_id: '',
  total_seats: '',
  annual_fee: '',
  total_fee: '',
  course_description: '',
};

function safeText(value) {
  return typeof value === 'string' ? value : '';
}

function messageFromError(error) {
  console.error('CourseCompass database error:', error);

  if (error?.code === '42501') {
    return `Permission denied by Supabase. Check Row-Level Security policies. ${error.message}`;
  }

  if (error?.code === '23505') {
    return `A duplicate record already exists. ${error.message}`;
  }

  if (error?.code === '23503') {
    return `A related record does not exist. ${error.message}`;
  }

  if (error?.code === '23502') {
    return `Required database field "${error.column || 'unknown'}" is missing. ${error.message}`;
  }

  if (error?.code === '22P02') {
    return `An invalid value was supplied to the database. ${error.message}`;
  }

  if (error?.code === '42703' || error?.code === 'PGRST204') {
    return `A database column is missing or unavailable. ${error.message}`;
  }

  return error?.message || 'Something went wrong. Please try again.';
}

function makeSlug(name) {
  return safeText(name)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function nullableNumber(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseDurationYears(value) {
  const text = safeText(value).trim().toLowerCase();

  const match = text.match(
    /^(\d+(?:\.\d+)?)\s*(years?|yrs?|months?|mos?|weeks?|days?)?$/
  );

  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2] || 'years';

  if (!Number.isFinite(amount) || amount <= 0) return null;

  if (unit.startsWith('month') || unit.startsWith('mo')) {
    return amount / 12;
  }

  if (unit.startsWith('week')) return amount / 52;
  if (unit.startsWith('day')) return amount / 365;

  return amount;
}

function splitList(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string') return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function listText(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === 'string')
      .join(', ');
  }

  return typeof value === 'string' ? value : '';
}

function money(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not specified';
  }

  const number = Number(value);

  if (!Number.isFinite(number)) return 'Not specified';

  return number.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  min,
  max,
  step,
}) {
  return (
    <label style={styles.label}>
      {label}
      {required ? ' *' : ''}

      <input
        style={styles.input}
        type={type}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder = '',
  rows = 4,
  required = false,
}) {
  return (
    <label style={styles.label}>
      {label}
      {required ? ' *' : ''}

      <textarea
        style={{
          ...styles.input,
          minHeight: rows * 24,
          resize: 'vertical',
        }}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
      />
    </label>
  );
}

function FormGrid({ children }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '0 16px',
      }}
    >
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}) {
  return (
    <label style={styles.label}>
      {label}
      {required ? ' *' : ''}

      <select
        style={styles.input}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      >
        <option value="">Select {label.toLowerCase()}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CoordinatorDashboard({ user, onLogout }) {
  const [section, setSection] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [colleges, setColleges] = useState([]);
  const [courses, setCourses] = useState([]);
  const [requests, setRequests] = useState([]);

  const [collegeForm, setCollegeForm] = useState({ ...emptyCollege });
  const [courseForm, setCourseForm] = useState({ ...emptyCourse });
  const [courseType, setCourseType] = useState('standalone');

  const [editingCollegeId, setEditingCollegeId] = useState(null);
  const [editingCourseId, setEditingCourseId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [
        profileResult,
        collegeResult,
        courseResult,
        requestResult,
      ] = await Promise.all([
        supabase
          .from('profiles')
          .select('full_name, email, role, approval_status')
          .eq('id', user.id)
          .maybeSingle(),

        supabase
          .from('colleges')
          .select('*')
          .order('created_at', { ascending: false }),

        // Explicitly fetch annual_fee and total_fee.
        supabase
          .from('courses')
          .select('*, colleges(name)')
          .order('created_at', { ascending: false }),

        supabase
          .from('student_requests')
          .select('*, colleges(name)')
          .order('created_at', { ascending: false }),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (collegeResult.error) throw collegeResult.error;
      if (courseResult.error) throw courseResult.error;
      if (requestResult.error) throw requestResult.error;

      const currentProfile = profileResult.data;

      if (!currentProfile) {
        throw new Error('Your profile could not be found.');
      }

      if (!['coordinator', 'admin'].includes(currentProfile.role)) {
        throw new Error('Your account is not authorized for this dashboard.');
      }

      if (currentProfile.approval_status !== 'approved') {
        throw new Error('Your account has not been approved yet.');
      }

      setProfile(currentProfile);
      setColleges(collegeResult.data || []);
      setCourses(courseResult.data || []);
      setRequests(requestResult.data || []);
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    let active = true;

    async function initialize() {
      if (!active) return;
      await loadData();
    }

    initialize();

    return () => {
      active = false;
    };
  }, [loadData]);

  function notify(text) {
    setNotice(text);
    setError('');
  }

  function clearMessages() {
    setNotice('');
    setError('');
  }

  function setCollegeField(field, value) {
    setCollegeForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function setCourseField(field, value) {
    setCourseForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function startNewCollege() {
    setCollegeForm({ ...emptyCollege });
    setEditingCollegeId(null);
    setSection('colleges');
    clearMessages();
  }

  function startNewCourse() {
    setCourseForm({ ...emptyCourse });
    setEditingCourseId(null);
    setCourseType('standalone');
    setSection('courses');
    clearMessages();
  }

  function editCollege(college) {
    setCollegeForm({
      ...emptyCollege,
      name: safeText(college.name),
      city: safeText(college.city),
      state: safeText(college.state) || 'Karnataka',
      address: safeText(college.address),
      website: safeText(college.website),
      institution_type: safeText(college.institution_type),
      description: safeText(college.description),
      established_year: college.established_year ?? '',
      logo_url: safeText(college.logo_url),
      cover_url: safeText(college.cover_url),
      latitude: college.latitude ?? '',
      longitude: college.longitude ?? '',
      nirf_rank: college.nirf_rank ?? '',
      campus_area_acres: college.campus_area_acres ?? '',
      infrastructure: listText(college.infrastructure),
      hostel_available: Boolean(college.hostel_available),
      hostel_details: safeText(college.hostel_details),
      hostel_fee_annual: college.hostel_fee_annual ?? '',
      tuition_fee_annual: college.tuition_fee_annual ?? college.annual_fee ?? '',
      other_fee_annual: college.other_fee_annual ?? '',
      avg_package_lpa: college.avg_package_lpa ?? '',
      highest_package_lpa: college.highest_package_lpa ?? '',
      placement_rate: college.placement_rate ?? '',
      top_recruiters: listText(college.top_recruiters),
    });

    setEditingCollegeId(college.id);
    setSection('colleges');
    clearMessages();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveCollege(event) {
    event.preventDefault();
    clearMessages();

    const collegeName = safeText(collegeForm.name).trim();
    const collegeCity = safeText(collegeForm.city).trim();

    if (!collegeName || !collegeCity) {
      setError('College name and city are required.');
      return;
    }

    const slug = makeSlug(collegeName);

    if (!slug) {
      setError('Please enter a valid college name.');
      return;
    }

    const numericFields = [
      ['Established year', collegeForm.established_year, 1800, 2200],
      ['Latitude', collegeForm.latitude, -90, 90],
      ['Longitude', collegeForm.longitude, -180, 180],
      ['NIRF rank', collegeForm.nirf_rank, 1, 100000],
      ['Campus area', collegeForm.campus_area_acres, 0, 1000000],
      ['Hostel fee', collegeForm.hostel_fee_annual, 0, 100000000],
      ['Annual fee', collegeForm.tuition_fee_annual, 0, 100000000],
      ['Other fees', collegeForm.other_fee_annual, 0, 100000000],
      ['Average package', collegeForm.avg_package_lpa, 0, 1000000],
      ['Highest package', collegeForm.highest_package_lpa, 0, 1000000],
      ['Placement rate', collegeForm.placement_rate, 0, 100],
    ];

    for (const [label, value, min, max] of numericFields) {
      if (value === '' || value === null || value === undefined) continue;

      const number = Number(value);

      if (!Number.isFinite(number) || number < min || number > max) {
        setError(`${label} must be between ${min} and ${max}.`);
        return;
      }
    }

    if (
      collegeForm.avg_package_lpa !== '' &&
      collegeForm.highest_package_lpa !== '' &&
      Number(collegeForm.avg_package_lpa) >
      Number(collegeForm.highest_package_lpa)
    ) {
      setError('Average package cannot exceed the highest package.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: collegeName,
        city: collegeCity,
        state: safeText(collegeForm.state).trim() || 'Karnataka',
        address: safeText(collegeForm.address).trim() || null,
        website: safeText(collegeForm.website).trim() || null,
        institution_type:
          safeText(collegeForm.institution_type).trim() || null,
        description: safeText(collegeForm.description).trim() || null,
        established_year: nullableNumber(collegeForm.established_year),
        logo_url: safeText(collegeForm.logo_url).trim() || null,
        cover_url: safeText(collegeForm.cover_url).trim() || null,
        latitude: nullableNumber(collegeForm.latitude),
        longitude: nullableNumber(collegeForm.longitude),
        nirf_rank: nullableNumber(collegeForm.nirf_rank),
        campus_area_acres: nullableNumber(collegeForm.campus_area_acres),
        infrastructure: splitList(collegeForm.infrastructure),
        hostel_available: Boolean(collegeForm.hostel_available),
        hostel_details: safeText(collegeForm.hostel_details).trim() || null,
        hostel_fee_annual: nullableNumber(collegeForm.hostel_fee_annual),
        tuition_fee_annual: nullableNumber(collegeForm.tuition_fee_annual),
        other_fee_annual: nullableNumber(collegeForm.other_fee_annual),
        avg_package_lpa: nullableNumber(collegeForm.avg_package_lpa),
        highest_package_lpa: nullableNumber(collegeForm.highest_package_lpa),
        placement_rate: nullableNumber(collegeForm.placement_rate),
        top_recruiters: splitList(collegeForm.top_recruiters),
        updated_at: getNowIso(),
      };

      const result = editingCollegeId
        ? await supabase
          .from('colleges')
          .update(payload)
          .eq('id', editingCollegeId)
          .select()
        : await supabase
          .from('colleges')
          .insert({ ...payload, slug, is_published: false })
          .select();

      if (result.error) throw result.error;

      if (!result.data?.length) {
        throw new Error(
          'No college was saved. Check your Supabase INSERT/UPDATE permissions.'
        );
      }

      setCollegeForm({ ...emptyCollege });
      setEditingCollegeId(null);

      notify(
        editingCollegeId
          ? 'College details saved successfully.'
          : 'College added successfully. It is waiting for Admin publication.'
      );

      await loadData();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCollege(college) {
    if (
      !window.confirm(
        `Delete "${college.name}"? This can fail if courses or student requests reference this college.`
      )
    ) {
      return;
    }

    clearMessages();
    setBusyId(college.id);

    try {
      const { error: deleteError } = await supabase
        .from('colleges')
        .delete()
        .eq('id', college.id);

      if (deleteError) throw deleteError;

      notify('College deleted successfully.');
      await loadData();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setBusyId(null);
    }
  }

  function editCourse(course) {
    setCourseType(course.college_id ? 'college' : 'standalone');

    setCourseForm({
      ...emptyCourse,
      college_id: course.college_id ?? '',
      name: safeText(course.name),
      degree_level: safeText(course.degree_level) || 'undergraduate',
      duration_years: course.duration_years ?? '',
      duration:
        safeText(course.duration) ||
        (course.duration_years ? `${course.duration_years} years` : ''),
      stream_id: course.stream_id ?? '',
      total_seats: course.total_seats ?? '',
      annual_fee: course.annual_fee ?? '',
      total_fee: course.total_fee ?? '',
      course_description: safeText(course.course_description),
    });

    setEditingCourseId(course.id);
    setSection('courses');
    clearMessages();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // FIX: Annual and total fees are now saved for BOTH course types.
  async function saveCourse(event) {
    event.preventDefault();
    clearMessages();

    const courseName = safeText(courseForm.name).trim();
    const isStandalone = courseType === 'standalone';

    const selectedCollegeId = isStandalone
      ? null
      : safeText(courseForm.college_id).trim();

    const degreeLevel = isStandalone
      ? 'undergraduate'
      : safeText(courseForm.degree_level).trim();

    const streamId = isStandalone
      ? 1
      : nullableNumber(courseForm.stream_id);

    const durationYears = isStandalone
      ? parseDurationYears(courseForm.duration)
      : nullableNumber(courseForm.duration_years);

    const seats = isStandalone
      ? null
      : nullableNumber(courseForm.total_seats);

    // IMPORTANT: Do not force standalone course fees to null.
    const annualFee = nullableNumber(courseForm.annual_fee);
    const totalFee = nullableNumber(courseForm.total_fee);

    const description = safeText(courseForm.course_description).trim();

    if (!courseName) {
      setError('Enter a course name.');
      return;
    }

    if (!isStandalone && !selectedCollegeId) {
      setError('Please select a college for this college-linked course.');
      return;
    }

    if (
      !isStandalone &&
      !colleges.some(
        (college) => String(college.id) === String(selectedCollegeId)
      )
    ) {
      setError('The selected college could not be found. Please select it again.');
      return;
    }

    if (
      streamId === null ||
      !Number.isInteger(streamId) ||
      !STREAMS.some((stream) => stream.id === streamId)
    ) {
      setError('Please select a valid stream.');
      return;
    }

    if (!DEGREE_LEVELS.includes(degreeLevel)) {
      setError('Please select a valid degree level.');
      return;
    }

    if (
      durationYears === null ||
      !Number.isFinite(durationYears) ||
      durationYears <= 0
    ) {
      setError(
        isStandalone
          ? 'Enter a valid duration, such as 6 months, 2 years, or 4 years.'
          : 'Enter a valid course duration in years, such as 3 or 4.'
      );
      return;
    }

    if (seats !== null && (!Number.isInteger(seats) || seats < 0)) {
      setError('Total seats must be a non-negative whole number.');
      return;
    }

    if (
      [annualFee, totalFee].some(
        (fee) => fee !== null && (!Number.isFinite(fee) || fee < 0)
      )
    ) {
      setError('Course fees cannot be negative.');
      return;
    }

    if (!description) {
      setError('Enter a course description.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        college_id: selectedCollegeId,
        stream_id: streamId,
        name: courseName,
        degree_level: degreeLevel,
        duration_years: durationYears,
        duration:
          safeText(courseForm.duration).trim() ||
          `${durationYears} years`,
        total_seats: seats,
        annual_fee: annualFee,
        total_fee: totalFee,
        course_description: description,
        updated_at: getNowIso(),
      };

      // Save and return the actual stored record.
      const result = editingCourseId
        ? await supabase
          .from('courses')
          .update(payload)
          .eq('id', editingCourseId)
          .select('id, name, college_id, annual_fee, total_fee')
        : await supabase
          .from('courses')
          .insert({
            ...payload,
            is_published: false,
          })
          .select('id, name, college_id, annual_fee, total_fee');

      if (result.error) throw result.error;

      const savedCourse = result.data?.[0];

      if (!savedCourse) {
        throw new Error(
          'No course was saved. Check your Supabase INSERT/UPDATE permissions and RLS policies.'
        );
      }

      // Detect if Supabase did not store the supplied annual fee.
      if (
        annualFee !== null &&
        Number(savedCourse.annual_fee) !== annualFee
      ) {
        console.error('Annual fee mismatch:', {
          submittedAnnualFee: annualFee,
          savedAnnualFee: savedCourse.annual_fee,
          savedCourse,
        });

        throw new Error(
          `The course was saved, but Supabase returned annual_fee as "${savedCourse.annual_fee}". Check the courses table column, database triggers, and RLS policies.`
        );
      }

      setCourseForm({ ...emptyCourse });
      setCourseType('standalone');
      setEditingCourseId(null);

      notify(
        `Course ${editingCourseId ? 'updated' : 'added'} successfully. Annual fee saved: ${money(savedCourse.annual_fee)}.`
      );

      await loadData();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggleCoursePublished(course) {
    // Only standalone courses (no college_id) appear in the student course list.
    // College-linked courses are surfaced via the College Finder instead.
    if (course.college_id) {
      setError('College-linked courses are published via the admin panel together with their college. Only standalone courses can be toggled here.');
      return;
    }

    const nextPublished = !course.is_published;

    clearMessages();
    setBusyId(course.id);

    try {
      const { error: updateError } = await supabase
        .from('courses')
        .update({ is_published: nextPublished, updated_at: getNowIso() })
        .eq('id', course.id);

      if (updateError) throw updateError;

      notify(
        nextPublished
          ? `"${course.name}" is now published and visible to students.`
          : `"${course.name}" has been unpublished and is no longer visible to students.`
      );

      await loadData();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCourse(course) {
    if (!window.confirm(`Delete course "${course.name}"?`)) return;

    clearMessages();
    setBusyId(course.id);

    try {
      const { error: deleteError } = await supabase
        .from('courses')
        .delete()
        .eq('id', course.id);

      if (deleteError) throw deleteError;

      notify('Course deleted successfully.');
      await loadData();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleUpdateRequestStatus(request, status) {
    clearMessages();
    setBusyId(request.id);

    try {
      const { error: updateError } = await supabase
        .from('student_requests')
        .update({
          status,
          assigned_to: user.id,
          updated_at: getNowIso(),
        })
        .eq('id', request.id);

      if (updateError) throw updateError;

      notify(`Request marked as ${status}.`);
      await loadData();
    } catch (err) {
      setError(messageFromError(err));
    } finally {
      setBusyId(null);
    }
  }

  const searchTerm = safeText(search).toLowerCase();

  const filteredColleges = colleges.filter((college) =>
    `${college.name || ''} ${college.city || ''} ${college.state || ''}`
      .toLowerCase()
      .includes(searchTerm)
  );

  const filteredCourses = courses.filter((course) =>
    `${course.name || ''} ${course.degree_level || ''} ${course.colleges?.name || 'standalone course'
      }`
      .toLowerCase()
      .includes(searchTerm)
  );

  const filteredRequests = requests.filter((request) =>
    `${request.student_name || ''} ${request.student_email || ''} ${request.course_name || ''
      } ${request.colleges?.name || ''}`
      .toLowerCase()
      .includes(searchTerm)
  );

  const pendingRequests = requests.filter(
    (request) => (request.status || 'pending') === 'pending'
  ).length;

  const menuItems = [
    ['overview', '📊 Overview'],
    ['colleges', '🏫 Manage Colleges'],
    ['courses', '📚 Manage Courses'],
    ['requests', '👨‍🎓 Student Requests'],
    ['profile', '👤 My Profile'],
  ];

  if (loading) {
    return <div style={{ padding: 40 }}>Loading Coordinator Dashboard...</div>;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <h2 style={{ margin: 0 }}>CourseCompass</h2>
          <small>Coordinator Control Panel</small>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>{profile?.full_name || user.email || 'Coordinator'}</span>

          <button
            type="button"
            style={{
              ...styles.button,
              background: '#dc2626',
              color: 'white',
            }}
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={styles.container}>
        <h1 style={{ marginBottom: 6 }}>Coordinator Dashboard</h1>

        <p style={{ color: '#64748b', marginTop: 0 }}>
          Coordinator Workspace — manage college profiles, courses, fees,
          facilities, placements and student enquiries.
        </p>

        <nav
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            margin: '22px 0',
          }}
        >
          {menuItems.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSection(id);
                setSearch('');
                clearMessages();
              }}
              style={{
                ...styles.button,
                background: section === id ? '#1d4ed8' : 'white',
                color: section === id ? 'white' : '#334155',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {error && (
          <div
            role="alert"
            style={{
              padding: 14,
              marginBottom: 16,
              background: '#fee2e2',
              color: '#991b1b',
              borderRadius: 8,
              overflowWrap: 'anywhere',
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {notice && (
          <div
            role="status"
            style={{
              padding: 14,
              marginBottom: 16,
              background: '#dcfce7',
              color: '#166534',
              borderRadius: 8,
            }}
          >
            {notice}
          </div>
        )}

        {section === 'overview' && (
          <>
            <FormGrid>
              {[
                ['Total Colleges', colleges.length, '🏫'],
                ['Total Courses', courses.length, '📚'],
                ['Student Requests', requests.length, '👨‍🎓'],
                ['Pending Requests', pendingRequests, '⏳'],
                [
                  'Unpublished Colleges',
                  colleges.filter((college) => !college.is_published).length,
                  '📝',
                ],
                [
                  'Unpublished Courses',
                  courses.filter((course) => !course.is_published).length,
                  '📄',
                ],
              ].map(([label, value, icon]) => (
                <div key={label} style={styles.card}>
                  <div style={{ fontSize: 30 }}>{icon}</div>
                  <p style={{ color: '#64748b', marginBottom: 6 }}>{label}</p>
                  <h2 style={{ margin: 0, fontSize: 32 }}>{value}</h2>
                </div>
              ))}
            </FormGrid>

            <div style={styles.card}>
              <h2>Quick Actions</h2>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <button
                  type="button"
                  style={primaryButton}
                  onClick={startNewCollege}
                >
                  + Add College
                </button>

                <button
                  type="button"
                  style={primaryButton}
                  onClick={startNewCourse}
                >
                  + Add Course
                </button>

                <button
                  type="button"
                  style={secondaryButton}
                  onClick={() => setSection('requests')}
                >
                  View Student Requests
                </button>

                <button
                  type="button"
                  style={secondaryButton}
                  onClick={loadData}
                >
                  Refresh Data
                </button>
              </div>
            </div>

            <div style={styles.card}>
              <h2>Recent Student Requests</h2>

              {requests.length === 0 ? (
                <p>No student requests have been submitted yet.</p>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['Student', 'College', 'Course', 'Status'].map((x) => (
                          <th key={x} style={styles.cell}>
                            {x}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {requests.slice(0, 5).map((request) => (
                        <tr key={request.id}>
                          <td style={styles.cell}>
                            {request.student_name || 'Unknown'}
                          </td>
                          <td style={styles.cell}>
                            {request.colleges?.name || 'Not specified'}
                          </td>
                          <td style={styles.cell}>
                            {request.course_name || 'Not specified'}
                          </td>
                          <td style={styles.cell}>
                            {request.status || 'pending'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {section === 'colleges' && (
          <>
            <div style={styles.card}>
              <h2>
                {editingCollegeId ? 'Edit Complete College Profile' : 'Add College'}
              </h2>

              <p style={{ color: '#64748b' }}>
                Enter fees in INR. Separate infrastructure and recruiter names
                with commas. Editing details does not change publication status.
              </p>

              <form onSubmit={saveCollege}>
                <h3>Basic Information</h3>

                <FormGrid>
                  <Field label="College name" value={collegeForm.name} onChange={(v) => setCollegeField('name', v)} required />
                  <Field label="City" value={collegeForm.city} onChange={(v) => setCollegeField('city', v)} required />
                  <Field label="State" value={collegeForm.state} onChange={(v) => setCollegeField('state', v)} />
                  <Field label="Institution type" value={collegeForm.institution_type} onChange={(v) => setCollegeField('institution_type', v)} />
                  <Field label="Established year" type="number" min="1800" max="2200" value={collegeForm.established_year} onChange={(v) => setCollegeField('established_year', v)} />
                  <Field label="NIRF rank" type="number" min="1" value={collegeForm.nirf_rank} onChange={(v) => setCollegeField('nirf_rank', v)} />
                  <Field label="Website URL" type="url" value={collegeForm.website} onChange={(v) => setCollegeField('website', v)} placeholder="https://example.edu" />
                  <Field label="College logo URL" type="url" value={collegeForm.logo_url} onChange={(v) => setCollegeField('logo_url', v)} />
                  <Field label="Cover image URL" type="url" value={collegeForm.cover_url} onChange={(v) => setCollegeField('cover_url', v)} />
                  <Field label="Latitude" type="number" min="-90" max="90" step="any" value={collegeForm.latitude} onChange={(v) => setCollegeField('latitude', v)} />
                  <Field label="Longitude" type="number" min="-180" max="180" step="any" value={collegeForm.longitude} onChange={(v) => setCollegeField('longitude', v)} />
                  <Field label="Campus area (acres)" type="number" min="0" step="any" value={collegeForm.campus_area_acres} onChange={(v) => setCollegeField('campus_area_acres', v)} />
                </FormGrid>

                <TextArea label="Full address" value={collegeForm.address} onChange={(v) => setCollegeField('address', v)} />
                <TextArea label="College description" value={collegeForm.description} onChange={(v) => setCollegeField('description', v)} rows={5} />

                <h3>Fees (INR)</h3>

                <FormGrid>
                  <Field label="Annual fee (₹)" type="number" min="0" step="any" value={collegeForm.tuition_fee_annual} onChange={(v) => setCollegeField('tuition_fee_annual', v)} placeholder="e.g. 75000" />
                  <Field label="Other annual fees (₹)" type="number" min="0" step="any" value={collegeForm.other_fee_annual} onChange={(v) => setCollegeField('other_fee_annual', v)} placeholder="e.g. 15000" />
                </FormGrid>

                <h3>Hostel Facilities</h3>

                <label style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '12px 0' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(collegeForm.hostel_available)}
                    onChange={(event) => setCollegeField('hostel_available', event.target.checked)}
                  />
                  Hostel available
                </label>

                <FormGrid>
                  <Field label="Annual hostel fee (₹)" type="number" min="0" step="any" value={collegeForm.hostel_fee_annual} onChange={(v) => setCollegeField('hostel_fee_annual', v)} />
                </FormGrid>

                <TextArea label="Hostel details" value={collegeForm.hostel_details} onChange={(v) => setCollegeField('hostel_details', v)} />
                <TextArea label="Infrastructure (comma-separated)" value={collegeForm.infrastructure} onChange={(v) => setCollegeField('infrastructure', v)} placeholder="Library, laboratories, sports, transport, Wi-Fi" />

                <h3>Placement Details</h3>

                <FormGrid>
                  <Field label="Average package (LPA)" type="number" min="0" step="any" value={collegeForm.avg_package_lpa} onChange={(v) => setCollegeField('avg_package_lpa', v)} />
                  <Field label="Highest package (LPA)" type="number" min="0" step="any" value={collegeForm.highest_package_lpa} onChange={(v) => setCollegeField('highest_package_lpa', v)} />
                  <Field label="Placement rate (%)" type="number" min="0" max="100" step="any" value={collegeForm.placement_rate} onChange={(v) => setCollegeField('placement_rate', v)} />
                </FormGrid>

                <TextArea label="Top recruiters (comma-separated)" value={collegeForm.top_recruiters} onChange={(v) => setCollegeField('top_recruiters', v)} placeholder="Company A, Company B, Company C" />

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                  <button style={primaryButton} type="submit" disabled={saving}>
                    {saving ? 'Saving...' : editingCollegeId ? 'Save College Changes' : 'Add College'}
                  </button>

                  {editingCollegeId && (
                    <button
                      type="button"
                      style={secondaryButton}
                      disabled={saving}
                      onClick={() => {
                        setCollegeForm({ ...emptyCollege });
                        setEditingCollegeId(null);
                        clearMessages();
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            <h2 style={styles.sectionTitle}>College Directory</h2>

            <input
              style={styles.input}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search college, city or state..."
            />

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['College', 'Location', 'Fees', 'Hostel', 'Placement', 'Status', 'Actions'].map((label) => (
                      <th key={label} style={styles.cell}>{label}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredColleges.map((college) => (
                    <tr key={college.id}>
                      <td style={styles.cell}>
                        <strong>{college.name || 'Unnamed college'}</strong>
                        <br />
                        <small>{college.institution_type || 'Type not specified'}</small>
                      </td>

                      <td style={styles.cell}>
                        {[college.city, college.state].filter(Boolean).join(', ')}
                      </td>

                      <td style={styles.cell}>
                        Annual fee: {money(college.tuition_fee_annual ?? college.annual_fee)}
                        <br />
                        Other: {money(college.other_fee_annual)}
                      </td>

                      <td style={styles.cell}>
                        {college.hostel_available ? 'Available' : 'Not listed'}
                        <br />
                        {money(college.hostel_fee_annual)}
                      </td>

                      <td style={styles.cell}>
                        Average: {college.avg_package_lpa ?? '—'} LPA
                        <br />
                        Highest: {college.highest_package_lpa ?? '—'} LPA
                      </td>

                      <td style={styles.cell}>
                        {college.is_published ? 'Published' : 'Awaiting Admin publication'}
                      </td>

                      <td style={styles.cell}>
                        <button type="button" style={secondaryButton} onClick={() => editCollege(college)}>
                          Edit
                        </button>{' '}
                        <button
                          type="button"
                          style={dangerButton}
                          disabled={busyId === college.id}
                          onClick={() => deleteCollege(college)}
                        >
                          {busyId === college.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!filteredColleges.length && (
                    <tr>
                      <td style={styles.cell} colSpan={7}>No colleges found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {section === 'courses' && (
          <>
            <div style={styles.card}>
              <h2>{editingCourseId ? 'Edit Course' : 'Add Course'}</h2>

              <p style={{ color: '#64748b' }}>
                Standalone courses can now have annual and total fees too.
                New courses remain unpublished until Admin approval.
              </p>

              <form onSubmit={saveCourse}>
                <label style={styles.label}>
                  Course Type *

                  <select
                    style={styles.input}
                    value={courseType}
                    onChange={(event) => {
                      const nextType = event.target.value;

                      setCourseType(nextType);

                      // Preserve name, fees and description when switching type.
                      setCourseForm((previous) => ({
                        ...previous,
                        college_id: '',
                        degree_level: 'undergraduate',
                        stream_id: nextType === 'standalone' ? '1' : '',
                        duration_years: '',
                        duration: '',
                        total_seats: '',
                      }));

                      clearMessages();
                    }}
                  >
                    <option value="standalone">Standalone Course</option>
                    <option value="college">College-Linked Course</option>
                  </select>
                </label>

                {courseType === 'college' && (
                  <SelectField
                    label="Select College"
                    value={courseForm.college_id}
                    onChange={(value) => setCourseField('college_id', value)}
                    required
                    options={colleges.map((college) => ({
                      value: String(college.id),
                      label: `${college.name}${college.city ? ` — ${college.city}` : ''}`,
                    }))}
                  />
                )}

                {courseType === 'standalone' ? (
                  <>
                    <h3>Standalone Course Details</h3>

                    <Field
                      label="Course name"
                      value={courseForm.name}
                      onChange={(value) => setCourseField('name', value)}
                      required
                      placeholder="e.g. Introduction to Programming"
                    />

                    <Field
                      label="Duration"
                      value={courseForm.duration}
                      onChange={(value) => setCourseField('duration', value)}
                      required
                      placeholder="e.g. 6 months or 2 years"
                    />

                    <h3>Course Fees (INR)</h3>

                    <FormGrid>
                      <Field
                        label="Annual fee (₹)"
                        type="number"
                        min="0"
                        step="any"
                        value={courseForm.annual_fee}
                        onChange={(value) => setCourseField('annual_fee', value)}
                        placeholder="e.g. 25000"
                      />

                      <Field
                        label="Total course fee (₹)"
                        type="number"
                        min="0"
                        step="any"
                        value={courseForm.total_fee}
                        onChange={(value) => setCourseField('total_fee', value)}
                        placeholder="e.g. 50000"
                      />
                    </FormGrid>

                    <TextArea
                      label="Course description"
                      value={courseForm.course_description}
                      onChange={(value) => setCourseField('course_description', value)}
                      placeholder="Describe the course and what students will learn."
                      rows={5}
                      required
                    />
                  </>
                ) : (
                  <>
                    <h3>College-Linked Course Details</h3>

                    <FormGrid>
                      <Field
                        label="Course name"
                        value={courseForm.name}
                        onChange={(value) => setCourseField('name', value)}
                        required
                        placeholder="e.g. Computer Science and Engineering"
                      />

                      <SelectField
                        label="Stream"
                        value={courseForm.stream_id}
                        onChange={(value) => setCourseField('stream_id', value)}
                        required
                        options={STREAMS.map((stream) => ({
                          value: String(stream.id),
                          label: stream.name,
                        }))}
                      />

                      <SelectField
                        label="Degree level"
                        value={courseForm.degree_level}
                        onChange={(value) => setCourseField('degree_level', value)}
                        required
                        options={DEGREE_LEVELS.map((level) => ({
                          value: level,
                          label: level.charAt(0).toUpperCase() + level.slice(1),
                        }))}
                      />

                      <Field
                        label="Duration (years)"
                        type="number"
                        min="0.01"
                        step="any"
                        value={courseForm.duration_years}
                        onChange={(value) => {
                          setCourseForm((previous) => ({
                            ...previous,
                            duration_years: value,
                            duration: value ? `${value} years` : '',
                          }));
                        }}
                        required
                        placeholder="e.g. 3 or 4"
                      />

                      <Field
                        label="Duration display (optional)"
                        value={courseForm.duration}
                        onChange={(value) => setCourseField('duration', value)}
                        placeholder="e.g. 4 years"
                      />

                      <Field
                        label="Total seats"
                        type="number"
                        min="0"
                        step="1"
                        value={courseForm.total_seats}
                        onChange={(value) => setCourseField('total_seats', value)}
                      />

                      <Field
                        label="Annual fee (₹)"
                        type="number"
                        min="0"
                        step="any"
                        value={courseForm.annual_fee}
                        onChange={(value) => setCourseField('annual_fee', value)}
                      />

                      <Field
                        label="Total course fee (₹)"
                        type="number"
                        min="0"
                        step="any"
                        value={courseForm.total_fee}
                        onChange={(value) => setCourseField('total_fee', value)}
                      />
                    </FormGrid>

                    <TextArea
                      label="Course description"
                      value={courseForm.course_description}
                      onChange={(value) => setCourseField('course_description', value)}
                      placeholder="Describe the course and what students will learn."
                      rows={5}
                      required
                    />
                  </>
                )}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button style={primaryButton} type="submit" disabled={saving}>
                    {saving ? 'Saving...' : editingCourseId ? 'Save Course Changes' : 'Add Course'}
                  </button>

                  {editingCourseId && (
                    <button
                      style={secondaryButton}
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setCourseForm({ ...emptyCourse });
                        setCourseType('standalone');
                        setEditingCourseId(null);
                        clearMessages();
                      }}
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>
            </div>

            <h2 style={styles.sectionTitle}>Course Directory</h2>

            <input
              style={styles.input}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search course or college..."
            />

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Course', 'College', 'Stream', 'Duration', 'Seats', 'Annual fee', 'Total fee', 'Status', 'Actions'].map((label) => (
                      <th key={label} style={styles.cell}>{label}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredCourses.map((course) => (
                    <tr key={course.id}>
                      <td style={styles.cell}>
                        <strong>{course.name}</strong>
                        <br />
                        <small>{course.degree_level || 'Degree not specified'}</small>
                        {course.course_description && <p>{course.course_description}</p>}
                      </td>

                      <td style={styles.cell}>
                        {course.colleges?.name || 'Standalone course'}
                      </td>

                      <td style={styles.cell}>
                        {STREAMS.find((stream) => stream.id === Number(course.stream_id))?.name || 'Unknown'}
                      </td>

                      <td style={styles.cell}>
                        {course.duration || (course.duration_years ? `${course.duration_years} years` : '—')}
                      </td>

                      <td style={styles.cell}>{course.total_seats ?? '—'}</td>

                      <td style={styles.cell}>{money(course.annual_fee)}</td>

                      <td style={styles.cell}>{money(course.total_fee)}</td>

                      <td style={styles.cell}>
                        {course.is_published ? 'Published' : 'Awaiting publication'}
                      </td>

                      <td style={styles.cell}>
                        <button type="button" style={secondaryButton} onClick={() => editCourse(course)}>
                          Edit
                        </button>{' '}
                        {!course.college_id && (
                          <button
                            type="button"
                            style={{
                              ...styles.button,
                              background: course.is_published ? '#fef9c3' : '#dcfce7',
                              color: course.is_published ? '#854d0e' : '#166534',
                              marginRight: 6,
                            }}
                            disabled={busyId === course.id}
                            onClick={() => toggleCoursePublished(course)}
                          >
                            {busyId === course.id
                              ? 'Saving…'
                              : course.is_published
                                ? 'Unpublish'
                                : 'Publish'}
                          </button>
                        )}
                        <button
                          type="button"
                          style={dangerButton}
                          disabled={busyId === course.id}
                          onClick={() => deleteCourse(course)}
                        >
                          {busyId === course.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  ))}

                  {!filteredCourses.length && (
                    <tr>
                      <td style={styles.cell} colSpan={9}>No courses found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {section === 'requests' && (
          <>
            <h2>Student Enquiries</h2>

            <p style={{ color: '#64748b' }}>
              Review enquiries and update their follow-up status.
            </p>

            <input
              style={styles.input}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, email, college or course..."
            />

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {['Student', 'Contact', 'College / Course', 'Message', 'Status', 'Update'].map((label) => (
                      <th key={label} style={styles.cell}>{label}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map((request) => (
                    <tr key={request.id}>
                      <td style={styles.cell}>{request.student_name || 'Unknown'}</td>

                      <td style={styles.cell}>
                        {request.student_email || 'No email'}
                        <br />
                        {request.phone || 'No phone'}
                      </td>

                      <td style={styles.cell}>
                        {request.colleges?.name || 'Not specified'}
                        <br />
                        {request.course_name || 'Not specified'}
                      </td>

                      <td style={styles.cell}>{request.message || 'No message'}</td>

                      <td style={styles.cell}>{request.status || 'pending'}</td>

                      <td style={styles.cell}>
                        <select
                          style={styles.input}
                          value={request.status || 'pending'}
                          disabled={busyId === request.id}
                          onChange={(event) => handleUpdateRequestStatus(request, event.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="contacted">Contacted</option>
                          <option value="resolved">Resolved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                    </tr>
                  ))}

                  {!filteredRequests.length && (
                    <tr>
                      <td style={styles.cell} colSpan={6}>No student enquiries are available.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {section === 'profile' && (
          <div style={{ ...styles.card, maxWidth: 700 }}>
            <h2>Coordinator Profile</h2>

            <p><strong>Name:</strong> {profile?.full_name || 'Not provided'}</p>
            <p><strong>Email:</strong> {profile?.email || user.email || 'Not available'}</p>
            <p><strong>Role:</strong> {profile?.role || 'coordinator'}</p>
            <p><strong>Approval:</strong> {profile?.approval_status || 'Unknown'}</p>
            <p><strong>User ID:</strong> {user.id}</p>

            <button type="button" style={secondaryButton} onClick={loadData}>
              Refresh Data
            </button>
          </div>
        )}

        <footer
          style={{
            textAlign: 'center',
            color: '#64748b',
            padding: '30px 0 10px',
            fontSize: 13,
          }}
        >
          CourseCompass · Coordinator Portal
        </footer>
      </main>
    </div>
  );
}