import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Plus, X, Trash2, Clock, Filter, BarChart3 } from 'lucide-react';

export default function Timesheet() {
  const [entries, setEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [aging, setAging] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [form, setForm] = useState({ work_date: '', client_id: '', description: '', hours: '', billable: true });

  const fetchEntries = () => {
    setLoading(true);
    const params = {};
    if (filterClient) params.client_id = filterClient;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    api.get('/timesheet', { params }).then(res => {
      setEntries(Array.isArray(res.data) ? res.data : res.data.entries || []);
    }).catch(() => setEntries([])).finally(() => setLoading(false));
  };

  const fetchClients = () => {
    api.get('/clients').then(res => {
      setClients(res.data.clients || res.data || []);
    }).catch(() => setClients([]));
  };

  const fetchAging = () => {
    api.get('/timesheet/aging').then(res => {
      setAging(res.data);
    }).catch(() => setAging(null));
  };

  useEffect(() => { fetchClients(); fetchAging(); }, []);
  useEffect(() => { fetchEntries(); }, [filterClient, dateFrom, dateTo]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      hours: parseFloat(form.hours),
      billable: form.billable ? "yes" : "no",
    };
    try {
      await api.post('/timesheet', payload);
      setShowForm(false);
      setForm({ work_date: '', client_id: '', description: '', hours: '', billable: true });
      fetchEntries();
      fetchAging();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.detail ? (typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail)) : err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await api.delete(`/timesheet/${id}`);
      fetchEntries();
      fetchAging();
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

  const totalHours = entries.reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);
  const billableHours = entries.filter(e => e.billable === "yes" || e.billable === true).reduce((sum, e) => sum + (parseFloat(e.hours) || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Timesheet</h1>
          <p className="text-gray-500 text-sm">{entries.length} entries</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus className="w-4 h-4" /> Log Time
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Hours</p>
              <p className="text-xl font-bold text-gray-800">{totalHours.toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Billable Hours</p>
              <p className="text-xl font-bold text-gray-800">{billableHours.toFixed(1)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Non-Billable</p>
              <p className="text-xl font-bold text-gray-800">{(totalHours - billableHours).toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Aging Report */}
      {aging && (
        <div className="bg-white rounded-xl border p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Aging Report</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">0-30 days</p>
              <p className="text-lg font-bold text-green-700">{aging.bucket_0_30?.count ?? aging['0_30']?.count ?? 0}</p>
              <p className="text-xs text-gray-500">&#8377;{(aging.bucket_0_30?.total_amount ?? aging['0_30']?.total_amount ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">31-60 days</p>
              <p className="text-lg font-bold text-yellow-700">{aging.bucket_31_60?.count ?? aging['31_60']?.count ?? 0}</p>
              <p className="text-xs text-gray-500">&#8377;{(aging.bucket_31_60?.total_amount ?? aging['31_60']?.total_amount ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">61-90 days</p>
              <p className="text-lg font-bold text-orange-700">{aging.bucket_61_90?.count ?? aging['61_90']?.count ?? 0}</p>
              <p className="text-xs text-gray-500">&#8377;{(aging.bucket_61_90?.total_amount ?? aging['61_90']?.total_amount ?? 0).toLocaleString()}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">90+ days</p>
              <p className="text-lg font-bold text-red-700">{aging.bucket_90_plus?.count ?? aging['90_plus']?.count ?? 0}</p>
              <p className="text-xs text-gray-500">&#8377;{(aging.bucket_90_plus?.total_amount ?? aging['90_plus']?.total_amount ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
          </select>
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="From" />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="To" />
        {(filterClient || dateFrom || dateTo) && (
          <button onClick={() => { setFilterClient(''); setDateFrom(''); setDateTo(''); }} className="text-sm text-gray-500 hover:text-gray-700 underline">Clear Filters</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Hours</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Billable</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">
                <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No timesheet entries found
              </td></tr>
            ) : entries.map(entry => (
              <tr key={entry.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 text-xs">{formatDate(entry.work_date)}</td>
                <td className="px-4 py-3">{getClientName(entry.client_id)}</td>
                <td className="px-4 py-3 max-w-[250px] truncate">{entry.description || '-'}</td>
                <td className="px-4 py-3 font-medium">{parseFloat(entry.hours).toFixed(1)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${entry.billable === "yes" || entry.billable === true ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {entry.billable === "yes" || entry.billable === true ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(entry.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Entry Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Log Time Entry</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input type="date" required value={form.work_date} onChange={e => setForm({ ...form, work_date: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client *</label>
                <select required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description *</label>
                <textarea required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} placeholder="What did you work on?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Hours *</label>
                  <input type="number" required step="0.25" min="0.25" max="24" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="1.5" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form.billable} onChange={e => setForm({ ...form, billable: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <span className="text-sm font-medium">Billable</span>
                  </label>
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Log Entry</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
