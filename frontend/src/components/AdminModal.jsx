import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  Search,
  UserCheck,
  Clock,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export default function AdminModal({ isOpen, onClose, currentUserId, onUserUpdated }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [filterTab, setFilterTab] = useState('pending'); // 'pending', 'approved', 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsers = async () => {
    const token = localStorage.getItem('chat_session_token');
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to load users');
      }
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setSuccessMsg('');

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleUpdateStatus = async (userId, newStatus) => {
    const token = localStorage.getItem('chat_session_token');
    if (!token) return;
    setActionLoading(userId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || `Failed to update status to ${newStatus}`);
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
      setSuccessMsg(`User status updated to "${newStatus}"`);
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const nextRole = currentRole === 'admin' ? 'user' : 'admin';
    const confirmMsg = `Are you sure you want to change this user's role to ${nextRole.toUpperCase()}?`;
    if (!window.confirm(confirmMsg)) return;

    const token = localStorage.getItem('chat_session_token');
    if (!token) return;
    setActionLoading(userId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: nextRole })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update role');
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
      );
      setSuccessMsg(`Role updated to ${nextRole.toUpperCase()}`);
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Permanently delete user "${username}" and all their conversations?`)) return;

    const token = localStorage.getItem('chat_session_token');
    if (!token) return;
    setActionLoading(userId);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to delete user');
      }
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setSuccessMsg(`User "${username}" deleted`);
      if (onUserUpdated) onUserUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = users.filter((u) => u.status === 'pending').length;
  const approvedCount = users.filter((u) => u.status === 'approved').length;

  const filteredUsers = users.filter((u) => {
    if (filterTab === 'pending' && u.status !== 'pending') return false;
    if (filterTab === 'approved' && u.status !== 'approved') return false;
    if (searchQuery.trim()) {
      return u.username.toLowerCase().includes(searchQuery.trim().toLowerCase());
    }
    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(4px)', background: 'rgba(15, 23, 42, 0.4)', animation: 'none' }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '840px',
          width: '92%',
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          animation: 'none',
          transform: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Crisp Enterprise Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid #e2e8f0',
            background: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#eff6ff',
                border: '1px solid #dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <ShieldCheck size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>
                User Management &amp; Access Control
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
                Manage user approval status, authentication roles, and platform permissions
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={fetchUsers}
              title="Refresh users"
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Close"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Notifications */}
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                color: '#b91c1c',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}
          {successMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '6px',
                background: '#f0fdf4',
                border: '1px solid #dcfce7',
                color: '#15803d',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

        {/* Controls Bar: Tabs & Search */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '14px'
          }}
        >
          {/* Segmented Filter Control */}
          <div
            style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              gap: '2px'
            }}
          >
            <button
              type="button"
              onClick={() => setFilterTab('pending')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filterTab === 'pending' ? '#cbd5e1' : 'transparent',
                background: filterTab === 'pending' ? '#ffffff' : 'transparent',
                color: filterTab === 'pending' ? '#0f172a' : '#64748b',
                fontWeight: 500,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: filterTab === 'pending' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease'
              }}
            >
              <span>Pending Review</span>
              {pendingCount > 0 && (
                <span
                  style={{
                    background: '#dc2626',
                    color: '#fff',
                    borderRadius: '9999px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 600
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('approved')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filterTab === 'approved' ? '#cbd5e1' : 'transparent',
                background: filterTab === 'approved' ? '#ffffff' : 'transparent',
                color: filterTab === 'approved' ? '#0f172a' : '#64748b',
                fontWeight: 500,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: filterTab === 'approved' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease'
              }}
            >
              <span>Active Accounts</span>
              <span style={{ color: '#94a3b8', fontSize: '12px' }}>({approvedCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('all')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: filterTab === 'all' ? '#cbd5e1' : 'transparent',
                background: filterTab === 'all' ? '#ffffff' : 'transparent',
                color: filterTab === 'all' ? '#0f172a' : '#64748b',
                fontWeight: 500,
                fontSize: '13px',
                cursor: 'pointer',
                boxShadow: filterTab === 'all' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                transition: 'background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease'
              }}
            >
              <span>All ({users.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', minWidth: '220px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8'
              }}
            />
            <input
              type="text"
              placeholder="Search by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6.5px 12px 6.5px 30px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
                background: '#ffffff',
                color: '#0f172a',
                transition: 'border-color 0.15s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
            />
          </div>
        </div>

        {/* User Table Scroll Area */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            minHeight: '260px',
            background: '#ffffff'
          }}
        >
          {loading && users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b', fontSize: '13.5px' }}>
              Loading user accounts...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '52px 0', color: '#64748b', fontSize: '13.5px' }}>
              {filterTab === 'pending'
                ? 'No pending users awaiting approval.'
                : 'No users found matching query.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>User</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
                  <th style={{ padding: '10px 14px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Created</th>
                  <th style={{ padding: '10px 16px', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isPending = u.status === 'pending';
                  const isApproved = u.status === 'approved';
                  const isRejected = u.status === 'rejected';

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.1s ease'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#fafbfc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* User Info */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: u.role === 'admin' ? '#2563eb' : '#f1f5f9',
                              border: u.role === 'admin' ? '1px solid #1d4ed8' : '1px solid #e2e8f0',
                              color: u.role === 'admin' ? '#ffffff' : '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13px'
                            }}
                          >
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{u.username}</span>
                              {isSelf && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    color: '#475569',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    fontWeight: 600
                                  }}
                                >
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11.5px', color: '#94a3b8', fontFamily: 'monospace' }}>{u.id}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          type="button"
                          onClick={() => !isSelf && handleToggleRole(u.id, u.role)}
                          disabled={isSelf || actionLoading === u.id}
                          title={isSelf ? 'Cannot change own role' : `Click to change to ${u.role === 'admin' ? 'user' : 'admin'}`}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            cursor: isSelf ? 'default' : 'pointer',
                            background: u.role === 'admin' ? '#eff6ff' : '#f8fafc',
                            borderColor: u.role === 'admin' ? '#bfdbfe' : '#e2e8f0',
                            color: u.role === 'admin' ? '#1d4ed8' : '#475569'
                          }}
                        >
                          {u.role.toUpperCase()}
                        </button>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            border: '1px solid',
                            background: isApproved
                              ? '#f0fdf4'
                              : isPending
                              ? '#fffbeb'
                              : '#fef2f2',
                            borderColor: isApproved
                              ? '#bbf7d0'
                              : isPending
                              ? '#fde68a'
                              : '#fecaca',
                            color: isApproved
                              ? '#15803d'
                              : isPending
                              ? '#b45309'
                              : '#b91c1c'
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: isApproved ? '#16a34a' : isPending ? '#d97706' : '#dc2626'
                            }}
                          />
                          <span style={{ textTransform: 'capitalize' }}>{u.status}</span>
                        </span>
                      </td>

                      {/* Created At */}
                      <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12.5px' }}>
                        {new Date(u.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {isPending && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(u.id, 'approved')}
                              disabled={actionLoading === u.id}
                              title="Approve user registration"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                border: '1px solid #15803d',
                                background: '#16a34a',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Approve</span>
                            </button>
                          )}

                          {isApproved && !isSelf && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(u.id, 'rejected')}
                              disabled={actionLoading === u.id}
                              title="Suspend or reject user"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#475569',
                                fontSize: '12px',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#fef2f2';
                                e.currentTarget.style.borderColor = '#fecaca';
                                e.currentTarget.style.color = '#dc2626';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                                e.currentTarget.style.color = '#475569';
                              }}
                            >
                              <XCircle size={13} />
                              <span>Suspend</span>
                            </button>
                          )}

                          {isRejected && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(u.id, 'approved')}
                              disabled={actionLoading === u.id}
                              title="Re-approve user"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #2563eb',
                                background: '#2563eb',
                                color: '#ffffff',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Re-approve</span>
                            </button>
                          )}

                          {!isSelf && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              disabled={actionLoading === u.id}
                              title="Delete user"
                              style={{
                                padding: '5px 7px',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                background: '#ffffff',
                                color: '#64748b',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#fca5a5';
                                e.currentTarget.style.background = '#fef2f2';
                                e.currentTarget.style.color = '#dc2626';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = '#e2e8f0';
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.color = '#64748b';
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Crisp Enterprise Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '16px',
            marginTop: '16px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '12.5px',
            color: '#64748b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
            <span>Administrator session authenticated: <strong>{users.find((u) => u.id === currentUserId)?.username || 'Admin'}</strong></span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.color = '#334155';
            }}
          >
            Done
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
