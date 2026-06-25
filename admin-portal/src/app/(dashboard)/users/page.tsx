'use client';
import { useEffect, useState } from 'react';
import { Search, ChevronRight, Users, User, Building2, Tag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getUsers, toggleUserPromoApplicable } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { User as IUser } from '@/types';

type Tab = 'individual' | 'corporate';

export default function CustomersPage() {
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('individual');
  const [toggling, setToggling] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    getUsers()
      .then((r) => setAllUsers(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  const handlePromoToggle = async (e: React.MouseEvent, u: IUser) => {
    e.stopPropagation();
    setToggling(u._id);
    setAllUsers((prev) => prev.map((x) => x._id === u._id ? { ...x, promoApplicable: !x.promoApplicable } : x));
    try { await toggleUserPromoApplicable(u._id); } catch { setAllUsers((prev) => prev.map((x) => x._id === u._id ? { ...x, promoApplicable: u.promoApplicable } : x)); }
    setToggling(null);
  };

  const users = allUsers.filter((u) => (u.accountType || 'individual') === tab);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s) || u.phone.includes(s);
  });

  const individualCount = allUsers.filter((u) => (u.accountType || 'individual') === 'individual').length;
  const corporateCount = allUsers.filter((u) => u.accountType === 'corporate').length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
        <p className="text-slate-500 text-sm mt-1">{allUsers.length} registered customers</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{allUsers.length}</p>
            <p className="text-xs text-slate-500">Total Customers</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <User className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{individualCount}</p>
            <p className="text-xs text-slate-500">Individual</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{corporateCount}</p>
            <p className="text-xs text-slate-500">Corporate</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-5">
        <button
          onClick={() => { setTab('individual'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'individual' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <User className="w-4 h-4" />
          Individual
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${tab === 'individual' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'}`}>
            {individualCount}
          </span>
        </button>
        <button
          onClick={() => { setTab('corporate'); setSearch(''); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'corporate' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Corporate
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${tab === 'corporate' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
            {corporateCount}
          </span>
        </button>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 h-9 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Customer', 'Email', 'Phone', ...(tab === 'corporate' ? ['GST Number'] : []), 'Joined', 'Status', 'Promo', ''].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={tab === 'corporate' ? 8 : 7} className="px-4 py-10 text-center text-slate-400">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={tab === 'corporate' ? 8 : 7} className="px-4 py-10 text-center text-slate-400">No {tab} customers found.</td></tr>
            ) : (
              filtered.map((u) => (
                <tr
                  key={u._id}
                  onClick={() => router.push(`/users/${u._id}`)}
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tab === 'corporate' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                        <span className={`text-xs font-semibold ${tab === 'corporate' ? 'text-amber-700' : 'text-blue-700'}`}>{u.name?.[0]?.toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-slate-900">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3 text-slate-600">{u.phone}</td>
                  {tab === 'corporate' && (
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{u.gstNumber || '—'}</td>
                  )}
                  <td className="px-4 py-3 text-slate-500">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => handlePromoToggle(e, u)}
                      disabled={toggling === u._id}
                      title={u.promoApplicable !== false ? 'Disable promos for this user' : 'Enable promos for this user'}
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${u.promoApplicable !== false ? 'bg-violet-100 text-violet-700 hover:bg-violet-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    >
                      <Tag className="w-3 h-3" />
                      {u.promoApplicable !== false ? 'Eligible' : 'Blocked'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
