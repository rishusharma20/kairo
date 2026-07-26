"use client";

import { useState } from "react";
import { fetchUsersAction, performAdminAction } from "./actions";
import { Search, MoreVertical, X, AlertTriangle, Loader2, User as UserIcon, Crown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const PLANS = ["FREE", "PREMIUM_7_DAYS", "PREMIUM_30_DAYS"];

type UserType = {
  id: string;
  full_name: string;
  email: string;
  plan: string;
  status: string;
  daily_limit: number;
  requests_used: number;
  created_at: string;
  plan_expires_at?: string | null;
};

export function UsersClient({ initialUsers }: { initialUsers: UserType[] }) {
  const [users, setUsers] = useState<UserType[]>(initialUsers);
  
  // Search State
  const [emailQuery, setEmailQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Modal State
  const [viewUser, setViewUser] = useState<UserType | null>(null);
  const [actionModal, setActionModal] = useState<{ type: string; user: UserType; targetPlan?: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Change Tier Form State
  const [selectedPlan, setSelectedPlan] = useState<string>("FREE");

  // Handlers
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    try {
      const results = await fetchUsersAction({
        email: emailQuery || undefined,
        status: statusFilter || undefined,
        plan: planFilter || undefined,
      });
      setUsers(results);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const executeAction = async () => {
    if (!actionModal) return;
    setIsProcessing(true);
    setErrorMsg("");
    
    try {
      const targetPlan = actionModal.type === 'change_tier' ? selectedPlan : actionModal.targetPlan;
      
      const result = await performAdminAction(
        actionModal.user.id, 
        actionModal.type as "block" | "unblock" | "delete" | "change_tier",
        { targetPlan }
      );
      // Update local state smoothly
      setUsers(prev => prev.map(u => (u.id === actionModal.user.id ? { ...u, ...result } : u)));
      if (viewUser && viewUser.id === actionModal.user.id) {
        setViewUser(prev => prev ? { ...prev, ...result } : null);
      }
      setActionModal(null);
    } catch (error: unknown) {
      setErrorMsg((error as Error).message || "An error occurred during this action.");
    } finally {
      setIsProcessing(false);
    }
  };

  const openChangeTierModal = (user: UserType) => {
    const currentIdx = PLANS.indexOf(user.plan);
    const defaultTarget = currentIdx < PLANS.length - 1 ? PLANS[currentIdx + 1] : PLANS[currentIdx - 1];
    setSelectedPlan(defaultTarget);
    setActionModal({ type: 'change_tier', user });
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <section className="space-y-2 pb-6 border-b border-[var(--border)]">
        <h1 className="heading-md">User Management</h1>
        <p className="text-text-muted">Search, view, and administer platform accounts.</p>
      </section>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 items-center w-full p-4 glass rounded-2xl border border-[var(--border)]">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search by email..."
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            className="w-full bg-[var(--surface)]/50 border border-[var(--border)] rounded-lg py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-accent text-text-primary placeholder:text-text-muted/50"
          />
        </div>
        
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto bg-[var(--surface)]/50 border border-[var(--border)] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-accent text-text-primary"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="BLOCKED">Blocked</option>
          <option value="DELETED">Deleted</option>
        </select>
        
        <select 
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="w-full sm:w-auto bg-[var(--surface)]/50 border border-[var(--border)] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-accent text-text-primary"
        >
          <option value="">All Plans</option>
          {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <button 
          type="submit" 
          disabled={isSearching}
          className="w-full sm:w-auto px-4 py-2 bg-[var(--surface)] border border-[var(--border)] hover:border-accent/50 hover:bg-accent/5 text-text-primary text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 min-w-[100px]"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
        </button>
      </form>

      {/* Users List (Responsive) */}
      <div className="glass border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="hidden lg:block w-full overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface)]/50 text-text-muted">
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">User</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Plan</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px]">Daily Usage</th>
                <th className="px-6 py-4 font-medium uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-text-muted">
                    No users found matching your search.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--surface)]/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-text-primary truncate max-w-[200px]">{user.full_name}</span>
                        <span className="text-xs text-text-muted truncate max-w-[200px]">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                        user.plan !== 'FREE' ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-[var(--surface)] text-text-muted border border-[var(--border)]'
                      }`}>
                        {user.plan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          user.status === 'ACTIVE' ? 'bg-success' : user.status === 'BLOCKED' ? 'bg-warning' : 'bg-destructive'
                        }`} />
                        <span className="text-xs font-medium text-text-primary">{user.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {user.requests_used} / {user.daily_limit}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setViewUser(user)}
                        className="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Cards */}
        <div className="lg:hidden flex flex-col divide-y divide-[var(--border)]">
          {users.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              No users found matching your search.
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-4 space-y-3 hover:bg-[var(--surface)]/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium text-text-primary truncate">{user.full_name}</span>
                    <span className="text-xs text-text-muted truncate">{user.email}</span>
                  </div>
                  <button onClick={() => setViewUser(user)} className="p-1 rounded-md bg-[var(--surface)] border border-[var(--border)] text-text-muted shrink-0">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                    user.plan !== 'FREE' ? 'bg-accent/10 text-accent border border-accent/20' : 'bg-[var(--surface)] text-text-muted border border-[var(--border)]'
                  }`}>
                    {user.plan}
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      user.status === 'ACTIVE' ? 'bg-success' : user.status === 'BLOCKED' ? 'bg-warning' : 'bg-destructive'
                    }`} />
                    <span className="text-xs font-medium text-text-primary">{user.status}</span>
                  </div>

                  <span className="text-xs text-text-muted ml-auto">
                    {user.requests_used}/{user.daily_limit} reqs
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* View User Details Modal */}
      <AnimatePresence>
        {viewUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg glass border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface)]/50">
                <h3 className="font-semibold text-text-primary flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-text-muted" /> User Details
                </h3>
                <button onClick={() => setViewUser(null)} className="text-text-muted hover:text-text-primary">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                
                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Full Name</span>
                    <p className="text-sm font-medium text-text-primary break-words">{viewUser.full_name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Email</span>
                    <p className="text-sm font-medium text-text-primary break-all">{viewUser.email}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Plan</span>
                    <p className="text-sm font-bold mt-1">
                      <span className={viewUser.plan !== 'FREE' ? 'text-accent' : 'text-text-muted'}>{viewUser.plan}</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Expires At</span>
                    <p className="text-sm font-medium mt-1 text-text-primary">
                      {viewUser.plan_expires_at ? new Date(viewUser.plan_expires_at).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Usage Today</span>
                    <p className="text-sm font-medium text-text-primary">{viewUser.requests_used} / {viewUser.daily_limit}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">Account Created</span>
                    <p className="text-sm font-medium text-text-primary">{new Date(viewUser.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <hr className="border-[var(--border)]" />

                {/* Actions Grid */}
                <div className="space-y-3">
                  <h4 className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-4">Administrative Actions</h4>
                  
                  {/* Change Tier Button */}
                  {viewUser.status !== "DELETED" && (
                    <button 
                      onClick={() => openChangeTierModal(viewUser)}
                      className="w-full px-4 py-3 bg-accent/10 text-accent border border-accent/20 rounded-xl text-sm font-medium hover:bg-accent/20 transition-colors flex items-center justify-center gap-2 mb-4"
                    >
                      <Crown className="w-4 h-4" />
                      Manage Subscription Tier
                    </button>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Status Actions */}
                    {viewUser.status === "ACTIVE" && (
                      <button 
                        onClick={() => setActionModal({ type: 'block', user: viewUser })}
                        className="px-4 py-2 bg-warning/10 text-warning border border-warning/20 rounded-lg text-xs font-medium hover:bg-warning/20 transition-colors"
                      >
                        Block User
                      </button>
                    )}
                    {viewUser.status === "BLOCKED" && (
                      <button 
                        onClick={() => setActionModal({ type: 'unblock', user: viewUser })}
                        className="px-4 py-2 bg-success/10 text-success border border-success/20 rounded-lg text-xs font-medium hover:bg-success/20 transition-colors"
                      >
                        Unblock User
                      </button>
                    )}
                    {viewUser.status !== "DELETED" && (
                      <button 
                        onClick={() => setActionModal({ type: 'delete', user: viewUser })}
                        className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors"
                      >
                        Delete User
                      </button>
                    )}
                    {viewUser.status === "DELETED" && (
                      <p className="text-xs text-destructive col-span-full border border-destructive/20 bg-destructive/10 p-2 rounded text-center">
                        User is DELETED. Restoration is not supported.
                      </p>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {actionModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm glass border border-[var(--border)] rounded-2xl overflow-hidden p-6 space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-full border ${
                  actionModal.type === 'delete' ? 'bg-destructive/10 border-destructive/20 text-destructive' :
                  actionModal.type === 'block' ? 'bg-warning/10 border-warning/20 text-warning' :
                  'bg-accent/10 border-accent/20 text-accent'
                }`}>
                  <AlertTriangle className="w-8 h-8" />
                </div>
                
                <div className="w-full">
                  <h3 className="text-lg font-semibold text-text-primary capitalize">
                    {actionModal.type.replace('_', ' ')}
                  </h3>

                  {actionModal.type === 'change_tier' ? (
                    <div className="mt-4 space-y-4 text-left">
                      <div className="space-y-1.5">
                        <label className="text-xs text-text-muted">Target Tier</label>
                        <select 
                          value={selectedPlan}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedPlan(val);
                            setActionModal({ ...actionModal, targetPlan: val });
                          }}
                          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-accent text-text-primary"
                        >
                          {PLANS.map((plan) => (
                            <option key={plan} value={plan}>{plan.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-text-muted mt-2">
                        Are you sure you want to {actionModal.type} <span className="font-bold text-text-primary">{actionModal.user.email}</span>?
                      </p>
                      {actionModal.type === 'block' && (
                        <p className="text-xs text-warning mt-2 bg-warning/5 p-2 rounded border border-warning/10">
                          Active sessions will be terminated and all keys will be released.
                        </p>
                      )}
                      {actionModal.type === 'delete' && (
                        <p className="text-xs text-destructive mt-2 bg-destructive/5 p-2 rounded border border-destructive/10">
                          This action is permanent and cannot be reversed.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center">
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => { setActionModal(null); setErrorMsg(""); }}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-2 bg-[var(--surface)] text-text-primary text-sm font-medium rounded-lg border border-[var(--border)] hover:bg-[var(--surface)]/80 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={executeAction}
                  disabled={isProcessing}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                    actionModal.type === 'delete' ? 'bg-destructive/20 text-destructive hover:bg-destructive/30' :
                    actionModal.type === 'block' ? 'bg-warning/20 text-warning hover:bg-warning/30' :
                    'bg-accent/20 text-accent hover:bg-accent/30'
                  }`}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
