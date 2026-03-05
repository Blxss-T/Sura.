import { useState, useEffect } from 'react';
import api from '../api';

const RELATIONSHIP_OPTIONS = [
  { value: 'MOTHER', label: 'Mother' }, { value: 'FATHER', label: 'Father' },
  { value: 'GUARDIAN', label: 'Guardian' }, { value: 'UNCLE', label: 'Uncle' },
  { value: 'AUNT', label: 'Aunt' }, { value: 'OTHER', label: 'Other' },
];

export default function Security() {
  const [checkedIn, setCheckedIn] = useState([]);
  const [overstayed, setOverstayed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadCheckedIn = () => {
    api.get('visit-records/currently_checked_in/').then(({ data }) => setCheckedIn(data)).catch(() => setCheckedIn([]));
  };
  const loadOverstayed = () => {
    api.get('visit-records/overstayed/', { params: { hours: 2 } }).then(({ data }) => setOverstayed(data)).catch(() => setOverstayed([]));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadCheckedIn(), loadOverstayed()]).finally(() => setLoading(false));
  }, []);

  const handleCheckOut = async (id) => {
    setMessage('');
    try {
      await api.patch(`visit-records/${id}/check_out/`);
      setMessage('Checked out.');
      loadCheckedIn();
      loadOverstayed();
    } catch (e) {
      setMessage(e.response?.data?.detail || 'Check-out failed');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="security-page">
      <h2>Security Desk</h2>
      {message && <div className="message">{message}</div>}
      <section>
        <h3>Currently checked in</h3>
        {checkedIn.length === 0 ? <p>No visitors currently on campus.</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Student</th>
                <th>Check-in time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {checkedIn.map((r) => (
                <tr key={r.id}>
                  <td>{r.visitor_name}</td>
                  <td>{r.student_name}</td>
                  <td>{new Date(r.check_in_time).toLocaleString()}</td>
                  <td>
                    <button type="button" onClick={() => handleCheckOut(r.id)}>Check out</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      <section>
        <h3>Overstayed (over 2 hours)</h3>
        {overstayed.length === 0 ? <p>None.</p> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Student</th>
                <th>Check-in time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {overstayed.map((r) => (
                <tr key={r.id}>
                  <td>{r.visitor_name}</td>
                  <td>{r.student_name}</td>
                  <td>{new Date(r.check_in_time).toLocaleString()}</td>
                  <td>
                    <button type="button" onClick={() => handleCheckOut(r.id)}>Check out</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
