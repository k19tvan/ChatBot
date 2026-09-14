import React from 'react';
import { X, Zap, RotateCcw, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function TokenStatsModal({ isOpen, onClose, tokenStats, activeModel, onResetSession }) {
  if (!isOpen || !tokenStats) return null;

  const {
    total = 0,
    maxSession = 2048,
    maxResponse = 2048,
    remaining = 0,
    percent = 0,
    prompt = 0,
    completion = 0,
    system = 0,
    messageCount = 0,
    isExceeded = false,
  } = tokenStats;

  // Determine gauge color based on usage percent
  const getGaugeColor = (pct) => {
    if (pct >= 100 || isExceeded) return 'var(--danger-color, #ef4444)';
    if (pct >= 80) return '#f59e0b'; // amber
    return 'var(--accent-cyan, #06b6d4)';
  };

  const gaugeColor = getGaugeColor(percent);

  const handleReset = () => {
    if (onResetSession) {
      onResetSession();
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '520px', padding: '26px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title" style={{ gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: isExceeded ? 'rgba(239, 68, 68, 0.15)' : 'rgba(6, 182, 212, 0.15)',
                border: `1px solid ${isExceeded ? 'rgba(239, 68, 68, 0.3)' : 'rgba(6, 182, 212, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isExceeded ? '#ef4444' : 'var(--accent-cyan, #06b6d4)',
              }}
            >
              {isExceeded ? <AlertTriangle size={20} /> : <Zap size={20} />}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '700' }}>
                Output Token Statistics
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '400' }}>
                Model: <span style={{ color: 'var(--accent-color)' }}>{activeModel}</span>
                {isExceeded ? (
                  <span style={{ marginLeft: '8px', color: '#ef4444', fontWeight: '700' }}>
                    • LIMIT REACHED
                  </span>
                ) : (
                  <span style={{ marginLeft: '8px', color: 'var(--accent-green, #10b981)', fontWeight: '600' }}>
                    • Active
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={17} />
          </button>
        </div>

        {/* Big Progress Gauge Card */}
        <div
          style={{
            background: isExceeded ? 'rgba(239, 68, 68, 0.06)' : 'var(--bg-tertiary)',
            border: `1px solid ${isExceeded ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-color)'}`,
            borderRadius: '16px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Total output tokens generated:
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                <span
                  style={{
                    fontSize: '32px',
                    fontWeight: '800',
                    color: isExceeded ? '#ef4444' : 'var(--text-primary)',
                    letterSpacing: '-0.5px'
                  }}
                >
                  {total.toLocaleString()}
                </span>
                <span style={{ fontSize: '15px', color: 'var(--text-muted)' }}>
                  / {maxSession.toLocaleString()} tokens
                </span>
              </div>
            </div>
            <div
              style={{
                textAlign: 'right',
                padding: '6px 12px',
                borderRadius: '10px',
                background: `${gaugeColor}1a`,
                border: `1px solid ${gaugeColor}40`,
                color: gaugeColor,
                fontWeight: '700',
                fontSize: '15px',
              }}
            >
              {percent}%
            </div>
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: '10px',
              borderRadius: '5px',
              background: 'var(--bg-input)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(percent, total > 0 ? 3 : 0))}%`,
                height: '100%',
                background: isExceeded
                  ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                  : percent >= 80
                  ? 'linear-gradient(90deg, var(--accent-color), #f59e0b)'
                  : 'linear-gradient(90deg, var(--accent-color), var(--accent-cyan))',
                borderRadius: '5px',
                transition: 'width 0.4s ease-out',
                boxShadow: `0 0 10px ${gaugeColor}`,
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
            <span>
              Remaining in session:{' '}
              <strong style={{ color: isExceeded ? '#ef4444' : 'var(--text-primary)' }}>
                {remaining.toLocaleString()} tokens
              </strong>
            </span>
            <span>
              Session limit (.env):{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{maxSession.toLocaleString()}</strong>
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>
              👤 User Prompt
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {prompt.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-muted)' }}>tokens</span>
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>
              🤖 AI Completion
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--accent-cyan, #06b6d4)' }}>
              {completion.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-muted)' }}>tokens</span>
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>
              💬 Message Count
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {messageCount} <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-muted)' }}>messages</span>
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px' }}>
              🎯 Single Response Limit
            </div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {maxResponse.toLocaleString()} <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-muted)' }}>tokens</span>
            </div>
          </div>
        </div>

        {/* Exceeded Notification or Policy Box */}
        {isExceeded ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              fontSize: '13px',
              color: '#f87171',
              lineHeight: '1.5',
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Session token limit reached ({total.toLocaleString()}/{maxSession.toLocaleString()}):</strong>
              <div style={{ marginTop: '3px', color: 'var(--text-secondary)' }}>
                The system has paused generation to ensure limits are respected. Please click <strong>"Reset Session"</strong> below to clear messages and start fresh with 0 tokens.
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(37, 99, 235, 0.08)',
              border: '1px solid rgba(37, 99, 235, 0.2)',
              fontSize: '12.5px',
              color: 'var(--text-secondary)',
              lineHeight: '1.5',
            }}
          >
            <CheckCircle2 size={16} style={{ color: 'var(--accent-color)', flexShrink: 0, marginTop: '2px' }} />
            <span>
              <strong>Session Policy:</strong> Each chat session is allocated a maximum of <strong>{maxSession.toLocaleString()} tokens</strong>. When this limit is reached, generation stops and prompts you to reset the session.
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '11px',
              borderRadius: '10px',
              background: isExceeded ? 'var(--danger-color, #ef4444)' : 'var(--bg-tertiary)',
              border: isExceeded ? 'none' : '1px solid var(--border-color)',
              color: isExceeded ? '#ffffff' : 'var(--text-primary)',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <RotateCcw size={15} />
            <span>Reset Session</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '11px 20px',
              borderRadius: '10px',
              background: 'var(--bg-hover)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
