import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Plus, X } from 'lucide-react';
const STAGES = ['new','contacted','qualified','proposal','negotiation','won','lost'];
const SOURCES = ['manual','website','whatsapp','referral','facebook'];

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [stageFilter, setStageFilter] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', source: 'manual', services_interested: '' });
  const fetchLeads = () => { api.get('/leads', { params: { stage: stageFilter || undefined } }).then(res => { setLeads(res.data.leads); setTotal(res.data.total); }); };
  useEffect(() => { fetchLeads(); }, [stageFilter]);
  const handleCreate = async (e) => { e.preventDefault(); await api.post('/leads', form); setShowForm(false); setForm({ name: '', email: '', phone: '', company: '', source: 'manual', services_interested: '' }); fetchLeads(); };
  const handleStageChange = async (id, stage) => { await api.patch(`/leads/${id}`, { stage }); fetchLeads(); };
  const handleConvert = async (id) => { if(confirm('Convert this lead to a client?')){ await api.post(`/leads/${id}/convert`); fetchLeads(); }};
  const stageColor = (s) => ({new:'bg-gray-100 text-gray-700',contacted:'bg-blue-100 text-blue-700',qualified:'bg-purple-100 text-purple-700',proposal:'bg-orange-100 text-orange-700',negotiation:'bg-yellow-100 text-yellow-700',won:'bg-green-100 text-green-700',lost:'bg-red-100 text-red-700'}[s]||'bg-gray-100');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Leads</h1><p className="text-gray-500 text-sm">{total} leads</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"><Plus className="w-4 h-4" /> Add Lead</button>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setStageFilter('')} className={`px-3 py-1 rounded-full text-xs font-medium ${!stageFilter?'bg-primary-600 text-white':'bg-gray-100 text-gray-600'}`}>All</button>
        {STAGES.map(s=><button key={s} onClick={() => setStageFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${stageFilter===s?'bg-primary-600 text-white':stageColor(s)}`}>{s}</button>)}
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3 font-medium text-gray-600">Name</th><th className="text-left px-4 py-3 font-medium text-gray-600">Company</th><th className="text-left px-4 py-3 font-medium text-gray-600">Source</th><th className="text-left px-4 py-3 font-medium text-gray-600">Stage</th><th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th></tr></thead>
          <tbody>{leads.map(l=>(
            <tr key={l.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3"><p className="font-medium">{l.name}</p><p className="text-xs text-gray-500">{l.email||l.phone}</p></td>
              <td className="px-4 py-3">{l.company||'-'}</td><td className="px-4 py-3 capitalize">{l.source}</td>
              <td className="px-4 py-3"><select value={l.stage} onChange={e=>handleStageChange(l.id,e.target.value)} className={`text-xs px-2 py-1 rounded-full border-0 ${stageColor(l.stage)}`}>{STAGES.map(s=><option key={s} value={s}>{s}</option>)}</select></td>
              <td className="px-4 py-3">{l.stage!=='won'&&l.stage!=='lost'&&<button onClick={()=>handleConvert(l.id)} className="text-xs text-primary-600 hover:underline">Convert</button>}</td>
            </tr>
          ))}{leads.length===0&&<tr><td colSpan={5} className="text-center py-8 text-gray-500">No leads found</td></tr>}</tbody>
        </table>
      </div>
      {showForm&&<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Add New Lead</h2><button onClick={()=>setShowForm(false)}><X className="w-5 h-5"/></button></div>
        <form onSubmit={handleCreate} className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Name *</label><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div><div><label className="block text-sm font-medium mb-1">Phone</label><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Company</label><input value={form.company} onChange={e=>setForm({...form,company:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div><div><label className="block text-sm font-medium mb-1">Source</label><select value={form.source} onChange={e=>setForm({...form,source:e.target.value})} className="w-full px-3 py-2 border rounded-lg">{SOURCES.map(s=><option key={s} value={s}>{s}</option>)}</select></div></div>
          <div><label className="block text-sm font-medium mb-1">Services Interested</label><input value={form.services_interested} onChange={e=>setForm({...form,services_interested:e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="GST, ITR, Audit"/></div>
          <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Create Lead</button>
        </form>
      </div></div>}
    </div>
  );
}
