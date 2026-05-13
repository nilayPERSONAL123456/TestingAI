import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { RefreshCw, FileCheck } from 'lucide-react';

export default function Compliance() {
  const [instances, setInstances] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [authorityFilter, setAuthorityFilter] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const fetchInstances = () => { api.get('/compliance/instances', { params: { status: statusFilter||undefined, authority: authorityFilter||undefined, client_id: selectedClient||undefined } }).then(res => { setInstances(res.data.instances); setTotal(res.data.total); }); };
  const fetchClients = () => { api.get('/clients').then(res => setClients(res.data.clients)); };
  useEffect(() => { fetchClients(); }, []);
  useEffect(() => { fetchInstances(); }, [statusFilter, authorityFilter, selectedClient]);
  const seedRules = async () => { await api.post('/compliance/seed-rules'); alert('Compliance rules seeded!'); };
  const generateCalendar = async (cid) => { await api.post(`/compliance/generate/${cid}`); fetchInstances(); alert('Calendar generated!'); };
  const updateStatus = async (id, status) => { await api.patch(`/compliance/instances/${id}`, { status }); fetchInstances(); };
  const statusColor = (s) => ({pending:'bg-yellow-100 text-yellow-700',in_progress:'bg-blue-100 text-blue-700',awaiting_docs:'bg-orange-100 text-orange-700',filed:'bg-green-100 text-green-700',late_filed:'bg-red-100 text-red-700',exempt:'bg-gray-100 text-gray-600'}[s]||'bg-gray-100');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Compliance Tracker</h1><p className="text-gray-500 text-sm">{total} items</p></div>
        <button onClick={seedRules} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Seed Rules</button>
      </div>
      <div className="bg-white rounded-xl border p-4 mb-4"><div className="flex items-center gap-3">
        <select value={selectedClient} onChange={e=>setSelectedClient(e.target.value)} className="px-3 py-2 border rounded-lg text-sm flex-1"><option value="">All Clients</option>{clients.map(c=><option key={c.id} value={c.id}>{c.display_name} ({c.client_code})</option>)}</select>
        {selectedClient&&<button onClick={()=>generateCalendar(selectedClient)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"><RefreshCw className="w-4 h-4"/>Generate Calendar</button>}
      </div></div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm"><option value="">All Status</option><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="filed">Filed</option><option value="exempt">Exempt</option></select>
        <select value={authorityFilter} onChange={e=>setAuthorityFilter(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm"><option value="">All Authorities</option><option value="GST">GST</option><option value="IT">Income Tax</option><option value="ROC">ROC</option><option value="PF">PF</option><option value="ESI">ESI</option></select>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3 font-medium text-gray-600">Compliance</th><th className="text-left px-4 py-3 font-medium text-gray-600">Authority</th><th className="text-left px-4 py-3 font-medium text-gray-600">Period</th><th className="text-left px-4 py-3 font-medium text-gray-600">Due Date</th><th className="text-left px-4 py-3 font-medium text-gray-600">Status</th><th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th></tr></thead>
          <tbody>{instances.map(i=>(
            <tr key={i.id} className="border-b hover:bg-gray-50"><td className="px-4 py-3 font-medium">{i.rule_name}</td><td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded bg-gray-100 font-mono">{i.authority}</span></td><td className="px-4 py-3 text-xs">{i.period_start} to {i.period_end}</td><td className="px-4 py-3 text-xs font-medium">{i.due_date}</td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(i.status)}`}>{i.status}</span></td>
              <td className="px-4 py-3"><select value={i.status} onChange={e=>updateStatus(i.id,e.target.value)} className="text-xs border rounded px-2 py-1"><option value="pending">Pending</option><option value="in_progress">In Progress</option><option value="awaiting_docs">Awaiting Docs</option><option value="filed">Filed</option><option value="late_filed">Late Filed</option><option value="exempt">Exempt</option></select></td>
            </tr>
          ))}{instances.length===0&&<tr><td colSpan={6} className="text-center py-8 text-gray-500"><FileCheck className="w-8 h-8 mx-auto mb-2 text-gray-300"/>No compliance items. Select a client and generate.</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}
