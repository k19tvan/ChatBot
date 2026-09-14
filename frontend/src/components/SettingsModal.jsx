import React, { useState } from 'react';
import {
  X,
  Search,
  Settings,
  Sliders,
  Bell,
  Sparkles,
  Database,
  Shield,
  Trash2,
  Download,
  Check,
  ChevronDown,
  Lock,
  ExternalLink
} from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearAll,
  onExportChats,
  currentUser,
  onOpenAdmin
}) {
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'parameters', 'data_controls', 'security'
  const [searchQuery, setSearchQuery] = useState('');
  const [showMfaBanner, setShowMfaBanner] = useState(true);

  if (!isOpen) return null;

  const navItems = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'parameters', label: 'Model Parameters', icon: Sliders },
    { id: 'data_controls', label: 'Data Controls', icon: Database },
    { id: 'security', label: 'Security & Login', icon: Shield },
  ];

  const filteredNav = navItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="chatgpt-settings-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '820px',
          maxWidth: '92vw',
          height: '560px',
          maxHeight: '88vh',
          background: '#ffffff',
          color: '#0f172a',
          borderRadius: '16px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          overflow: 'hidden',
          fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Left Navigation Sidebar */}
        <div
          style={{
            width: '240px',
            background: '#f8fafc',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 12px',
            flexShrink: 0,
          }}
        >
          {/* Close button at top-left matching screenshot */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                padding: '6px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e2e8f0';
                e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }}
              title="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search box */}
          <div style={{ position: 'relative', marginBottom: '14px' }}>
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              placeholder="Search settings"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px 7px 30px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#0f172a',
                fontSize: '13px',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#2563eb';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
            />
          </div>

          {/* Menu items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: active ? '#eff6ff' : 'transparent',
                    color: active ? '#2563eb' : '#475569',
                    fontSize: '13.5px',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.background = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Icon size={16} color={active ? '#2563eb' : '#64748b'} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content Area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            padding: '24px 32px',
            background: '#ffffff',
          }}
        >
          {/* Header Title of Active Section */}
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              {navItems.find((n) => n.id === activeTab)?.label || 'General'}
            </h2>
          </div>

          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Secure your account card */}
              {showMfaBanner && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '16px 18px',
                    position: 'relative',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowMfaBanner(false)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                    title="Dismiss"
                  >
                    <X size={15} />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2563eb',
                        flexShrink: 0,
                      }}
                    >
                      <Lock size={18} />
                    </div>
                    <div style={{ flex: 1, paddingRight: '20px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px 0', color: '#0f172a' }}>
                        Account Security &amp; Approval
                      </h3>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px 0', lineHeight: 1.45 }}>
                        Your account is verified. User status:{' '}
                        <strong style={{ color: '#16a34a' }}>
                          {currentUser?.status ? currentUser.status.toUpperCase() : 'ACTIVE'}
                        </strong>{' '}
                        ({currentUser?.role ? currentUser.role.toUpperCase() : 'USER'}).
                      </p>
                      {currentUser?.role === 'admin' && onOpenAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenAdmin();
                          }}
                          style={{
                            background: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                          }}
                        >
                          Open Admin Approvals
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Rows matching settings style */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Accent Color */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>Accent color</span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#64748b',
                      fontSize: '13px',
                    }}
                  >
                    <div
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#2563eb',
                      }}
                    />
                    <span>UIT Blue</span>
                    <ChevronDown size={14} />
                  </div>
                </div>

                {/* Language */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <span style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>Language</span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#64748b',
                      fontSize: '13px',
                    }}
                  >
                    <span>English (Auto-detect)</span>
                    <ChevronDown size={14} />
                  </div>
                </div>

                {/* High Throughput Inference */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>
                      High Throughput vLLM
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                      Optimized PagedAttention streaming with real-time token budgeting.
                    </div>
                  </div>
                  <div
                    style={{
                      width: '42px',
                      height: '24px',
                      borderRadius: '12px',
                      background: '#2563eb',
                      position: 'relative',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        position: 'absolute',
                        top: '3px',
                        right: '3px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PARAMETERS */}
          {activeTab === 'parameters' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Custom System Prompt */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a' }}>
                  Custom System Instructions
                </label>
                <textarea
                  rows={4}
                  placeholder="e.g. You are a concise, world-class software architect..."
                  value={settings.systemPrompt || ''}
                  onChange={(e) => onUpdateSettings({ ...settings, systemPrompt: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '10px',
                    color: '#0f172a',
                    fontSize: '13.5px',
                    lineHeight: 1.5,
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#2563eb';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                  }}
                />
              </div>

              {/* Temperature */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>Temperature (Sampling Diversity)</span>
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>{settings.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={settings.temperature}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, temperature: parseFloat(e.target.value) })
                  }
                  style={{
                    width: '100%',
                    accentColor: '#2563eb',
                    cursor: 'pointer',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
                  <span>Precise (0.0)</span>
                  <span>Balanced (0.7)</span>
                  <span>Creative (1.5)</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px' }}>
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>Max Response Tokens</span>
                  <span style={{ color: '#2563eb', fontWeight: 700 }}>{settings.maxTokens}</span>
                </div>
                <input
                  type="number"
                  min="128"
                  max="16384"
                  step="128"
                  value={settings.maxTokens}
                  onChange={(e) =>
                    onUpdateSettings({ ...settings, maxTokens: parseInt(e.target.value, 10) || 2048 })
                  }
                  style={{
                    padding: '8px 12px',
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    color: '#0f172a',
                    fontSize: '13.5px',
                    outline: 'none',
                    transition: 'border-color 0.15s',
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
          )}

          {/* TAB 3: DATA CONTROLS */}
          {activeTab === 'data_controls' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>
                    Export Conversation History
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                    Download a full JSON archive of your chats and prompts.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onExportChats}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: '#f8fafc',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                >
                  <Download size={14} />
                  <span>Export</span>
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', color: '#ef4444', fontWeight: 500 }}>
                    Delete All Conversations
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                    Permanently delete all your chat sessions and token logs.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClearAll}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    background: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete all</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SECURITY & LOGIN */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>
                    Active User Account
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                    Logged in as <strong>{currentUser?.username || 'Guest'}</strong>
                  </div>
                </div>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {currentUser?.role ? currentUser.role.toUpperCase() : 'USER'}
                </span>
              </div>

              {currentUser?.role === 'admin' && onOpenAdmin && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 0',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', color: '#0f172a', fontWeight: 500 }}>
                      Admin User Approval Mode
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                      Approve, suspend, or manage guest signups and account roles.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdmin();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: '8px',
                      background: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
                    }}
                  >
                    <Shield size={14} />
                    <span>Manage Users</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
