import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Plus, X, Trash2, AlertTriangle, Filter } from 'lucide-react';

const NOTICE_TYPES = ['it_notice', 'gst_notice', 'roc_notice', 'other'];
const AUTHORITIES = ['IT', 'GST', 'ROC', 'PF', 'ESI'];
const STATUSES = ['received', 'in_progress', 'response_filed', 'closed'];
const PRIORITIES = ['urgent', 'high', 'medium', 'low'];

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS = {
  received: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  response_filed: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
};

export default function Notices() {
  const [notices, setNotices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAuthority, setFilterAuthority] = useState('');
  const [form, setForm] = useState({
    client_id: '', notice_type: 'it_notice', authority: 'IT', section: '',
    reference_number: '', subject: '', description: '', received_date: '',
    response_due_date: '', hearing_date: '', priority: 'medium', amount_demanded: ''
  });

  const fetchNotices = () => {
    setLoading(true);
    const params = {};
    if (filterClient) params.client_id = filterClient;
    if (filterStatus) params.status = filterStatus;
    if (filterAuthority) params.authority = filterAuthority;
    api.get('/notices', { params }).then(res => {
      setNotices(Array.isArray(res.data) ? res.data : res.data.notices || []);
    }).catch(() => setNotices([])).finally(() => setLoading(false));
  };

  const fetchClients = () => {
    api.get('/clients').then(res => {
      setClients(res.data.clients || res.data || []);
    }).catch(() => setClients([]));
  };

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { fetchNotices(); }, [filterClient, filterStatus, filterAuthority]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (payload.amount_demanded) payload.amount_demanded = parseFloat(payload.amount_demanded);
    else delete payload.amount_demanded;
    if (!payload.hearing_date) delete payload.hearing_date;
    if (!payload.section) delete payload.section;
    if (!payload.reference_number) delete payload.reference_number;
    try {
      await api.post('/notices', payload);
      setShowForm(false);
      setForm({ client_id: '', notice_type: 'it_notice', authority: 'IT', section: '', reference_number: '', subject: '', description: '', received_date: '', response_due_date: '', hearing_date: '', priority: 'medium', amount_demanded: '' });
      fetchNotices();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.patch(`/notices/${id}`, { status: newStatus });
      fetchNotices();
    } catch (err) {
      alert('Update failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this notice?')) return;
    try {
      await api.delete(`/notices/${id}`);
      fetchNotices();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.display_name : '-';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Notices</h1>
          <p className="text-gray-500 text-sm">{notices.length} notices</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus className="w-4 h-4" /> Add Notice
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
          </select>
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
        </select>
        <select value={filterAuthority} onChange={e => setFilterAuthority(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
          <option value="">All Authorities</option>
          {AUTHORITIES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(filterClient || filterStatus || filterAuthority) && (
          <button onClick={() => { setFilterClient(''); setFilterStatus(''); setFilterAuthority(''); }} className="text-sm text-gray-500 hover:text-gray-700 underline">Clear Filters</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Authority</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Section</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Received</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : notices.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No notices found
              </td></tr>
            ) : notices.map(notice => (
              <tr key={notice.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium max-w-[200px] truncate">{notice.subject || '-'}</td>
                <td className="px-4 py-3">{getClientName(notice.client_id)}</td>
                <td className="px-4 py-3 font-mono text-xs">{notice.authority || '-'}</td>
                <td className="px-4 py-3 text-xs">{notice.section || '-'}</td>
                <td className="px-4 py-3 text-xs">{formatDate(notice.received_date)}</td>
                <td className="px-4 py-3 text-xs">{formatDate(notice.response_due_date)}</td>
                <td className="px-4 py-3">
                  <select
                    value={notice.status || 'received'}
                    onChange={e => handleStatusChange(notice.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${STATUS_COLORS[notice.status] || 'bg-gray-100'}`}
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[notice.priority] || 'bg-gray-100'}`}>
                    {notice.priority || '-'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(notice.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Notice Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Add Notice</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Client *</label>
                <select required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Notice Type</label>
                  <select value={form.notice_type} onChange={e => setForm({ ...form, notice_type: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    {NOTICE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Authority</label>
                  <select value={form.authority} onChange={e => setForm({ ...form, authority: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    {AUTHORITIES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Section</label>
                  <input value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="e.g. 143(1)" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reference Number</label>
                  <input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject *</label>
                <input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Received Date *</label>
                  <input type="date" required value={form.received_date} onChange={e => setForm({ ...form, received_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Response Due *</label>
                  <input type="date" required value={form.response_due_date} onChange={e => setForm({ ...form, response_due_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hearing Date</label>
                  <input type="date" value={form.hearing_date} onChange={e => setForm({ ...form, hearing_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Amount Demanded</label>
                  <input type="number" step="0.01" value={form.amount_demanded} onChange={e => setForm({ ...form, amount_demanded: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="0.00" />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Create Notice</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
