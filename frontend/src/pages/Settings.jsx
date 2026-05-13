import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Plus, X, Trash2, UserPlus, Building2, Save } from 'lucide-react';

export default function Settings() {
  const [tab, setTab] = useState('firm');
  const [firm, setFirm] = useState({});
  const [team, setTeam] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ email: '', full_name: '', password: '', role: 'staff', phone: '' });
  const [saving, setSaving] = useState(false);

  const fetchFirm = () => { api.get('/settings/firm').then(res => setFirm(res.data)); };
  const fetchTeam = () => { api.get('/settings/team').then(res => setTeam(res.data.team)); };
  useEffect(() => { fetchFirm(); fetchTeam(); }, []);

  const saveFirm = async () => {
    setSaving(true);
    await api.post('/settings/firm', firm);
    setSaving(false);
    alert('Settings saved!');
  };

  const addMember = async (e) => {
    e.preventDefault();
    try {
      await api.post('/settings/team', memberForm);
      setShowAddMember(false);
      setMemberForm({ email: '', full_name: '', password: '', role: 'staff', phone: '' });
      fetchTeam();
    } catch (err) { alert(err.response?.data?.detail || 'Error adding member'); }
  };

  const toggleActive = async (userId, currentActive) => {
    await api.patch(`/settings/team/${userId}`, { is_active: !currentActive });
    fetchTeam();
  };

  const removeMember = async (userId) => {
    if (confirm('Remove this team member?')) {
      try {
        await api.delete(`/settings/team/${userId}`);
        fetchTeam();
      } catch (err) { alert(err.response?.data?.detail || 'Error'); }
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button onClick={() => setTab('firm')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'firm' ? 'bg-white shadow text-primary-700' : 'text-gray-600'}`}>Firm Profile</button>
        <button onClick={() => setTab('team')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'team' ? 'bg-white shadow text-primary-700' : 'text-gray-600'}`}>Team</button>
        <button onClick={() => setTab('invoice')} className={`px-4 py-2 rounded-md text-sm font-medium ${tab === 'invoice' ? 'bg-white shadow text-primary-700' : 'text-gray-600'}`}>Invoice Config</button>
      </div>

      {/* Firm Profile */}
      {tab === 'firm' && (
        <div className="bg-white rounded-xl border p-6 max-w-2xl">
          <div className="flex items-center gap-2 mb-4"><Building2 className="w-5 h-5 text-primary-600" /><h2 className="font-semibold">Firm Details</h2></div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">Firm Name</label><input value={firm.firm_name || ''} onChange={e => setFirm({...firm, firm_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="ABC & Associates" /></div>
              <div><label className="block text-sm font-medium mb-1">Firm PAN</label><input value={firm.firm_pan || ''} onChange={e => setFirm({...firm, firm_pan: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="ABCDE1234F" maxLength={10} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">GSTIN</label><input value={firm.firm_gstin || ''} onChange={e => setFirm({...firm, firm_gstin: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border rounded-lg text-sm" maxLength={15} /></div>
              <div><label className="block text-sm font-medium mb-1">Phone</label><input value={firm.firm_phone || ''} onChange={e => setFirm({...firm, firm_phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
            <div><label className="block text-sm font-medium mb-1">Email</label><input value={firm.firm_email || ''} onChange={e => setFirm({...firm, firm_email: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-sm font-medium mb-1">Address</label><textarea value={firm.firm_address || ''} onChange={e => setFirm({...firm, firm_address: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium mb-1">City</label><input value={firm.firm_city || ''} onChange={e => setFirm({...firm, firm_city: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">State</label><input value={firm.firm_state || ''} onChange={e => setFirm({...firm, firm_state: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
            </div>
          </div>
          <button onClick={saveFirm} disabled={saving} className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save Settings'}</button>
        </div>
      )}

      {/* Team */}
      {tab === 'team' && (
        <div className="max-w-3xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Team Members ({team.length})</h2>
            <button onClick={() => setShowAddMember(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700"><UserPlus className="w-4 h-4" /> Add Member</button>
          </div>
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3 font-medium text-gray-600">Name</th><th className="text-left px-4 py-3 font-medium text-gray-600">Email</th><th className="text-left px-4 py-3 font-medium text-gray-600">Role</th><th className="text-left px-4 py-3 font-medium text-gray-600">Status</th><th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th></tr></thead>
              <tbody>{team.map(m => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{m.full_name}</td>
                  <td className="px-4 py-3 text-xs">{m.email}</td>
                  <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">{m.role}</span></td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.is_active ? 'Active' : 'Disabled'}</span></td>
                  <td className="px-4 py-3 flex gap-1">
                    <button onClick={() => toggleActive(m.id, m.is_active)} className="text-xs text-primary-600 hover:underline">{m.is_active ? 'Disable' : 'Enable'}</button>
                    <button onClick={() => removeMember(m.id)} className="text-xs text-red-600 hover:underline ml-2">Remove</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          {showAddMember && <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Add Team Member</h2><button onClick={() => setShowAddMember(false)}><X className="w-5 h-5" /></button></div>
            <form onSubmit={addMember} className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Full Name *</label><input required value={memberForm.full_name} onChange={e => setMemberForm({...memberForm, full_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Email *</label><input required type="email" value={memberForm.email} onChange={e => setMemberForm({...memberForm, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium mb-1">Password *</label><input required type="password" value={memberForm.password} onChange={e => setMemberForm({...memberForm, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Role</label><select value={memberForm.role} onChange={e => setMemberForm({...memberForm, role: e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="owner">Owner</option><option value="partner">Partner</option><option value="manager">Manager</option><option value="staff">Staff</option><option value="article">Article</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Phone</label><input value={memberForm.phone} onChange={e => setMemberForm({...memberForm, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Add Member</button>
            </form>
          </div></div>}
        </div>
      )}

      {/* Invoice Config */}
      {tab === 'invoice' && (
        <div className="bg-white rounded-xl border p-6 max-w-2xl">
          <h2 className="font-semibold mb-4">Invoice Configuration</h2>
          <div className="space-y-3">
            <div><label className="block text-sm font-medium mb-1">Invoice Prefix</label><input value={firm.invoice_prefix || ''} onChange={e => setFirm({...firm, invoice_prefix: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="INV" /></div>
            <div><label className="block text-sm font-medium mb-1">Default Terms</label><textarea value={firm.invoice_terms || ''} onChange={e => setFirm({...firm, invoice_terms: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} placeholder="Payment due within 15 days from invoice date" /></div>
            <div><label className="block text-sm font-medium mb-1">Default Notes</label><textarea value={firm.invoice_notes || ''} onChange={e => setFirm({...firm, invoice_notes: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} placeholder="Thank you for your business" /></div>
          </div>
          <button onClick={saveFirm} disabled={saving} className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"><Save className="w-4 h-4" />{saving ? 'Saving...' : 'Save'}</button>
        </div>
      )}
    </div>
  );
}
