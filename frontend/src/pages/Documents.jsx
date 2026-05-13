import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Plus, Search, X, Upload, Trash2, FileText, Filter } from 'lucide-react';

const CATEGORIES = ['pan_card', 'gst_cert', 'bank_stmt', 'form16', 'itr', 'balance_sheet', 'agreement', 'notice', 'other'];

export default function Documents() {
  const [documents, setDocuments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ file: null, client_id: '', category: 'other', financial_year: '', description: '' });

  const fetchDocuments = () => {
    setLoading(true);
    const params = {};
    if (filterClient) params.client_id = filterClient;
    if (filterCategory) params.category = filterCategory;
    api.get('/documents', { params }).then(res => {
      setDocuments(Array.isArray(res.data) ? res.data : res.data.documents || []);
    }).catch(() => setDocuments([])).finally(() => setLoading(false));
  };

  const fetchClients = () => {
    api.get('/clients').then(res => {
      setClients(res.data.clients || res.data || []);
    }).catch(() => setClients([]));
  };

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { fetchDocuments(); }, [filterClient, filterCategory]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file || !form.client_id) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', form.file);
    formData.append('client_id', form.client_id);
    formData.append('category', form.category);
    if (form.financial_year) formData.append('financial_year', form.financial_year);
    if (form.description) formData.append('description', form.description);
    try {
      await api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowForm(false);
      setForm({ file: null, client_id: '', category: 'other', financial_year: '', description: '' });
      fetchDocuments();
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await api.delete(`/documents/${id}`);
      fetchDocuments();
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.detail || err.message));
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.display_name : '-';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Documents</h1>
          <p className="text-gray-500 text-sm">{documents.length} documents</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Upload className="w-4 h-4" /> Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
          </select>
        </div>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none">
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
        </select>
        {(filterClient || filterCategory) && (
          <button onClick={() => { setFilterClient(''); setFilterCategory(''); }} className="text-sm text-gray-500 hover:text-gray-700 underline">Clear Filters</button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">File Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">FY</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Size</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Uploaded</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">Loading...</td></tr>
            ) : documents.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-500">
                <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                No documents found
              </td></tr>
            ) : documents.map(doc => (
              <tr key={doc.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate max-w-[200px]">{doc.file_name || doc.filename || '-'}</span>
                </td>
                <td className="px-4 py-3">{getClientName(doc.client_id)}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {(doc.category || '').replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{doc.financial_year || '-'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatFileSize(doc.file_size || doc.size)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(doc.created_at || doc.uploaded_at)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(doc.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Upload Document</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">File *</label>
                <input type="file" required onChange={e => setForm({ ...form, file: e.target.files[0] })} className="w-full px-3 py-2 border rounded-lg text-sm file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-primary-50 file:text-primary-700 file:font-medium file:cursor-pointer" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client *</label>
                <select required value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Financial Year</label>
                <input value={form.financial_year} onChange={e => setForm({ ...form, financial_year: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="2023-24" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={2} placeholder="Optional description..." />
              </div>
              <button type="submit" disabled={uploading} className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
