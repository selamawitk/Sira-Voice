import React, { useCallback, useEffect, useState, useContext } from 'react';
import api from '../../services/api.js';
import { LanguageContext } from '../../context/LanguageContextInstance.jsx';
import { ToastContext } from '../../components/ui/ToastContextInstance.jsx';
import { Loader2, Search, ShieldCheck, ShieldOff, CheckCircle, XCircle, AlertTriangle, UserCheck, UserX } from 'lucide-react';

const GlassCard = ({ children, className = '' }) => (
  <div className={`bg-white/[0.03] border border-white/10 rounded-3xl p-4 md:p-6 backdrop-blur-md ${className}`}>
    {children}
  </div>
);

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, loading }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-[#1A2E35] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-amber-400" />
          <h3 className="text-white font-black text-lg">{title}</h3>
        </div>
        <p className="text-white/70 text-sm mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 transition-all disabled:opacity-50"
          >
            {loading ? '...' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-[#2BB8B8] text-slate-950 font-black text-sm hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RoleBadge = ({ role }) => {
  const colors = {
    worker: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    employer: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    admin: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  };
  return (
    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${colors[role] || colors.worker}`}>
      {role}
    </span>
  );
};

const StatusBadge = ({ active, verified }) => {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {active !== false ? (
        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 border border-green-400/30 flex items-center gap-1">
          <CheckCircle className="w-2.5 h-2.5" /> Active
        </span>
      ) : (
        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-400/30 flex items-center gap-1">
          <XCircle className="w-2.5 h-2.5" /> Suspended
        </span>
      )}
      {verified ? (
        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2BB8B8]/20 text-[#2BB8B8] border border-[#2BB8B8]/30 flex items-center gap-1">
          <CheckCircle className="w-2.5 h-2.5" /> Verified
        </span>
      ) : null}
    </div>
  );
};

const Users = () => {
  const lang = useContext(LanguageContext);
  const toast = useContext(ToastContext);
  const activeLang = lang?.lang || 'en';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (roleFilter) params.role = roleFilter;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data?.data ?? []);
      setTotalPages(res.data?.pages ?? 1);
      setTotal(res.data?.total ?? 0);
    } catch (err) {
      toast?.show?.(err?.response?.data?.message || 'Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, roleFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const performAction = async (userId, action) => {
    setActionLoading(userId);
    setConfirm(null);
    try {
      const endpoint = `/admin/users/${userId}/${action}`;
      const res = await api.patch(endpoint);
      toast?.show?.(res.data?.message || `User ${action}ed successfully`, 'success');
      fetchUsers();
    } catch (err) {
      toast?.show?.(err?.response?.data?.message || `Failed to ${action} user`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const getConfirmation = (user, action) => {
    const labels = {
      suspend: { title: activeLang === 'am' ? 'ተጠቃሚውን ያግዱ' : activeLang === 'or' ? 'Fayyadamaa Dhaabi' : 'Suspend User', message: `Are you sure you want to suspend ${user.fullName}?` },
      activate: { title: activeLang === 'am' ? 'ተጠቃሚውን ያንቁ' : activeLang === 'or' ? "Fayyadamaa Socho'i" : 'Activate User', message: `Activate ${user.fullName}?` },
      verify: { title: activeLang === 'am' ? 'ያረጋግጡ' : activeLang === 'or' ? 'Mirkaneessi' : 'Verify User', message: `Verify ${user.fullName}?` },
      unverify: { title: activeLang === 'am' ? 'ይቅር' : activeLang === 'or' ? 'Mirkaneessa Haqi' : 'Unverify User', message: `Unverify ${user.fullName}?` },
    };
    return labels[action] || labels.suspend;
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      <ConfirmDialog
        open={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        loading={actionLoading === confirm?.userId}
        onConfirm={() => performAction(confirm?.userId, confirm?.action)}
        onCancel={() => setConfirm(null)}
      />

      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-semibold text-white/90">
          {activeLang === 'am' ? 'የተጠቃሚዎች አስተዳደር' : activeLang === 'or' ? 'Bulchiinsa Fayyadamtootaa' : 'User Management'}
        </h1>
        <p className="text-white/50 text-sm mt-1 font-medium">
          {activeLang === 'am' ? 'ተጠቃሚዎችን ያስተዳድሩ፣ ያግዱ እና ያረጋግጡ' : activeLang === 'or' ? 'Fayyadamtoota bulchi, dhaabi fi mirkaneessi' : 'Manage, suspend, and verify users'}
        </p>
      </div>

      <GlassCard>
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeLang === 'am' ? 'ተጠቃሚዎችን ይፈልጉ...' : activeLang === 'or' ? 'Fayyadamtoota barbaadi...' : 'Search users...'}
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-white text-sm outline-none focus:border-[#2BB8B8]/40 transition-all placeholder:text-white/30"
              aria-label="Search users"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white text-sm outline-none focus:border-[#2BB8B8]/40 transition-all"
            aria-label="Filter by role"
          >
            <option value="" className="bg-[#1A2E35]">{activeLang === 'am' ? 'ሁሉም ሚናዎች' : activeLang === 'or' ? 'Gahee Hunda' : 'All Roles'}</option>
            <option value="worker" className="bg-[#1A2E35]">{activeLang === 'am' ? 'ሰራተኞች' : activeLang === 'or' ? 'Hojjettoota' : 'Workers'}</option>
            <option value="employer" className="bg-[#1A2E35]">{activeLang === 'am' ? 'አሰሪዎች' : activeLang === 'or' ? 'Qaxartoota' : 'Employers'}</option>
            <option value="admin" className="bg-[#1A2E35]">Admin</option>
          </select>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-[#2BB8B8] animate-spin" />
            <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
              {activeLang === 'am' ? 'በመጫን ላይ...' : activeLang === 'or' ? 'Fe\'aa jira...' : 'Loading users...'}
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center">
            <UserCheck className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/50 font-bold">
              {activeLang === 'am' ? 'ምንም ተጠቃሚዎች አልተገኙም' : activeLang === 'or' ? 'Fayyadamtoonni argame hin jiran' : 'No users found'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest">
                    <th className="pb-3 pr-4">{activeLang === 'am' ? 'ስም' : activeLang === 'or' ? 'Maqaa' : 'Name'}</th>
                    <th className="pb-3 pr-4">{activeLang === 'am' ? 'ኢሜይል' : activeLang === 'or' ? 'Imeelii' : 'Email'}</th>
                    <th className="pb-3 pr-4">{activeLang === 'am' ? 'ሚና' : activeLang === 'or' ? 'Gahee' : 'Role'}</th>
                    <th className="pb-3 pr-4">{activeLang === 'am' ? 'ሁኔታ' : activeLang === 'or' ? 'Haala' : 'Status'}</th>
                    <th className="pb-3">{activeLang === 'am' ? 'ድርጊት' : activeLang === 'or' ? 'Gocha' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 pr-4">
                        <p className="text-white font-bold text-sm truncate max-w-[180px]">{u.fullName}</p>
                        <p className="text-white/30 text-[10px]">{u.phone || '—'}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <p className="text-white/70 text-sm truncate max-w-[200px]">{u.email || '—'}</p>
                      </td>
                      <td className="py-4 pr-4"><RoleBadge role={u.role} /></td>
                      <td className="py-4 pr-4"><StatusBadge active={u.isActive} verified={u.isVerified} /></td>
                      <td className="py-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {u.isActive !== false ? (
                            <button onClick={() => setConfirm({ ...getConfirmation(u, 'suspend'), userId: u._id, action: 'suspend' })}
                              disabled={actionLoading === u._id}
                              className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-all disabled:opacity-50"
                              aria-label={`Suspend ${u.fullName}`}
                              title="Suspend">
                              <ShieldOff className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => setConfirm({ ...getConfirmation(u, 'activate'), userId: u._id, action: 'activate' })}
                              disabled={actionLoading === u._id}
                              className="p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 hover:bg-green-500/20 transition-all disabled:opacity-50"
                              aria-label={`Activate ${u.fullName}`}
                              title="Activate">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {u.isVerified ? (
                            <button onClick={() => setConfirm({ ...getConfirmation(u, 'unverify'), userId: u._id, action: 'unverify' })}
                              disabled={actionLoading === u._id}
                              className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                              aria-label={`Unverify ${u.fullName}`}
                              title="Unverify">
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => setConfirm({ ...getConfirmation(u, 'verify'), userId: u._id, action: 'verify' })}
                              disabled={actionLoading === u._id}
                              className="p-2 rounded-lg bg-[#2BB8B8]/10 border border-[#2BB8B8]/20 text-[#2BB8B8] hover:bg-[#2BB8B8]/20 transition-all disabled:opacity-50"
                              aria-label={`Verify ${u.fullName}`}
                              title="Verify">
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {users.map((u) => (
                <div key={u._id} className="bg-[#1A2E35]/70 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-white font-bold text-sm truncate">{u.fullName}</p>
                      <p className="text-white/40 text-[10px] truncate">{u.email || u.phone || '—'}</p>
                    </div>
                    <RoleBadge role={u.role} />
                  </div>
                  <div className="mb-3">
                    <StatusBadge active={u.isActive} verified={u.isVerified} />
                  </div>
                  <div className="flex gap-2">
                    {u.isActive !== false ? (
                      <button onClick={() => setConfirm({ ...getConfirmation(u, 'suspend'), userId: u._id, action: 'suspend' })}
                        disabled={actionLoading === u._id}
                        className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[10px] font-black uppercase tracking-wider hover:bg-red-500/20 transition-all disabled:opacity-50"
                      >Suspend</button>
                    ) : (
                      <button onClick={() => setConfirm({ ...getConfirmation(u, 'activate'), userId: u._id, action: 'activate' })}
                        disabled={actionLoading === u._id}
                        className="flex-1 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 text-[10px] font-black uppercase tracking-wider hover:bg-green-500/20 transition-all disabled:opacity-50"
                      >Activate</button>
                    )}
                    {u.isVerified ? (
                      <button onClick={() => setConfirm({ ...getConfirmation(u, 'unverify'), userId: u._id, action: 'unverify' })}
                        disabled={actionLoading === u._id}
                        className="flex-1 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider hover:bg-amber-500/20 transition-all disabled:opacity-50"
                      >Unverify</button>
                    ) : (
                      <button onClick={() => setConfirm({ ...getConfirmation(u, 'verify'), userId: u._id, action: 'verify' })}
                        disabled={actionLoading === u._id}
                        className="flex-1 py-2 rounded-xl bg-[#2BB8B8]/10 border border-[#2BB8B8]/20 text-[#2BB8B8] text-[10px] font-black uppercase tracking-wider hover:bg-[#2BB8B8]/20 transition-all disabled:opacity-50"
                      >Verify</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <p className="text-white/30 text-xs">{total} {activeLang === 'am' ? 'ተጠቃሚዎች' : activeLang === 'or' ? 'fayyadamtoota' : 'users'} — {activeLang === 'am' ? 'ገጽ' : activeLang === 'or' ? 'Fuula' : 'Page'} {page} / {totalPages}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all disabled:opacity-30"
                  >← Prev</button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-bold hover:bg-white/10 transition-all disabled:opacity-30"
                  >Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>
    </div>
  );
};

export default Users;
