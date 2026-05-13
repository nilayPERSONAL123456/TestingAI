import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Plus, X } from 'lucide-react';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', task_type: 'general', due_date: '' });
  const fetchTasks = () => { api.get('/tasks', { params: { status: statusFilter || undefined } }).then(res => { setTasks(res.data.tasks); setTotal(res.data.total); }); };
  useEffect(() => { fetchTasks(); }, [statusFilter]);
  const handleCreate = async (e) => { e.preventDefault(); const p = {...form}; if(!p.due_date) delete p.due_date; await api.post('/tasks', p); setShowForm(false); setForm({ title: '', description: '', priority: 'medium', task_type: 'general', due_date: '' }); fetchTasks(); };
  const updateStatus = async (id, status) => { await api.patch(`/tasks/${id}`, { status }); fetchTasks(); };
  const priorityColor = (p) => ({low:'bg-gray-100 text-gray-600',medium:'bg-yellow-100 text-yellow-700',high:'bg-orange-100 text-orange-700',urgent:'bg-red-100 text-red-700'}[p]||'bg-gray-100');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-800">Tasks</h1><p className="text-gray-500 text-sm">{total} tasks</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"><Plus className="w-4 h-4" /> New Task</button>
      </div>
      <div className="flex gap-2 mb-4">{['','open','in_progress','review','done'].map(s=>(<button key={s} onClick={()=>setStatusFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${statusFilter===s?'bg-primary-600 text-white':'bg-gray-100 text-gray-600'}`}>{s||'All'}</button>))}</div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3 font-medium text-gray-600">Task</th><th className="text-left px-4 py-3 font-medium text-gray-600">Type</th><th className="text-left px-4 py-3 font-medium text-gray-600">Priority</th><th className="text-left px-4 py-3 font-medium text-gray-600">Due</th><th className="text-left px-4 py-3 font-medium text-gray-600">Status</th></tr></thead>
          <tbody>{tasks.map(t=>(
            <tr key={t.id} className="border-b hover:bg-gray-50"><td className="px-4 py-3"><p className="font-medium">{t.title}</p></td><td className="px-4 py-3 capitalize text-xs">{t.task_type}</td><td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor(t.priority)}`}>{t.priority}</span></td><td className="px-4 py-3 text-xs">{t.due_date?new Date(t.due_date).toLocaleDateString():'-'}</td>
              <td className="px-4 py-3"><select value={t.status} onChange={e=>updateStatus(t.id,e.target.value)} className="text-xs border rounded px-2 py-1"><option value="open">Open</option><option value="in_progress">In Progress</option><option value="review">Review</option><option value="done">Done</option><option value="cancelled">Cancelled</option></select></td>
            </tr>
          ))}{tasks.length===0&&<tr><td colSpan={5} className="text-center py-8 text-gray-500">No tasks found</td></tr>}</tbody>
        </table>
      </div>
      {showForm&&<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">New Task</h2><button onClick={()=>setShowForm(false)}><X className="w-5 h-5"/></button></div>
        <form onSubmit={handleCreate} className="space-y-3">
          <div><label className="block text-sm font-medium mb-1">Title *</label><input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div>
          <div><label className="block text-sm font-medium mb-1">Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="w-full px-3 py-2 border rounded-lg" rows={3}></textarea></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-medium mb-1">Priority</label><select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} className="w-full px-3 py-2 border rounded-lg"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div><div><label className="block text-sm font-medium mb-1">Due Date</label><input type="datetime-local" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})} className="w-full px-3 py-2 border rounded-lg"/></div></div>
          <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">Create Task</button>
        </form>
      </div></div>}
    </div>
  );
}
