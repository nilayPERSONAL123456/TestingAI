import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { Building2 } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        const params = new URLSearchParams();
        params.append('username', form.email);
        params.append('password', form.password);
        const res = await api.post('/auth/login', params, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        localStorage.setItem('token', res.data.access_token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        navigate('/');
      } else {
        await api.post('/auth/register', { email: form.email, password: form.password, full_name: form.full_name, role: 'owner' });
        setIsLogin(true);
        alert('Registration successful! Please login.');
      }
    } catch (err) { setError(err.response?.data?.detail || 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Building2 className="w-8 h-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-800">PraxisCA</h1>
        </div>
        <p className="text-center text-gray-500 mb-6 text-sm">Practice Management for Chartered Accountants</p>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && <div><label className="block text-sm font-medium mb-1">Full Name</label><input type="text" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="CA Rajesh Sharma" required={!isLogin} /></div>}
          <div><label className="block text-sm font-medium mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="ca@firm.in" required /></div>
          <div><label className="block text-sm font-medium mb-1">Password</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required /></div>
          <button type="submit" disabled={loading} className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50">{loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}</button>
        </form>
        <p className="text-center mt-4 text-sm text-gray-600">{isLogin ? "Don't have an account?" : 'Already registered?'} <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-primary-600 font-medium hover:underline">{isLogin ? 'Register' : 'Sign In'}</button></p>
      </div>
    </div>
  );
}
