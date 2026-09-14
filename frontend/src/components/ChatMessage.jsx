import React, { useState, useMemo } from 'react';
import { Bot, User, Copy, Check, RotateCcw } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Configure marked with highlight.js
marked.setOptions({
  breaks: true,
  gfm: true,
  highlight: function (code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
});

// Custom renderer for code blocks to add header and copy button
const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }) {
  const language = lang || 'code';
  const highlighted = hljs.getLanguage(language)
    ? hljs.highlight(text, { language }).value
    : hljs.highlightAuto(text).value;

  const encodedCode = encodeURIComponent(text);

  return `
    <div class="code-block-container">
      <div class="code-block-header">
        <span>${language}</span>
        <button class="copy-code-btn" data-code="${encodedCode}">
          Copy code
        </button>
      </div>
      <pre><code class="hljs ${language}">${highlighted}</code></pre>
    </div>
  `;
};

marked.use({ renderer });

/**
 * Preprocesses markdown text to render LaTeX math formulas with KaTeX ($$...$$ and $...$).
 * Protects pre-existing code blocks from accidental regex replacement.
 */
function preprocessMath(text) {
  if (!text) return '';

  const codeSnippets = [];
  let protectedText = text.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    codeSnippets.push(match);
    return `%%%MATH_CODE_${codeSnippets.length - 1}%%%`;
  });

  // Display math: $$...$$
  protectedText = protectedText.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return `\n\n<div class="katex-display-wrapper">${rendered}</div>\n\n`;
    } catch {
      return match;
    }
  });

  // Display math: \[...\]
  protectedText = protectedText.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
    try {
      const rendered = katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
      });
      return `\n\n<div class="katex-display-wrapper">${rendered}</div>\n\n`;
    } catch {
      return match;
    }
  });

  // Inline math: $...$ (ignoring standalone currency e.g. $100)
  protectedText = protectedText.replace(/(?<!\$)\$([^\$\n]+?)\$(?!\$)/g, (match, formula) => {
    if (/^\s*\d+[\d,.]*\s*$/.test(formula)) {
      return match;
    }
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return match;
    }
  });

  // Inline math: \(...\)
  protectedText = protectedText.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return match;
    }
  });

  // Restore code blocks
  protectedText = protectedText.replace(/%%%MATH_CODE_(\d+)%%%/g, (_, index) => {
    return codeSnippets[Number(index)] || '';
  });

  return protectedText;
}

export default function ChatMessage({ message, isStreaming, onRegenerate }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  // Extract any exceeded notification from content if present, and auto-close open code fences
  const { cleanContent, exceededInfo } = useMemo(() => {
    let raw = message.content || '';
    let isExc = Boolean(message.exceeded);
    let excText = message.exceededMsg || '';

    // Match any notification string that might have been embedded into text
    const pattern = /(?:>\s*)?⚠️\s*(?:\*\*)?(?:Thông báo|Notification|Notice|Warning):?(?:\*\*)?\s*([^\n\r]+)/i;
    const match = raw.match(pattern);
    if (match) {
      isExc = true;
      if (!excText) {
        excText = match[1].replace(/\*\*/g, '').trim();
      }
      // Remove the notification string from the markdown body
      raw = raw.replace(match[0], '').trim();
    }

    // Auto-close open code fence if generation cut off mid-code block
    const codeFenceCount = (raw.match(/```/g) || []).length;
    if (codeFenceCount % 2 === 1) {
      raw += '\n```';
    }

    return {
      cleanContent: raw,
      exceededInfo: isExc
        ? (excText || 'Session token limit reached (2,048/2,048 tokens). Please click Reset Session to continue.')
        : null
    };
  }, [message.content, message.exceeded, message.exceededMsg]);

  // Render markdown and LaTeX math safely
  const renderedHtml = useMemo(() => {
    if (isUser) return '';
    const textWithMath = preprocessMath(cleanContent);
    const rawHtml = marked.parse(textWithMath);
    return DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true, mathMl: true, svg: true },
      ADD_TAGS: [
        'button', 'span', 'div', 'math', 'semantics', 'mrow', 'mi', 'mo', 'mn',
        'msup', 'msub', 'mfrac', 'mover', 'munder', 'msubsup', 'annotation',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'
      ],
      ADD_ATTR: ['data-code', 'class', 'style', 'aria-hidden', 'xmlns', 'encoding', 'tabindex', 'viewBox']
    });
  }, [cleanContent, isUser]);

  const handleCopyFull = () => {
    navigator.clipboard.writeText(cleanContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContainerClick = (e) => {
    // Check if copy button inside code block was clicked
    const copyBtn = e.target.closest('.copy-code-btn');
    if (copyBtn) {
      const code = decodeURIComponent(copyBtn.getAttribute('data-code') || '');
      navigator.clipboard.writeText(code);
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = '✓ Copied!';
      setTimeout(() => {
        copyBtn.innerHTML = originalText;
      }, 2000);
    }
  };

  return (
    <div className={`message-row ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && (
        <div className="message-avatar assistant">
          <Bot size={18} />
        </div>
      )}

      <div className="message-content-wrapper">
        <div className="message-bubble">
          {isUser ? (
            <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
          ) : (
            <>
              {cleanContent && (
                <div
                  className="markdown-body"
                  onClick={handleContainerClick}
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              )}
              {!cleanContent && !exceededInfo && isStreaming && (
                <span className="typing-cursor" />
              )}
            </>
          )}

          {!isUser && isStreaming && cleanContent && <span className="typing-cursor" />}
        </div>


        {!isUser && !isStreaming && cleanContent && (
          <div className="message-actions">
            <button className="icon-btn-sm" onClick={handleCopyFull} title="Copy response">
              {copied ? <Check size={14} color="var(--accent-color)" /> : <Copy size={14} />}
            </button>
            {onRegenerate && (
              <button className="icon-btn-sm" onClick={onRegenerate} title="Regenerate response">
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="message-avatar user">
          <User size={18} />
        </div>
      )}
    </div>
  );
}

