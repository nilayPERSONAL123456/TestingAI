import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Plus, X, Send } from 'lucide-react';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ client_id: '', invoice_date: '', due_date: '', is_igst: false, lines: [{ description: '', rate: 0, quantity: 1, gst_rate: 18 }] });
  const fetchInvoices = () => { api.get('/invoices').then(res => { setInvoices(res.data.invoices); setTotal(res.data.total); }); };
  const fetchClients = () => { api.get('/clients').then(res => setClients(res.data.clients)); };
  useEffect(() => { fetchInvoices(); fetchClients(); }, []);
  const addLine = () => { setForm({...form, lines: [...form.lines, { description: '', rate: 0, quantity: 1, gst_rate: 18 }]}); };
  const updateLine = (idx, field, val) => { const lines = [...form.lines]; lines[idx][field] = val; setForm({...form, lines}); };
  const handleCreate = async (e) => { e.preventDefault(); await api.post('/invoices', form); setShowForm(false); setForm({ client_id: '', invoice_date: '', due_date: '', is_igst: false, lines: [{ description: '', rate: 0, quantity: 1, gst_rate: 18 }] }); fetchInvoices(); };
  const issueInvoice = async (id) => { await api.post(`/invoices/${id}/issue`); fetchInvoices(); };
  const statusColor = (s) => ({draft:'bg-gray-100 text-gray-600',issued:'bg-blue-100 text-blue-700',partially_paid:'bg-yellow-100 text-yellow-700',paid:'bg-green-100 text-green-700',overdue:'bg-red-100 text-red-700'}[s]||'bg-gray-100');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Invoices</h1><p className="text-gray-500 text-sm">{total} invoices</p></div>
        <button onClick={()=>setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"><Plus className="w-4 h-4"/> New Invoice</button>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th><th className="text-left px-4 py-3 font-medium text-gray-600">Date</th><th className="text-left px-4 py-3 font-medium text-gray-600">Due</th><th className="text-right px-4 py-3 font-medium text-gray-600">Total</th><th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th><th className="text-left px-4 py-3 font-medium text-gray-600">Status</th><th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th></tr></thead>
          <tbody>{invoices.map(inv=>(
            <tr key={inv.id} className="border-b hover:bg-gray-50"><td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td><td className="px-4 py-3 text-xs">{inv.invoice_date}</td><td className="px-4 py-3 text-xs">{inv.due_date}</td><td className="px-4 py-3 text-right font-medium">₹{inv.total?.toLocaleString()}</td><td className="px-4 py-3 text-right">₹{inv.balance_due?.toLocaleString()}</td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(inv.status)}`}>{inv.status}</span></td>
              <td className="px-4 py-3">{inv.status==='draft'&&<button onClick={()=>issueInvoice(inv.id)} className="flex items-center gap-1 text-xs text-primary-600 hover:underline"><Send className="w-3 h-3"/>Issue</button>}</td>
            </tr>
          ))}{invoices.length===0&&<tr><td colSpan={7} className="text-center py-8 text-gray-500">No invoices yet</td></tr>}</tbody>
        </table>
      </div>
      {showForm&&<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Create Invoice</h2><button onClick={()=>setShowForm(false)}><X className="w-5 h-5"/></button></div>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium mb-1">Client *</label><select required value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="">Select</option>{clients.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Date *</label><input required type="date" value={form.invoice_date} onChange={e=>setForm({...form,invoice_date:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div>
            <div><label className="block text-sm font-medium mb-1">Due *</label><input required type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div>
          </div>
          <div className="flex items-center gap-2"><input type="checkbox" checked={form.is_igst} onChange={e=>setForm({...form,is_igst:e.target.checked})} id="igst"/><label htmlFor="igst" className="text-sm">IGST (inter-state)</label></div>
          <div><label className="block text-sm font-medium mb-2">Line Items</label>
            {form.lines.map((l,idx)=>(<div key={idx} className="grid grid-cols-4 gap-2 mb-2"><input placeholder="Description" value={l.description} onChange={e=>updateLine(idx,'description',e.target.value)} className="col-span-2 px-3 py-2 border rounded-lg text-sm"/><input type="number" placeholder="Rate" value={l.rate} onChange={e=>updateLine(idx,'rate',parseFloat(e.target.value)||0)} className="px-3 py-2 border rounded-lg text-sm"/><input type="number" placeholder="Qty" value={l.quantity} onChange={e=>updateLine(idx,'quantity',parseFloat(e.target.value)||1)} className="px-3 py-2 border rounded-lg text-sm"/></div>))}
            <button type="button" onClick={addLine} className="text-sm text-primary-600 hover:underline">+ Add line</button>
          </div>
          <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Create Invoice (Draft)</button>
        </form>
      </div></div>}
    </div>
  );
}
