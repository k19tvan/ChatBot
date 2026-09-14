import React, { useRef, useEffect } from 'react';
import { ArrowUp, Square } from 'lucide-react';

export default function ChatInput({
  input,
  setInput,
  onSend,
  onStop,
  isStreaming,
  disabled,
  centered = false,
  tokenStats,
  onOpenTokenStats,
  isExceeded = false,
  onResetSession
}) {
  const textareaRef = useRef(null);

  // Auto-grow textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  }, [input]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && !isExceeded && input.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className={`input-composer-container ${centered ? 'centered' : ''}`}>
      <div className={`input-composer-box ${isExceeded ? 'border-exceeded' : ''}`}>
        <textarea
          ref={textareaRef}
          className="composer-textarea"
          rows={1}
          placeholder={
            isExceeded
              ? '⚠️ Session token limit reached (2,048 tokens). Click "Reset Session" to continue...'
              : 'Ask anything...'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isExceeded}
          autoFocus={centered && !isExceeded}
        />

        <div className="composer-bottom-bar">
          <div className="composer-meta">
            {input.length > 0 && !isExceeded && <span>{input.length} characters</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isStreaming ? (
              <button
                type="button"
                className="composer-btn-stop"
                onClick={onStop}
                title="Stop generating response"
              >
                <Square size={13} fill="currentColor" />
              </button>
            ) : !isExceeded ? (
              <button
                type="button"
                className="composer-btn-send"
                onClick={onSend}
                disabled={!input.trim() || disabled}
                title="Send message (Enter)"
              >
                <ArrowUp size={17} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
