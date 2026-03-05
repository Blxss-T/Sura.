import { useState, useCallback } from 'react';
import api from '../api';

const RELATIONSHIP_OPTIONS = [
  { value: 'MOTHER', label: 'Mother' },
  { value: 'FATHER', label: 'Father' },
  { value: 'GUARDIAN', label: 'Guardian' },
  { value: 'UNCLE', label: 'Uncle' },
  { value: 'AUNT', label: 'Aunt' },
  { value: 'OTHER', label: 'Other' },
];

export default function Reception() {
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showAddVisitor, setShowAddVisitor] = useState(false);
  const [newVisitor, setNewVisitor] = useState({ full_name: '', national_id: '', phone: '' });
  const [linkRelationship, setLinkRelationship] = useState('OTHER');
  const [checkingOutId, setCheckingOutId] = useState(null);
  const [checkedInToday, setCheckedInToday] = useState([]);

  const loadCheckedInToday = useCallback(async (studentId) => {
    if (!studentId) return;
    try {
      const { data } = await api.get('visit-records/', { params: { student: studentId } });
      const list = data.results || data;
      setCheckedInToday(list.filter((r) => !r.check_out_time));
    } catch {
      setCheckedInToday([]);
    }
  }, []);

  const searchStudents = useCallback(async () => {
    if (!search.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const { data } = await api.get('students/', { params: { search: search.trim() } });
      setStudents(data.results || data);
      setSelectedStudent(null);
      setVisitors([]);
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const loadVisitors = useCallback(async (studentId) => {
    try {
      const { data } = await api.get(`students/${studentId}/visitors/`);
      setVisitors(data);
    } catch {
      setVisitors([]);
    }
  }, []);

  const selectStudent = (student) => {
    setSelectedStudent(student);
    loadVisitors(student.id);
    loadCheckedInToday(student.id);
    setShowAddVisitor(false);
  };

  const handleCheckIn = async (visitorId, relationshipType) => {
    if (!selectedStudent) return;
    setMessage('');
    try {
      await api.post('visit-records/', {
        student: selectedStudent.id,
        visitor: visitorId,
        relationship_type: relationshipType,
      });
      setMessage('Checked in successfully.');
    } catch (e) {
      setMessage(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Check-in failed');
    }
  };

  const handleAddVisitor = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !newVisitor.full_name.trim()) return;
    setMessage('');
    try {
      const { data: visitor } = await api.post('visitors/', {
        full_name: newVisitor.full_name.trim(),
        national_id: newVisitor.national_id || undefined,
        phone: newVisitor.phone || undefined,
      });
      await api.post('student-visitor-relationships/', {
        student: selectedStudent.id,
        visitor_id: visitor.id,
        relationship_type: linkRelationship,
      });
      setNewVisitor({ full_name: '', national_id: '', phone: '' });
      setShowAddVisitor(false);
      loadVisitors(selectedStudent.id);
      setMessage('Visitor added and linked. You can check them in.');
    } catch (e) {
      setMessage(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Failed to add visitor');
    }
  };

  const handleCheckOut = async (recordId) => {
    setCheckingOutId(recordId);
    try {
      await api.patch(`visit-records/${recordId}/check_out/`);
      setMessage('Checked out.');
      if (selectedStudent) {
        loadVisitors(selectedStudent.id);
        loadCheckedInToday(selectedStudent.id);
      }
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Check-out failed');
    } finally {
      setCheckingOutId(null);
    }
  };

  const list = Array.isArray(students) ? students : (students?.results || []);

  return (
    <div className="reception-page">
      <h2>Reception – Check-in</h2>
      <div className="search-box">
        <input
          type="text"
          placeholder="Search by student name or ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchStudents()}
        />
        <button type="button" onClick={searchStudents}>Search</button>
      </div>
      {message && <div className="message">{message}</div>}
      {loading && <p>Searching...</p>}

      <div className="reception-grid">
        <div className="student-list">
          <h3>Students</h3>
          {list.length === 0 && !loading && search && <p>No students found.</p>}
          {list.map((s) => (
            <div
              key={s.id}
              className={`student-item ${selectedStudent?.id === s.id ? 'selected' : ''}`}
              onClick={() => selectStudent(s)}
            >
              {s.student_id} – {s.full_name} ({s.class_level})
            </div>
          ))}
        </div>
        <div className="visitor-panel">
          {selectedStudent && (
            <>
              <h3>Visitors for {selectedStudent.full_name}</h3>
              <button type="button" className="btn-secondary" onClick={() => setShowAddVisitor(!showAddVisitor)}>
                {showAddVisitor ? 'Cancel' : '+ Add new visitor'}
              </button>
              {showAddVisitor && (
                <form className="add-visitor-form" onSubmit={handleAddVisitor}>
                  <input
                    placeholder="Full name"
                    value={newVisitor.full_name}
                    onChange={(e) => setNewVisitor((v) => ({ ...v, full_name: e.target.value }))}
                    required
                  />
                  <input
                    placeholder="National ID (optional)"
                    value={newVisitor.national_id}
                    onChange={(e) => setNewVisitor((v) => ({ ...v, national_id: e.target.value }))}
                  />
                  <input
                    placeholder="Phone (optional)"
                    value={newVisitor.phone}
                    onChange={(e) => setNewVisitor((v) => ({ ...v, phone: e.target.value }))}
                  />
                  <label>
                    Relationship:
                    <select value={linkRelationship} onChange={(e) => setLinkRelationship(e.target.value)}>
                      {RELATIONSHIP_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </label>
                  <button type="submit">Add & link</button>
                </form>
              )}
              <ul className="visitor-list">
                {visitors.map((rel) => (
                  <li key={rel.id}>
                    <span>{rel.visitor?.full_name} – {rel.relationship_type}</span>
                    <button type="button" onClick={() => handleCheckIn(rel.visitor.id, rel.relationship_type)}>
                      Check in
                    </button>
                  </li>
                ))}
              </ul>
              {checkedInToday.length > 0 && (
                <div className="checked-in-today">
                  <h4>Currently checked in (no check-out)</h4>
                  <ul>
                    {checkedInToday.map((r) => (
                      <li key={r.id}>
                        {r.visitor_name} – {r.check_in_time}
                        <button
                          type="button"
                          disabled={checkingOutId === r.id}
                          onClick={() => handleCheckOut(r.id)}
                        >
                          {checkingOutId === r.id ? '...' : 'Check out'}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
