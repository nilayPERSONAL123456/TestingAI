import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Plus, X, Send, Pencil, Trash2, CreditCard } from 'lucide-react';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showPayment, setShowPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: 0, payment_date: '', payment_mode: 'upi', reference_number: '' });
  const [form, setForm] = useState({ client_id: '', invoice_date: '', due_date: '', is_igst: false, notes: '', terms: '', lines: [{ description: '', rate: 0, quantity: 1, gst_rate: 18 }] });

  const fetchInvoices = () => { api.get('/invoices').then(res => { setInvoices(res.data.invoices); setTotal(res.data.total); }); };
  const fetchClients = () => { api.get('/clients').then(res => setClients(res.data.clients)); };
  useEffect(() => { fetchInvoices(); fetchClients(); }, []);

  const resetForm = () => { setForm({ client_id: '', invoice_date: '', due_date: '', is_igst: false, notes: '', terms: '', lines: [{ description: '', rate: 0, quantity: 1, gst_rate: 18 }] }); setEditingId(null); };
  const addLine = () => { setForm({...form, lines: [...form.lines, { description: '', rate: 0, quantity: 1, gst_rate: 18 }]}); };
  const removeLine = (idx) => { if (form.lines.length > 1) { const lines = form.lines.filter((_, i) => i !== idx); setForm({...form, lines}); } };
  const updateLine = (idx, field, val) => { const lines = [...form.lines]; lines[idx][field] = val; setForm({...form, lines}); };

  const openEdit = async (invoiceId) => {
    const res = await api.get(`/invoices/${invoiceId}`);
    const inv = res.data.invoice;
    const lines = res.data.lines.map(l => ({ description: l.description, rate: l.rate, quantity: l.quantity, gst_rate: l.gst_rate, hsn_sac: l.hsn_sac }));
    setForm({ client_id: inv.client_id, invoice_date: inv.invoice_date, due_date: inv.due_date, is_igst: inv.igst > 0, notes: inv.notes || '', terms: inv.terms || '', lines: lines.length > 0 ? lines : [{ description: '', rate: 0, quantity: 1, gst_rate: 18 }] });
    setEditingId(invoiceId);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingId) {
      await api.put(`/invoices/${editingId}`, form);
    } else {
      await api.post('/invoices', form);
    }
    setShowForm(false);
    resetForm();
    fetchInvoices();
  };

  const deleteInvoice = async (id) => {
    if (confirm('Delete this draft invoice?')) {
      await api.delete(`/invoices/${id}`);
      fetchInvoices();
    }
  };

  const issueInvoice = async (id) => {
    if (confirm('Issue this invoice? It cannot be edited after issuing.')) {
      await api.post(`/invoices/${id}/issue`);
      fetchInvoices();
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    await api.post(`/invoices/${showPayment}/payment`, paymentForm);
    setShowPayment(null);
    setPaymentForm({ amount: 0, payment_date: '', payment_mode: 'upi', reference_number: '' });
    fetchInvoices();
  };

  const calcTotal = () => {
    const sub = form.lines.reduce((sum, l) => sum + (l.rate * l.quantity), 0);
    const tax = form.lines.reduce((sum, l) => sum + (l.rate * l.quantity * l.gst_rate / 100), 0);
    return { sub: sub.toFixed(2), tax: tax.toFixed(2), total: (sub + tax).toFixed(2) };
  };

  const statusColor = (s) => ({draft:'bg-gray-100 text-gray-600',issued:'bg-blue-100 text-blue-700',partially_paid:'bg-yellow-100 text-yellow-700',paid:'bg-green-100 text-green-700',overdue:'bg-red-100 text-red-700',cancelled:'bg-red-50 text-red-500'}[s]||'bg-gray-100');
  const clientName = (id) => clients.find(c => c.id === id)?.display_name || '-';
  const totals = calcTotal();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Invoices</h1><p className="text-gray-500 text-sm">{total} invoices</p></div>
        <div className="flex gap-2">
          <a href="/api/export/invoices" target="_blank" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">Export CSV</a>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"><Plus className="w-4 h-4"/> New Invoice</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Due</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Balance</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
          </tr></thead>
          <tbody>{invoices.map(inv=>(
            <tr key={inv.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
              <td className="px-4 py-3 text-xs">{clientName(inv.client_id)}</td>
              <td className="px-4 py-3 text-xs">{inv.invoice_date}</td>
              <td className="px-4 py-3 text-xs">{inv.due_date}</td>
              <td className="px-4 py-3 text-right font-medium">₹{inv.total?.toLocaleString('en-IN')}</td>
              <td className="px-4 py-3 text-right">₹{inv.balance_due?.toLocaleString('en-IN')}</td>
              <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(inv.status)}`}>{inv.status}</span></td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  {inv.status==='draft' && <>
                    <button onClick={()=>openEdit(inv.id)} className="p-1 hover:bg-gray-100 rounded" title="Edit"><Pencil className="w-3.5 h-3.5 text-gray-500"/></button>
                    <button onClick={()=>issueInvoice(inv.id)} className="p-1 hover:bg-gray-100 rounded" title="Issue"><Send className="w-3.5 h-3.5 text-primary-600"/></button>
                    <button onClick={()=>deleteInvoice(inv.id)} className="p-1 hover:bg-gray-100 rounded" title="Delete"><Trash2 className="w-3.5 h-3.5 text-red-500"/></button>
                  </>}
                  {(inv.status==='issued'||inv.status==='partially_paid') &&
                    <button onClick={()=>{ setShowPayment(inv.id); setPaymentForm({...paymentForm, amount: inv.balance_due, payment_date: new Date().toISOString().split('T')[0]}); }} className="p-1 hover:bg-gray-100 rounded" title="Record Payment"><CreditCard className="w-3.5 h-3.5 text-green-600"/></button>
                  }
                </div>
              </td>
            </tr>
          ))}{invoices.length===0&&<tr><td colSpan={8} className="text-center py-8 text-gray-500">No invoices yet. Create your first invoice.</td></tr>}</tbody>
        </table>
      </div>

      {/* Create/Edit Invoice Modal */}
      {showForm&&<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">{editingId ? 'Edit Invoice' : 'Create Invoice'}</h2><button onClick={()=>{setShowForm(false);resetForm();}}><X className="w-5 h-5"/></button></div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium mb-1">Client *</label><select required value={form.client_id} onChange={e=>setForm({...form,client_id:e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"><option value="">Select</option>{clients.map(c=><option key={c.id} value={c.id}>{c.display_name}</option>)}</select></div>
            <div><label className="block text-sm font-medium mb-1">Invoice Date *</label><input required type="date" value={form.invoice_date} onChange={e=>setForm({...form,invoice_date:e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"/></div>
            <div><label className="block text-sm font-medium mb-1">Due Date *</label><input required type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm"/></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2"><input type="checkbox" checked={form.is_igst} onChange={e=>setForm({...form,is_igst:e.target.checked})} id="igst"/><label htmlFor="igst" className="text-sm">IGST (inter-state)</label></div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Line Items</label>
            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 px-1">
                <div className="col-span-5">Description</div><div className="col-span-2">Rate (₹)</div><div className="col-span-2">Qty</div><div className="col-span-2">GST %</div><div className="col-span-1"></div>
              </div>
              {form.lines.map((l,idx)=>(
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input placeholder="Service description" value={l.description} onChange={e=>updateLine(idx,'description',e.target.value)} className="col-span-5 px-3 py-2 border rounded-lg text-sm"/>
                  <input type="number" placeholder="Rate" value={l.rate} onChange={e=>updateLine(idx,'rate',parseFloat(e.target.value)||0)} className="col-span-2 px-3 py-2 border rounded-lg text-sm"/>
                  <input type="number" placeholder="Qty" value={l.quantity} onChange={e=>updateLine(idx,'quantity',parseFloat(e.target.value)||1)} className="col-span-2 px-3 py-2 border rounded-lg text-sm"/>
                  <input type="number" placeholder="GST%" value={l.gst_rate} onChange={e=>updateLine(idx,'gst_rate',parseFloat(e.target.value)||18)} className="col-span-2 px-3 py-2 border rounded-lg text-sm"/>
                  <button type="button" onClick={()=>removeLine(idx)} className="col-span-1 flex items-center justify-center text-red-400 hover:text-red-600"><X className="w-4 h-4"/></button>
                </div>
              ))}
              <button type="button" onClick={addLine} className="text-sm text-primary-600 hover:underline mt-1">+ Add line item</button>
            </div>
          </div>

          {/* Totals preview */}
          <div className="bg-blue-50 rounded-lg p-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span className="font-medium">₹{totals.sub}</span></div>
            <div className="flex justify-between"><span className="text-gray-600">Tax ({form.is_igst ? 'IGST' : 'CGST+SGST'}):</span><span className="font-medium">₹{totals.tax}</span></div>
            <div className="flex justify-between border-t mt-1 pt-1"><span className="font-semibold">Total:</span><span className="font-bold text-lg">₹{totals.total}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium mb-1">Notes</label><textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} placeholder="Internal notes"></textarea></div>
            <div><label className="block text-sm font-medium mb-1">Payment Terms</label><textarea value={form.terms} onChange={e=>setForm({...form,terms:e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} placeholder="Payment due within 15 days"></textarea></div>
          </div>

          <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">{editingId ? 'Update Invoice' : 'Create Invoice (Draft)'}</button>
        </form>
      </div></div>}

      {/* Payment Modal */}
      {showPayment&&<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Record Payment</h2><button onClick={()=>setShowPayment(null)}><X className="w-5 h-5"/></button></div>
        <form onSubmit={handlePayment} className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Amount (₹) *</label><input required type="number" step="0.01" value={paymentForm.amount} onChange={e=>setPaymentForm({...paymentForm,amount:parseFloat(e.target.value)||0})} className="w-full px-3 py-2 border rounded-lg"/></div>
          <div><label className="block text-sm font-medium mb-1">Payment Date *</label><input required type="date" value={paymentForm.payment_date} onChange={e=>setPaymentForm({...paymentForm,payment_date:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div>
          <div><label className="block text-sm font-medium mb-1">Payment Mode</label><select value={paymentForm.payment_mode} onChange={e=>setPaymentForm({...paymentForm,payment_mode:e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="upi">UPI</option><option value="neft">NEFT/RTGS</option><option value="cash">Cash</option><option value="cheque">Cheque</option><option value="card">Card</option></select></div>
          <div><label className="block text-sm font-medium mb-1">Reference / UTR</label><input value={paymentForm.reference_number} onChange={e=>setPaymentForm({...paymentForm,reference_number:e.target.value})} className="w-full px-3 py-2 border rounded-lg" placeholder="UTR / Cheque No."/></div>
          <button type="submit" className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700">Record Payment</button>
        </form>
      </div></div>}
    </div>
  );
}
