import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Users, UserPlus, ListTodo, FileCheck, AlertTriangle, IndianRupee, TrendingUp, Clock } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color = 'blue', sub }) {
  const colors = { blue: 'bg-blue-50 text-blue-600', green: 'bg-green-50 text-green-600', red: 'bg-red-50 text-red-600', orange: 'bg-orange-50 text-orange-600', purple: 'bg-purple-50 text-purple-600' };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div><p className="text-sm text-gray-500">{label}</p><p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>{sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}</div>
        <div className={`p-3 rounded-lg ${colors[color]}`}><Icon className="w-6 h-6" /></div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/dashboard').then(res => { setData(res.data); setLoading(false); }).catch(() => setLoading(false)); }, []);
  if (loading) return <div className="flex items-center justify-center h-64"><p>Loading...</p></div>;
  if (!data) return <div className="text-red-500">Failed to load dashboard</div>;
  const s = data.summary;
  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-bold text-gray-800">Dashboard</h1><p className="text-gray-500 text-sm">Practice overview at a glance</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Clients" value={s.total_clients} icon={Users} color="blue" sub={`+${s.new_clients_month} this month`} />
        <StatCard label="Active Leads" value={s.active_leads} icon={UserPlus} color="purple" sub={`${s.leads_this_month} new this month`} />
        <StatCard label="Open Tasks" value={s.open_tasks} icon={ListTodo} color="green" sub={`${s.overdue_tasks} overdue`} />
        <StatCard label="Pending Compliance" value={s.pending_compliance} icon={FileCheck} color="orange" sub={`${s.overdue_compliance} overdue`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Upcoming (7 days)" value={s.upcoming_deadlines_7d} icon={Clock} color="orange" />
        <StatCard label="Filed This Month" value={s.filed_this_month} icon={TrendingUp} color="green" />
        <StatCard label="Total Billed" value={`₹${(s.total_billed/1000).toFixed(1)}k`} icon={IndianRupee} color="blue" />
        <StatCard label="Outstanding" value={`₹${(s.outstanding/1000).toFixed(1)}k`} icon={AlertTriangle} color="red" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Upcoming Compliance Deadlines</h2>
          {data.upcoming_compliance.length === 0 ? <p className="text-gray-500 text-sm">No upcoming deadlines.</p> :
            <div className="space-y-2">{data.upcoming_compliance.map(item => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div><p className="text-sm font-medium">{item.rule_name}</p><p className="text-xs text-gray-500">{item.authority}</p></div>
                <div className="text-right"><p className="text-sm">{item.due_date}</p><span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{item.status}</span></div>
              </div>
            ))}</div>}
        </div>
        <div className="bg-white rounded-xl border p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Recent Tasks</h2>
          {data.recent_tasks.length === 0 ? <p className="text-gray-500 text-sm">No tasks yet.</p> :
            <div className="space-y-2">{data.recent_tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div><p className="text-sm font-medium">{task.title}</p><span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{task.priority}</span></div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{task.status}</span>
              </div>
            ))}</div>}
        </div>
      </div>
    </div>
  );
}
