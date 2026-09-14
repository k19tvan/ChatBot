import React from 'react';
import { PanelLeft, Sparkles, ChevronDown, Settings, Zap } from 'lucide-react';

export default function Header({
  sidebarOpen,
  onToggleSidebar,
  models,
  currentModel,
  onSelectModel,
  onOpenSettings,
  tokenStats,
  onOpenTokenStats
}) {
  return (
    <header className="chat-header">
      <div className="header-left">
        {!sidebarOpen && (
          <button className="icon-btn" onClick={onToggleSidebar} title="Open sidebar">
            <PanelLeft size={18} />
          </button>
        )}

        <div className="model-selector-pill" title="Active Model">
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--accent-cyan)',
            boxShadow: '0 0 8px var(--accent-cyan)'
          }} />
          <Sparkles size={14} color="var(--accent-color)" />
          <select
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit',
              outline: 'none',
              cursor: 'pointer'
            }}
            value={currentModel}
            onChange={(e) => onSelectModel(e.target.value)}
          >
            {models.map((m) => (
              <option key={m} value={m} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                {m}
              </option>
            ))}
          </select>
          <ChevronDown size={13} color="var(--text-muted)" />
        </div>
      </div>

      <div className="header-right">
        {tokenStats && (
          <button
            className={`token-pill-btn ${tokenStats.isExceeded ? 'is-exceeded' : ''}`}
            onClick={onOpenTokenStats}
            title={tokenStats.isExceeded ? "Session token limit reached! Click to view details or reset session" : "Click to view session token usage breakdown"}
          >
            <Zap size={13} color={tokenStats.isExceeded ? '#ef4444' : 'var(--accent-cyan)'} />
            <span>
              <strong>{tokenStats.total.toLocaleString()}</strong> / {tokenStats.maxSession.toLocaleString()}
            </span>
            <span className={`token-percent-tag ${tokenStats.isExceeded ? 'is-exceeded' : ''}`}>{tokenStats.percent}%</span>
          </button>
        )}

        <button className="icon-btn" onClick={onOpenSettings} title="Settings & Parameters">
          <Settings size={17} />
        </button>
      </div>
    </header>
  );
}
