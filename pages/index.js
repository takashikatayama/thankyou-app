import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, BarChart3, Plus, Heart, LogOut, Calendar, TrendingUp, Trash2, Eye, EyeOff, Mail, Lock, UserPlus, ChevronLeft, ChevronRight, Download, Upload, Gift, ChevronDown, ChevronUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const ADMIN_EMAILS = [
  'takashi.katayama@onetenth.co.jp',
  'hiroaki.nagata@onetenth.co.jp',
  'yuichi88@gmail.com'
];

export default function App() {
  const [employees, setEmployees] = useState([]);
  const [thanks, setThanks] = useState([]);
  const [view, setView] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [newEmployee, setNewEmployee] = useState({ name: '', department: '', email: '', password: 'pass123' });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [thankMessage, setThankMessage] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [adminTab, setAdminTab] = useState('dashboard');
  const [chartMonth, setChartMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginMode, setLoginMode] = useState('employee');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('total');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedMonth, setExpandedMonth] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: empData } = await supabase.from('employees').select('*').order('id');
    const { data: thanksData } = await supabase.from('thanks').select('*').order('created_at', { ascending: false });
    if (empData) setEmployees(empData.map(e => ({
      id: e.id, name: e.name, department: e.department || '', email: e.email,
      password: e.password, isFirstLogin: e.is_first_login, isAdmin: e.is_admin
    })));
    if (thanksData) setThanks(thanksData.map(t => ({
      id: t.id, from: t.from_employee_id, to: t.to_employee_id,
      date: t.created_at.split('T')[0], message: t.message || ''
    })));
    setLoading(false);
  };

  const handleLogin = async () => {
    setLoginError('');
    const emp = employees.find(e => e.email === loginEmail && e.password === loginPassword);
    if (!emp) { setLoginError('メールアドレスまたはパスワードが正しくありません'); return; }
    if (loginMode === 'admin' && !ADMIN_EMAILS.includes(emp.email)) {
      setLoginError('このアカウントには管理者権限がありません'); return;
    }
    setCurrentUser(emp);
    setIsAdmin(loginMode === 'admin');
    setView(emp.isFirstLogin ? 'changePassword' : (loginMode === 'admin' ? 'admin' : 'employee'));
    setLoginEmail(''); setLoginPassword('');
  };

  const handleChangePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 4) { setPasswordError('パスワードは4文字以上で入力してください'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('パスワードが一致しません'); return; }
    await supabase.from('employees').update({ password: newPassword, is_first_login: false }).eq('id', currentUser.id);
    setEmployees(employees.map(e => e.id === currentUser.id ? { ...e, password: newPassword, isFirstLogin: false } : e));
    setCurrentUser({ ...currentUser, password: newPassword, isFirstLogin: false });
    setNewPassword(''); setConfirmPassword('');
    setView(isAdmin ? 'admin' : 'employee');
    alert('パスワードを変更しました');
  };

  const handleLogout = () => {
    setCurrentUser(null); setIsAdmin(false); setView('login');
    setLoginEmail(''); setLoginPassword('');
  };

  const getFilteredThanks = () => {
    const now = new Date();
    return thanks.filter(t => {
      const d = new Date(t.date);
      if (dateFilter === 'week') return d >= new Date(now - 7*24*60*60*1000);
      if (dateFilter === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (dateFilter === 'year') return d.getFullYear() === now.getFullYear();
      return true;
    });
  };

  const getPeriodFilteredThanks = (withCommentOnly = false) => {
    const now = new Date();
    let filtered = thanks;
    if (periodFilter === 'week') {
      filtered = thanks.filter(t => new Date(t.date) >= new Date(now - 7*24*60*60*1000));
    } else if (periodFilter === 'month') {
      filtered = thanks.filter(t => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    } else if (periodFilter === 'year') {
      filtered = thanks.filter(t => new Date(t.date).getFullYear() === now.getFullYear());
    } else if (periodFilter === 'custom' && startDate && endDate) {
      filtered = thanks.filter(t => t.date >= startDate && t.date <= endDate);
    }
    if (withCommentOnly) {
      filtered = filtered.filter(t => t.message && t.message.trim() !== '');
    }
    return filtered;
  };

  const getPointsByEmployee = () => {
    const filtered = getFilteredThanks();
    const points = {}, receivedDetails = {};
    employees.forEach(e => { points[e.id] = 0; receivedDetails[e.id] = []; });
    filtered.forEach(t => { points[t.to]++; receivedDetails[t.to].push({ from: t.from, date: t.date, message: t.message }); });
    return employees.map(e => ({ ...e, points: points[e.id], receivedDetails: receivedDetails[e.id].sort((a,b) => new Date(b.date) - new Date(a.date)) })).sort((a,b) => b.points - a.points);
  };

  const getGivenPointsByEmployee = () => {
    const filtered = getFilteredThanks();
    const points = {}, givenDetails = {};
    employees.forEach(e => { points[e.id] = 0; givenDetails[e.id] = []; });
    filtered.forEach(t => { points[t.from]++; givenDetails[t.from].push({ to: t.to, date: t.date, message: t.message }); });
    return employees.map(e => ({ ...e, points: points[e.id], givenDetails: givenDetails[e.id].sort((a,b) => new Date(b.date) - new Date(a.date)) })).sort((a,b) => b.points - a.points);
  };

  const sendThanks = async () => {
    if (!selectedEmployee) return;
    const { data, error } = await supabase.from('thanks').insert({
      from_employee_id: currentUser.id, to_employee_id: selectedEmployee, message: thankMessage.trim() || ''
    }).select().single();
    if (data) {
      setThanks([{ id: data.id, from: currentUser.id, to: selectedEmployee, date: data.created_at.split('T')[0], message: thankMessage.trim() || '' }, ...thanks]);
    }
    setSelectedEmployee(null); setThankMessage('');
    alert('サンキューを送信しました！');
  };

  const addEmployee = async () => {
    if (!newEmployee.name.trim() || !newEmployee.email.trim() || !newEmployee.password.trim()) {
      alert('名前、メールアドレス、パスワードは必須です'); return;
    }
    if (employees.some(e => e.email === newEmployee.email)) {
      alert('このメールアドレスは既に使用されています'); return;
    }
    const { data, error } = await supabase.from('employees').insert({
      name: newEmployee.name, department: newEmployee.department, email: newEmployee.email,
      password: newEmployee.password, is_first_login: true, is_admin: false
    }).select().single();
    if (data) {
      setEmployees([...employees, { id: data.id, name: data.name, department: data.department || '', email: data.email, password: data.password, isFirstLogin: true, isAdmin: false }]);
    }
    setNewEmployee({ name: '', department: '', email: '', password: 'pass123' });
  };

  const deleteEmployee = async (id) => {
    if (confirm('この社員を削除しますか？')) {
      await supabase.from('thanks').delete().or(`from_employee_id.eq.${id},to_employee_id.eq.${id}`);
      await supabase.from('employees').delete().eq('id', id);
      setEmployees(employees.filter(e => e.id !== id));
      setThanks(thanks.filter(t => t.from !== id && t.to !== id));
    }
  };

  const getName = (id) => employees.find(e => e.id === id)?.name || '不明';

  const getMonthlyChartData = () => {
    const [year, month] = chartMonth.split('-').map(Number);
    const monthThanks = thanks.filter(t => { const d = new Date(t.date); return d.getFullYear() === year && d.getMonth() + 1 === month; });
    const points = {}; employees.forEach(e => points[e.id] = 0);
    monthThanks.forEach(t => points[t.to]++);
    return employees.map(e => ({ name: e.name.slice(0,4), fullName: e.name, points: points[e.id] })).sort((a,b) => b.points - a.points);
  };

  const getMonthlyChartDataWithComment = () => {
    const [year, month] = chartMonth.split('-').map(Number);
    const monthThanks = thanks.filter(t => { 
      const d = new Date(t.date); 
      return d.getFullYear() === year && d.getMonth() + 1 === month && t.message && t.message.trim() !== '';
    });
    const points = {}; employees.forEach(e => points[e.id] = 0);
    monthThanks.forEach(t => points[t.to]++);
    return employees.map(e => ({ name: e.name.slice(0,4), fullName: e.name, points: points[e.id] })).sort((a,b) => b.points - a.points);
  };

  const getPeriodChartData = () => {
    const filtered = getPeriodFilteredThanks(typeFilter === 'withComment');
    const points = {}; employees.forEach(e => points[e.id] = 0);
    filtered.forEach(t => points[t.to]++);
    return employees.map(e => ({ name: e.name.slice(0,4), fullName: e.name, points: points[e.id] })).sort((a,b) => b.points - a.points);
  };

  const changeMonth = (delta) => {
    const [year, month] = chartMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + delta, 1);
    setChartMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatMonth = (monthStr) => { const [year, month] = monthStr.split('-'); return `${year}年${parseInt(month)}月`; };

  const getPeriodLabel = () => {
    if (periodFilter === 'all') return '全期間';
    if (periodFilter === 'week') return '今週';
    if (periodFilter === 'month') return '今月';
    if (periodFilter === 'year') return '今年';
    if (periodFilter === 'custom') return `${startDate} 〜 ${endDate}`;
    return '';
  };

  const COLORS = ['#f472b6','#fb923c','#fbbf24','#a3e635','#34d399','#22d3ee','#818cf8','#c084fc','#f472b6','#fb923c','#fbbf24','#a3e635','#34d399','#22d3ee','#818cf8'];

  const exportToCSV = () => {
    const headers = ['日付','送信者名','送信者メール','受信者名','受信者メール','メッセージ'];
    const rows = thanks.map(t => {
      const fromEmp = employees.find(e => e.id === t.from);
      const toEmp = employees.find(e => e.id === t.to);
      return [t.date, fromEmp?.name||'不明', fromEmp?.email||'', toEmp?.name||'不明', toEmp?.email||'', t.message||''];
    });
    const csvContent = [headers,...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `thankyou_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const importFromCSV = async (event) => {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const lines = e.target.result.split('\n').filter(line => line.trim());
      if (lines.length < 2) { alert('CSVファイルにデータがありません'); return; }
      let importCount = 0, skipCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const values = []; let current = '', inQuotes = false;
        for (let char of lines[i]) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
          else current += char;
        }
        values.push(current.trim());
        if (values.length >= 5) {
          const [date, fromName, fromEmail, toName, toEmail, message] = values;
          let fromEmp = employees.find(e => e.email === fromEmail) || employees.find(e => e.name === fromName);
          let toEmp = employees.find(e => e.email === toEmail) || employees.find(e => e.name === toName);
          if (fromEmp && toEmp) {
            await supabase.from('thanks').insert({ from_employee_id: fromEmp.id, to_employee_id: toEmp.id, message: message||'', created_at: date || new Date().toISOString() });
            importCount++;
          } else skipCount++;
        }
      }
      await fetchData();
      alert(`インポート完了\n成功: ${importCount}件\nスキップ: ${skipCount}件`);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const canViewReceivedThanks = (monthStr) => {
    const [year, month] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    const viewableTime = new Date(year, month - 1, lastDay, 18, 0, 0);
    return new Date() >= viewableTime;
  };

  const getReceivedThanksByMonth = () => {
    const receivedThanks = thanks.filter(t => t.to === currentUser.id);
    const byMonth = {};
    receivedThanks.forEach(t => {
      const monthKey = t.date.substring(0, 7);
      if (!byMonth[monthKey]) byMonth[monthKey] = {};
      const fromName = getName(t.from);
      if (!byMonth[monthKey][fromName]) byMonth[monthKey][fromName] = [];
      byMonth[monthKey][fromName].push({ date: t.date, message: t.message });
    });
    return Object.entries(byMonth)
      .filter(([month]) => canViewReceivedThanks(month))
      .sort((a, b) => b[0].localeCompare(a[0]));
  };

  const getTotalCountForMonth = (monthData) => {
    return Object.values(monthData).reduce((sum, arr) => sum + arr.length, 0);
  };

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-pink-100 to-orange-100 flex items-center justify-center"><p className="text-gray-600">読み込み中...</p></div>;

  if (view === 'changePassword') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4"><Lock className="w-8 h-8 text-white" /></div>
            <h1 className="text-2xl font-bold text-gray-800">パスワード変更</h1>
            <p className="text-gray-500 mt-2">初回ログインのため、新しいパスワードを設定してください</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">新しいパスワード</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type={showNewPassword ? 'text' : 'password'} className="w-full pl-10 pr-12 py-3 border rounded-lg" placeholder="4文字以上" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">{showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">新しいパスワード（確認）</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type={showNewPassword ? 'text' : 'password'} className="w-full pl-10 pr-4 py-3 border rounded-lg" placeholder="もう一度入力" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleChangePassword()} />
              </div>
            </div>
            {passwordError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{passwordError}</div>}
            <button onClick={handleChangePassword} className="w-full p-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-lg"><Lock className="w-5 h-5 inline mr-2" />パスワードを変更</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4"><Heart className="w-8 h-8 text-white" /></div>
            <h1 className="text-2xl font-bold text-gray-800">サンキューポイント</h1>
            <p className="text-gray-500 mt-2">感謝を届けよう</p>
          </div>
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button onClick={() => { setLoginMode('employee'); setLoginError(''); }} className={`flex-1 py-2 rounded-md text-sm font-medium ${loginMode === 'employee' ? 'bg-white shadow text-pink-600' : 'text-gray-500'}`}>社員ログイン</button>
            <button onClick={() => { setLoginMode('admin'); setLoginError(''); }} className={`flex-1 py-2 rounded-md text-sm font-medium ${loginMode === 'admin' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>管理者ログイン</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">メールアドレス</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="email" className="w-full pl-10 pr-4 py-3 border rounded-lg" placeholder="example@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">パスワード</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type={showPassword ? 'text' : 'password'} className="w-full pl-10 pr-12 py-3 border rounded-lg" placeholder="パスワード" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
              </div>
            </div>
            {loginError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{loginError}</div>}
            <button onClick={handleLogin} className={`w-full p-3 text-white rounded-lg ${loginMode === 'admin' ? 'bg-gray-800' : 'bg-gradient-to-r from-pink-500 to-orange-500'}`}>{loginMode === 'admin' ? <BarChart3 className="w-5 h-5 inline mr-2" /> : <Heart className="w-5 h-5 inline mr-2" />}ログイン</button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'employee') {
    const receivedByMonth = getReceivedThanksByMonth();
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-orange-100 p-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
            <div className="flex justify-between items-center mb-6">
              <div><h2 className="text-xl font-bold text-gray-800">{currentUser.name}さん</h2><p className="text-gray-500 text-sm">{currentUser.email}</p></div>
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-gray-600"><LogOut className="w-5 h-5" /></button>
            </div>
            <div className="bg-gradient-to-r from-pink-500 to-orange-500 rounded-xl p-6 text-white text-center mb-6"><Heart className="w-12 h-12 mx-auto mb-2" /><p className="text-lg">サンキューを送ろう！</p></div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">感謝を伝えたい相手</label>
                <select className="w-full p-3 border rounded-lg" value={selectedEmployee || ''} onChange={(e) => setSelectedEmployee(parseInt(e.target.value))}>
                  <option value="" disabled>社員を選択...</option>
                  {employees.filter(e => e.id !== currentUser.id).map(e => <option key={e.id} value={e.id}>{e.name}{e.department ? `（${e.department}）` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">メッセージ（任意）</label>
                <textarea className="w-full p-3 border rounded-lg" rows={3} placeholder="感謝のメッセージを入力..." value={thankMessage} onChange={(e) => setThankMessage(e.target.value)} />
              </div>
              <button onClick={sendThanks} disabled={!selectedEmployee} className="w-full p-3 bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-lg disabled:opacity-50"><Heart className="w-5 h-5 inline mr-2" />サンキューを送る</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Gift className="w-5 h-5 text-pink-500" />
              受け取ったサンキュー
            </h3>
            {receivedByMonth.length === 0 ? (
              <p className="text-gray-400 text-center py-4">まだ受け取ったサンキューはありません</p>
            ) : (
              <div className="space-y-3">
                {receivedByMonth.map(([month, thanksByPerson]) => (
                  <div key={month} className="border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedMonth(expandedMonth === month ? null : month)}
                      className="w-full p-3 bg-pink-50 flex justify-between items-center hover:bg-pink-100"
                    >
                      <span className="font-medium text-pink-700">{formatMonth(month)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-pink-600 font-bold">{getTotalCountForMonth(thanksByPerson)}件</span>
                        {expandedMonth === month ? <ChevronUp className="w-5 h-5 text-pink-500" /> : <ChevronDown className="w-5 h-5 text-pink-500" />}
                      </div>
                    </button>
                    {expandedMonth === month && (
                      <div className="p-3 space-y-3 bg-white">
                        {Object.entries(thanksByPerson).map(([person, thanksList]) => (
                          <div key={person} className="border-l-4 border-pink-400 pl-3">
                            <p className="font-medium text-pink-700 mb-2">{person}さんから（{thanksList.length}件）</p>
                            <div className="space-y-2">
                              {thanksList.map((t, idx) => (
                                <div key={idx} className="p-2 bg-gray-50 rounded text-sm">
                                  <span className="text-gray-400 text-xs">{t.date}</span>
                                  <p className="text-gray-600">{t.message || '－'}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-4 text-center">※ 毎月末日18時以降に当月分が表示されます</p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h3 className="font-bold text-gray-800 mb-4">あなたが送ったサンキュー</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {thanks.filter(t => t.from === currentUser.id).length === 0 ? <p className="text-gray-400 text-center py-4">まだサンキューを送っていません</p> :
                thanks.filter(t => t.from === currentUser.id).map(t => (
                  <div key={t.id} className="p-3 bg-pink-50 rounded-lg">
                    <div className="flex justify-between items-start"><p className="font-medium text-pink-700">{getName(t.to)}さんへ</p><span className="text-xs text-gray-400">{t.date}</span></div>
                    <p className="text-sm text-gray-600 mt-1">{t.message || '－'}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const ranked = getPointsByEmployee();
  const givenRanked = getGivenPointsByEmployee();
  const filtered = getFilteredThanks();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gray-800 text-white p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3"><BarChart3 className="w-6 h-6" /><h1 className="text-xl font-bold">管理者ダッシュボード</h1></div>
          <button onClick={handleLogout} className="p-2 hover:bg-gray-700 rounded flex items-center gap-2"><LogOut className="w-5 h-5" /><span className="text-sm">ログアウト</span></button>
        </div>
      </div>
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex gap-2 mb-6 flex-wrap">
          {['dashboard','employees','history'].map(tab => (
            <button key={tab} onClick={() => setAdminTab(tab)} className={`px-4 py-2 rounded-lg font-medium ${adminTab === tab ? 'bg-gray-800 text-white' : 'bg-white text-gray-600'}`}>
              {tab === 'dashboard' && 'ダッシュボード'}{tab === 'employees' && '社員管理'}{tab === 'history' && '履歴詳細'}
            </button>
          ))}
        </div>

        {adminTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow"><p className="text-gray-500 text-sm">総社員数</p><p className="text-3xl font-bold text-gray-800">{employees.length}</p></div>
              <div className="bg-white rounded-xl p-4 shadow"><p className="text-gray-500 text-sm">総サンキュー数</p><p className="text-3xl font-bold text-pink-600">{thanks.length}</p></div>
              <div className="bg-white rounded-xl p-4 shadow"><p className="text-gray-500 text-sm">コメント付きサンキュー数</p><p className="text-3xl font-bold text-orange-600">{thanks.filter(t => t.message && t.message.trim() !== '').length}</p></div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-pink-500" />月別ポイント獲得グラフ（総合）</h3>
                <div className="flex items-center gap-2"><button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft className="w-5 h-5" /></button><span className="font-medium min-w-32 text-center">{formatMonth(chartMonth)}</span><button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded"><ChevronRight className="w-5 h-5" /></button></div>
              </div>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getMonthlyChartData()} margin={{ top: 20, right: 30, left: 0, bottom: 60 }} barCategoryGap="15%">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value) => [value + ' ポイント', '獲得数']} labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label} />
                    <Bar dataKey="points" radius={[4,4,0,0]} maxBarSize={40}>{getMonthlyChartData().map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-orange-500" />月別ポイント獲得グラフ（コメント付のみ）</h3>
                <div className="flex items-center gap-2"><button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded"><ChevronLeft className="w-5 h-5" /></button><span className="font-medium min-w-32 text-center">{formatMonth(chartMonth)}</span><button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded"><ChevronRight className="w-5 h-5" /></button></div>
              </div>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getMonthlyChartDataWithComment()} margin={{ top: 20, right: 30, left: 0, bottom: 60 }} barCategoryGap="15%">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value) => [value + ' ポイント', '獲得数']} labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label} />
                    <Bar dataKey="points" radius={[4,4,0,0]} maxBarSize={40}>{getMonthlyChartDataWithComment().map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5 text-green-500" />期間指定ポイント獲得グラフ</h3>
              </div>
              <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">期間:</label>
                  <select className="p-2 border rounded text-sm" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
                    <option value="all">全期間</option>
                    <option value="week">今週</option>
                    <option value="month">今月</option>
                    <option value="year">今年</option>
                    <option value="custom">期間指定</option>
                  </select>
                </div>
                {periodFilter === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input type="date" className="p-2 border rounded text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <span className="text-gray-400">〜</span>
                    <input type="date" className="p-2 border rounded text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">種別:</label>
                  <select className="p-2 border rounded text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                    <option value="total">総合ポイント</option>
                    <option value="withComment">コメント付きポイント</option>
                  </select>
                </div>
              </div>
              <div className="text-sm text-gray-500 mb-2">表示期間: {getPeriodLabel()} / 種別: {typeFilter === 'total' ? '総合ポイント' : 'コメント付きポイント'}</div>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getPeriodChartData()} margin={{ top: 20, right: 30, left: 0, bottom: 60 }} barCategoryGap="15%">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-45} textAnchor="end" height={60} />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value) => [value + ' ポイント', '獲得数']} labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label} />
                    <Bar dataKey="points" radius={[4,4,0,0]} maxBarSize={40}>{getPeriodChartData().map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-pink-500" />ポイント獲得ランキング</h3>
              <div className="space-y-3">
                {ranked.map((e, i) => (
                  <div key={e.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-300'}`}>{i + 1}</div>
                      <div className="flex-1"><p className="font-medium">{e.name}</p><p className="text-sm text-gray-500">{e.department || '-'}</p></div>
                      <div className="text-right"><p className="text-2xl font-bold text-pink-600">{e.points}</p><p className="text-xs text-gray-400">ポイント</p></div>
                    </div>
                    {e.receivedDetails.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">もらった詳細:</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {e.receivedDetails.map((detail, idx) => <div key={idx} className="text-xs bg-pink-50 p-2 rounded flex items-start gap-2"><span className="text-pink-700 font-medium whitespace-nowrap">{getName(detail.from)}</span><span className="text-gray-400 whitespace-nowrap">{detail.date}</span><span className="text-gray-600 flex-1">{detail.message || '－'}</span></div>)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Heart className="w-5 h-5 text-orange-500" />ポイント提供ランキング</h3>
              <div className="space-y-3">
                {givenRanked.map((e, i) => (
                  <div key={e.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-300'}`}>{i + 1}</div>
                      <div className="flex-1"><p className="font-medium">{e.name}</p><p className="text-sm text-gray-500">{e.department || '-'}</p></div>
                      <div className="text-right"><p className="text-2xl font-bold text-orange-600">{e.points}</p><p className="text-xs text-gray-400">ポイント</p></div>
                    </div>
                    {e.givenDetails.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">あげた詳細:</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {e.givenDetails.map((detail, idx) => <div key={idx} className="text-xs bg-orange-50 p-2 rounded flex items-start gap-2"><span className="text-orange-700 font-medium whitespace-nowrap">{getName(detail.to)}</span><span className="text-gray-400 whitespace-nowrap">{detail.date}</span><span className="text-gray-600 flex-1">{detail.message || '－'}</span></div>)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {adminTab === 'employees' && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2"><UserPlus className="w-5 h-5" />社員追加</h3>
            <p className="text-sm text-gray-500 mb-4">初期パスワードは pass123 です。社員は初回ログイン時にパスワードを変更できます。</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 mb-6">
              <input type="text" placeholder="氏名 *" className="p-2 border rounded" value={newEmployee.name} onChange={(e) => setNewEmployee({...newEmployee, name: e.target.value})} />
              <input type="text" placeholder="部署" className="p-2 border rounded" value={newEmployee.department} onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})} />
              <input type="email" placeholder="メールアドレス *" className="p-2 border rounded" value={newEmployee.email} onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})} />
              <input type="text" placeholder="パスワード *" className="p-2 border rounded" value={newEmployee.password} onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})} />
              <button onClick={addEmployee} className="px-4 py-2 bg-gray-800 text-white rounded flex items-center justify-center gap-2"><Plus className="w-5 h-5" />追加</button>
            </div>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Users className="w-5 h-5" />社員一覧</h3>
            <div className="space-y-2">
              {employees.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2"><p className="font-medium">{e.name}</p><p className="text-sm text-gray-500">{e.department || '-'}</p><p className="text-sm text-gray-500">{e.email}</p><p className="text-sm text-gray-400">●●●●●●</p></div>
                  <button onClick={() => deleteEmployee(e.id)} className="p-2 text-red-500 hover:bg-red-50 rounded ml-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {adminTab === 'history' && (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-gray-800 flex items-center gap-2"><Calendar className="w-5 h-5" />サンキュー履歴詳細</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <select className="p-2 border rounded" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}><option value="all">全期間</option><option value="week">今週</option><option value="month">今月</option><option value="year">今年</option></select>
                <button onClick={exportToCSV} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded text-sm"><Download className="w-4 h-4" />CSVエクスポート</button>
                <label className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded text-sm cursor-pointer"><Upload className="w-4 h-4" />CSVインポート<input type="file" accept=".csv" onChange={importFromCSV} className="hidden" /></label>
              </div>
            </div>
            <div className="mb-4 p-3 bg-gray-50 rounded text-xs text-gray-600"><p className="font-medium mb-1">CSVフォーマット:</p><p>日付, 送信者名, 送信者メール, 受信者名, 受信者メール, メッセージ</p></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50"><tr><th className="p-3 text-left text-sm font-medium text-gray-600">日付</th><th className="p-3 text-left text-sm font-medium text-gray-600">送信者</th><th className="p-3 text-left text-sm font-medium text-gray-600">受信者</th><th className="p-3 text-left text-sm font-medium text-gray-600">メッセージ</th></tr></thead>
                <tbody>{filtered.map(t => <tr key={t.id} className="border-t"><td className="p-3 text-sm">{t.date}</td><td className="p-3 text-sm">{getName(t.from)}</td><td className="p-3 text-sm font-medium text-pink-600">{getName(t.to)}</td><td className="p-3 text-sm text-gray-600">{t.message || '－'}</td></tr>)}</tbody>
              </table>
              {filtered.length === 0 && <p className="text-center text-gray-400 py-8">該当期間のデータがありません</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
