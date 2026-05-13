import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Plus, Search, X } from 'lucide-react';
const ENTITY_TYPES = ['individual', 'proprietor', 'partnership', 'llp', 'pvt_ltd', 'public_ltd', 'trust', 'huf'];

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ display_name: '', entity_type: 'individual', pan: '', gstin: '', email: '', phone: '', city: '', state: '', services: '' });

  const fetchClients = () => { api.get('/clients', { params: { search: search || undefined } }).then(res => { setClients(res.data.clients); setTotal(res.data.total); }); };
  useEffect(() => { fetchClients(); }, [search]);

  const handleCreate = async (e) => { e.preventDefault(); await api.post('/clients', form); setShowForm(false); setForm({ display_name: '', entity_type: 'individual', pan: '', gstin: '', email: '', phone: '', city: '', state: '', services: '' }); fetchClients(); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Clients</h1><p className="text-gray-500 text-sm">{total} total clients</p></div>
        <div className="flex gap-2">
          <a href="/api/export/clients" target="_blank" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Export CSV</a>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"><Plus className="w-4 h-4" /> Add Client</button>
        </div>
      </div>
      <div className="relative mb-4"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input type="text" placeholder="Search by name, PAN, GSTIN..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" /></div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3 font-medium text-gray-600">Code</th><th className="text-left px-4 py-3 font-medium text-gray-600">Name</th><th className="text-left px-4 py-3 font-medium text-gray-600">Type</th><th className="text-left px-4 py-3 font-medium text-gray-600">PAN</th><th className="text-left px-4 py-3 font-medium text-gray-600">GSTIN</th><th className="text-left px-4 py-3 font-medium text-gray-600">Status</th></tr></thead>
          <tbody>{clients.map(c => (
            <tr key={c.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs">{c.client_code}</td><td className="px-4 py-3 font-medium">{c.display_name}</td><td className="px-4 py-3 capitalize">{c.entity_type?.replace('_',' ')}</td><td className="px-4 py-3 font-mono text-xs">{c.pan||'-'}</td><td className="px-4 py-3 font-mono text-xs">{c.gstin||'-'}</td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${c.status==='active'?'bg-green-100 text-green-700':'bg-gray-100'}`}>{c.status}</span></td>
            </tr>
          ))}{clients.length===0&&<tr><td colSpan={6} className="text-center py-8 text-gray-500">No clients found</td></tr>}</tbody>
        </table>
      </div>
      {showForm && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Add New Client</h2><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
        <form onSubmit={handleCreate} className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Display Name *</label><input required value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm font-medium mb-1">Entity Type</label><select value={form.entity_type} onChange={e => setForm({...form, entity_type: e.target.value})} className="w-full px-3 py-2 border rounded-lg">{ENTITY_TYPES.map(t=><option key={t} value={t}>{t.replace('_',' ')}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">PAN</label><input value={form.pan} onChange={e => setForm({...form, pan: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border rounded-lg" maxLength={10} /></div><div><label className="block text-sm font-medium mb-1">GSTIN</label><input value={form.gstin} onChange={e => setForm({...form, gstin: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border rounded-lg" maxLength={15} /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div><div><label className="block text-sm font-medium mb-1">Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div></div>
          <div><label className="block text-sm font-medium mb-1">Services</label><input value={form.services} onChange={e => setForm({...form, services: e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="GST, ITR, TDS, Audit" /></div>
          <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Create Client</button>
        </form>
      </div></div>}
    </div>
  );
}
