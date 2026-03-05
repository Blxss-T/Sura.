import { useState, useEffect } from 'react';
import api from '../api';

const TABS = ['Students', 'Visitors', 'Bulk upload', 'Reports', 'Audit logs', 'Users'];

const RELATIONSHIP_OPTIONS = [
  { value: 'MOTHER', label: 'Mother' }, { value: 'FATHER', label: 'Father' },
  { value: 'GUARDIAN', label: 'Guardian' }, { value: 'UNCLE', label: 'Uncle' },
  { value: 'AUNT', label: 'Aunt' }, { value: 'OTHER', label: 'Other' },
];

export default function Admin() {
  const [tab, setTab] = useState('Students');
  const [students, setStudents] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [report, setReport] = useState(null);
  const [reportType, setReportType] = useState('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingVisitor, setEditingVisitor] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [file, setFile] = useState(null);

  useEffect(() => {
    if (tab === 'Students') {
      setLoading(true);
      api.get('/students/').then(({ data }) => setStudents(data.results || data)).finally(() => setLoading(false));
    } else if (tab === 'Visitors') {
      setLoading(true);
      api.get('/visitors/').then(({ data }) => setVisitors(data.results || data)).finally(() => setLoading(false));
    } else if (tab === 'Audit logs') {
      setLoading(true);
      api.get('/audit-logs/').then(({ data }) => setAuditLogs(data.results || data)).finally(() => setLoading(false));
    } else if (tab === 'Users') {
      setLoading(true);
      api.get('/users/').then(({ data }) => setUsers(data.results || data)).finally(() => setLoading(false));
    }
  }, [tab]);

  const runReport = () => {
    setLoading(true);
    setReport(null);
    if (reportType === 'daily') {
      api.get('/reports/', { params: { report: 'daily', date: reportDate } })
        .then(({ data }) => setReport(data)).finally(() => setLoading(false));
    } else if (reportType === 'term') {
      api.get('/reports/', { params: { report: 'term', start: reportStart, end: reportEnd } })
        .then(({ data }) => setReport(data)).finally(() => setLoading(false));
    } else {
      api.get('/reports/', { params: { report: 'most_visited', start: reportStart, end: reportEnd } })
        .then(({ data }) => setReport(data)).finally(() => setLoading(false));
    }
  };

  const exportCsv = () => {
    const params = {};
    if (reportStart) params.start = reportStart;
    if (reportEnd) params.end = reportEnd;
    api.get('/reports/export/', { params, responseType: 'blob' }).then(({ data }) => {
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'visits_export.csv';
      a.click();
      URL.revokeObjectURL(url);
    }).catch(() => setMessage('Export failed'));
  };

  const handleBulkUpload = (e) => {
    e.preventDefault();
    if (!file) { setMessage('Select a CSV file'); return; }
    setMessage('');
    setBulkResult(null);
    const form = new FormData();
    form.append('file', file);
    setLoading(true);
    api.post('/students/bulk_upload/', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(({ data }) => { setBulkResult(data); setFile(null); setMessage('Upload complete.'); })
      .catch((err) => setMessage(err.response?.data?.detail || 'Upload failed'))
      .finally(() => setLoading(false));
  };

  const saveStudent = async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = { student_id: form.student_id.value, full_name: form.full_name.value, class_level: form.class_level.value, enrollment_status: form.enrollment_status.value };
    try {
      if (editingStudent) {
        await api.patch(`/students/${editingStudent.id}/`, payload);
        setMessage('Student updated.');
      } else {
        await api.post('/students/', payload);
        setMessage('Student created.');
      }
      setEditingStudent(null);
      api.get('/students/').then(({ data }) => setStudents(data.results || data));
    } catch (err) {
      setMessage(JSON.stringify(err.response?.data || err.message));
    }
  };

  const saveVisitor = async (e) => {
    e.preventDefault();
    const form = e.target;
    const payload = { full_name: form.full_name.value, phone: form.phone.value, national_id: form.national_id?.value || '' };
    try {
      if (editingVisitor) {
        await api.patch(`/visitors/${editingVisitor.id}/`, payload);
        setMessage('Visitor updated.');
      } else {
        await api.post('/visitors/', payload);
        setMessage('Visitor created.');
      }
      setEditingVisitor(null);
      api.get('/visitors/').then(({ data }) => setVisitors(data.results || data));
    } catch (err) {
      setMessage(JSON.stringify(err.response?.data || err.message));
    }
  };

  const toggleUserActive = async (user) => {
    try {
      await api.patch(`/users/${user.id}/`, { is_active: !user.is_active });
      setMessage(user.is_active ? 'User deactivated.' : 'User activated.');
      api.get('/users/').then(({ data }) => setUsers(data.results || data));
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed');
    }
  };

  return (
    <div className="admin-page">
      <h2>Admin</h2>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} type="button" className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {message && <div className="message">{message}</div>}
      {loading && <p>Loading...</p>}

      {tab === 'Students' && (
        <section>
          <button type="button" onClick={() => setEditingStudent({})}>+ Add student</button>
          {editingStudent && (
            <form onSubmit={saveStudent} className="form-inline">
              <input name="student_id" placeholder="Student ID" defaultValue={editingStudent.student_id} required />
              <input name="full_name" placeholder="Full name" defaultValue={editingStudent.full_name} required />
              <input name="class_level" placeholder="Class" defaultValue={editingStudent.class_level} />
              <select name="enrollment_status" defaultValue={editingStudent.enrollment_status || 'ACTIVE'}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <button type="submit">Save</button>
              <button type="button" onClick={() => setEditingStudent(null)}>Cancel</button>
            </form>
          )}
          <table className="data-table">
            <thead><tr><th>ID</th><th>Name</th><th>Class</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.student_id}</td>
                  <td>{s.full_name}</td>
                  <td>{s.class_level}</td>
                  <td>{s.enrollment_status}</td>
                  <td>
                    <button type="button" onClick={() => setEditingStudent(s)}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'Visitors' && (
        <section>
          <button type="button" onClick={() => setEditingVisitor({})}>+ Add visitor</button>
          {editingVisitor && (
            <form onSubmit={saveVisitor} className="form-inline">
              <input name="full_name" placeholder="Full name" defaultValue={editingVisitor.full_name} required />
              <input name="phone" placeholder="Phone" defaultValue={editingVisitor.phone} />
              {!editingVisitor.id && <input name="national_id" placeholder="National ID" />}
              <button type="submit">Save</button>
              <button type="button" onClick={() => setEditingVisitor(null)}>Cancel</button>
            </form>
          )}
          <table className="data-table">
            <thead><tr><th>Name</th><th>Phone</th><th>ID (masked)</th><th></th></tr></thead>
            <tbody>
              {visitors.map((v) => (
                <tr key={v.id}>
                  <td>{v.full_name}</td>
                  <td>{v.phone}</td>
                  <td>{v.national_id_masked || '—'}</td>
                  <td><button type="button" onClick={() => setEditingVisitor(v)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'Bulk upload' && (
        <section>
          <p>Upload a CSV with columns: student_id, full_name, class_level, enrollment_status, and optionally visitor_name, national_id, phone, relationship_type.</p>
          <form onSubmit={handleBulkUpload}>
            <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files?.[0])} />
            <button type="submit" disabled={!file || loading}>Upload</button>
          </form>
          {bulkResult && (
            <pre>{JSON.stringify(bulkResult, null, 2)}</pre>
          )}
        </section>
      )}

      {tab === 'Reports' && (
        <section>
          <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
            <option value="daily">Daily summary</option>
            <option value="term">Term report</option>
            <option value="most_visited">Most visited students</option>
          </select>
          {reportType === 'daily' && <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />}
          {(reportType === 'term' || reportType === 'most_visited') && (
            <> <input type="date" placeholder="Start" value={reportStart} onChange={(e) => setReportStart(e.target.value)} />
              <input type="date" placeholder="End" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} />
            </>
          )}
          <button type="button" onClick={runReport}>Run report</button>
          <button type="button" onClick={exportCsv}>Export CSV</button>
          {report && <pre>{JSON.stringify(report, null, 2)}</pre>}
        </section>
      )}

      {tab === 'Audit logs' && (
        <section>
          <table className="data-table">
            <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Model</th><th>Object ID</th></tr></thead>
            <tbody>
              {auditLogs.map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.timestamp).toLocaleString()}</td>
                  <td>{a.username}</td>
                  <td>{a.action}</td>
                  <td>{a.model_name}</td>
                  <td>{a.object_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'Users' && (
        <section>
          <table className="data-table">
            <thead><tr><th>Username</th><th>Role</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td>
                  <td>{u.role_display}</td>
                  <td>{u.is_active ? 'Yes' : 'No'}</td>
                  <td>
                    <button type="button" onClick={() => toggleUserActive(u)}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
