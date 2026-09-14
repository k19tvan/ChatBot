import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  Settings,
  PanelLeftClose,
  Sparkles,
  Activity,
  User,
  LogIn,
  LogOut,
  ShieldCheck
} from 'lucide-react';

export default function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  isOpen,
  onToggle,
  onOpenSettings,
  activeModel,
  user,
  onOpenAuth,
  onLogout,
  onOpenAdmin,
  pendingCount = 0
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartRename = (conv, e) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id, e) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e) => {
    e.stopPropagation();
    setEditingId(null);
  };

  // Group conversations by date
  const groupConversations = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);

    const groups = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: []
    };

    conversations.forEach((conv) => {
      const date = new Date(conv.updatedAt || conv.createdAt || Date.now());
      if (date >= today) {
        groups.Today.push(conv);
      } else if (date >= yesterday) {
        groups.Yesterday.push(conv);
      } else if (date >= last7Days) {
        groups['Previous 7 Days'].push(conv);
      } else {
        groups.Older.push(conv);
      }
    });

    return groups;
  };

  const grouped = groupConversations();

  return (
    <aside className={`sidebar ${!isOpen ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <button className="btn-new-chat" onClick={onNewChat} title="Start a fresh conversation">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={15} color="var(--accent-cyan)" />
            <span>New Chat</span>
          </span>
          <Plus size={15} color="var(--accent-color)" />
        </button>
        <button className="icon-btn" onClick={onToggle} title="Collapse sidebar">
          <PanelLeftClose size={17} />
        </button>
      </div>

      <div className="sidebar-content">
        {Object.entries(grouped).map(([groupName, items]) => {
          if (!items.length) return null;
          return (
            <div key={groupName}>
              <div className="history-group-title">{groupName}</div>
              {items.map((conv) => {
                const isActive = conv.id === activeId;
                const isEditing = editingId === conv.id;

                return (
                  <div
                    key={conv.id}
                    className={`history-item ${isActive ? 'active' : ''}`}
                    onClick={() => onSelectConversation(conv.id)}
                  >
                    <MessageSquare
                      size={14}
                      style={{
                        marginRight: '8px',
                        flexShrink: 0,
                        color: isActive ? '#60a5fa' : 'rgba(147, 197, 253, 0.75)'
                      }}
                    />

                    {isEditing ? (
                      <div
                        style={{ display: 'flex', alignItems: 'center', flex: 1, gap: '4px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '2px 8px', fontSize: '13px', width: '100%' }}
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(conv.id, e);
                            if (e.key === 'Escape') handleCancelRename(e);
                          }}
                          autoFocus
                        />
                        <button className="icon-btn-sm" onClick={(e) => handleSaveRename(conv.id, e)}>
                          <Check size={13} color="var(--accent-color)" />
                        </button>
                        <button className="icon-btn-sm" onClick={handleCancelRename}>
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="history-item-title">{conv.title || 'Untitled conversation'}</span>
                        <div className="history-item-actions">
                          <button
                            className="icon-btn-sm"
                            title="Rename"
                            onClick={(e) => handleStartRename(conv, e)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="icon-btn-sm"
                            title="Delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteConversation(conv.id);
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        {user ? (
          <div
            className="sidebar-user-card"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '8px',
              background: 'rgba(30, 58, 138, 0.4)',
              border: 'none',
              marginBottom: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', overflow: 'hidden' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '13px',
                  flexShrink: 0
                }}
              >
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <span
                style={{
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: '#bfdbfe',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={user.username}
              >
                {user.username}
              </span>
            </div>
            <button
              className="icon-btn-sm"
              onClick={onLogout}
              title="Log out"
              style={{ color: '#ef4444' }}
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button
            className="footer-btn"
            onClick={onOpenAuth}
            style={{
              background: 'rgba(30, 58, 138, 0.4)',
              color: '#93c5fd',
              border: 'none',
              fontWeight: '600',
              marginBottom: '4px'
            }}
          >
            <LogIn size={15} />
            <span>Log in / Sign up</span>
          </button>
        )}

        {user && user.role === 'admin' && (
          <button
            className="footer-btn"
            onClick={onOpenAdmin}
            style={{
              background: 'rgba(30, 58, 138, 0.4)',
              color: '#93c5fd',
              border: 'none',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '2px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="#60a5fa" />
              <span>Admin Panel</span>
            </div>
            {pendingCount > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '11px',
                  fontWeight: 700
                }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        )}

        <button className="footer-btn" onClick={onOpenSettings}>
          <Settings size={15} />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
