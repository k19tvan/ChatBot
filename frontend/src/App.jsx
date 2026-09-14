import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AlertTriangle, RotateCcw, Plus } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import WelcomeHero from './components/WelcomeHero';
import SettingsModal from './components/SettingsModal';
import AuthModal from './components/AuthModal';
import AuthPage from './components/AuthPage';
import TokenStatsModal from './components/TokenStatsModal';
import AdminModal from './components/AdminModal';

const STORAGE_CONVERSATIONS = 'chatgpt_vllm_conversations_v1';
const STORAGE_SETTINGS = 'chatgpt_vllm_settings_v1';

export default function App() {
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONVERSATIONS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeId, setActiveId] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CONVERSATIONS);
      const list = saved ? JSON.parse(saved) : [];
      return list.length > 0 ? list[0].id : null;
    } catch {
      return null;
    }
  });

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS);
      return saved
        ? JSON.parse(saved)
        : {
            temperature: 0.7,
            maxTokens: 2048,
            systemPrompt: '',
            theme: 'light'
          };
    } catch {
      return {
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: '',
        theme: 'light'
      };
    }
  });

  const [models, setModels] = useState(['qwen35_4b']);
  const [currentModel, setCurrentModel] = useState('qwen35_4b');
  const [input, setInput] = useState('');
  const [streamingIds, setStreamingIds] = useState(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [tokenStatsOpen, setTokenStatsOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [configLimits, setConfigLimits] = useState({
    maxSessionTokens: 2048,
    maxResponseTokens: 2048
  });

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const userScrolledUpRef = useRef(false);
  const activeStreamsRef = useRef(new Map());
  const activeIdRef = useRef(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const isCurrentStreaming = Boolean(activeId && streamingIds.has(activeId));

  // Apply light theme permanently
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');

    const handleVisibilityChange = () => {
      // When tab becomes visible again or hidden, flush remaining stream buffers for all active sessions
      const streams = activeStreamsRef.current;
      if (streams.size === 0) return;

      setConversations((prev) =>
        prev.map((c) => {
          const session = streams.get(c.id);
          if (session && session.streamBuffer.length > 0) {
            session.activeAssistantMsg += session.streamBuffer;
            session.streamBuffer = '';
            const updated = [...c.messages];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
              updated[lastIdx] = {
                ...updated[lastIdx],
                content: session.activeAssistantMsg
              };
            }
            return { ...c, messages: updated, updatedAt: Date.now() };
          }
          return c;
        })
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Save settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [settings]);

  // Save conversations
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CONVERSATIONS, JSON.stringify(conversations));
    } catch (e) {
      console.error('Failed to save conversations:', e);
    }
  }, [conversations]);

  // Fetch available models from backend
  useEffect(() => {
    const fetchConfigAndModels = async () => {
      try {
        const [configRes, modelsRes] = await Promise.all([
          fetch('/api/config').then((r) => (r.ok ? r.json() : null)),
          fetch('/api/models').then((r) => (r.ok ? r.json() : null))
        ]);

        if (modelsRes && modelsRes.models && modelsRes.models.length > 0) {
          setModels(modelsRes.models);
          if (configRes && configRes.default_model) {
            setCurrentModel(configRes.default_model);
          } else {
            setCurrentModel(modelsRes.models[0]);
          }
        }
        if (configRes) {
          const respLimit = configRes.max_response_tokens || 2048;
          setConfigLimits({
            maxSessionTokens: configRes.max_session_tokens || 2048,
            maxResponseTokens: respLimit
          });
          setSettings((prev) => ({
            ...prev,
            maxTokens: Math.max(prev.maxTokens || 2048, respLimit)
          }));
        }
      } catch (e) {
        console.warn('Using fallback models:', e);
      }
    };
    fetchConfigAndModels();
  }, []);

  const syncConversationToBackend = async (conv) => {
    const token = localStorage.getItem('chat_session_token');
    if (!token || !conv) return;
    try {
      await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: conv.id,
          title: conv.title,
          messages: conv.messages
        })
      });
    } catch (e) {
      console.warn('Failed to sync conversation to backend:', e);
    }
  };

  const syncDeleteConversation = async (id) => {
    const token = localStorage.getItem('chat_session_token');
    if (!token || !id) return;
    try {
      await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.warn('Failed to delete conversation on backend:', e);
    }
  };

  // Check auth and load user conversations
  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const token = localStorage.getItem('chat_session_token');
      if (!token) {
        setAuthChecking(false);
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setCurrentUser(data.user);
            const convsRes = await fetch('/api/conversations', {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (convsRes.ok) {
              const convsData = await convsRes.json();
              if (convsData.conversations && convsData.conversations.length > 0) {
                setConversations(convsData.conversations);
                setActiveId(convsData.conversations[0].id);
              }
            }
          }
        } else {
          localStorage.removeItem('chat_session_token');
        }
      } catch (err) {
        console.warn('Auth check error:', err);
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuthAndLoad();
  }, []);

  // Fetch pending count for admin
  const fetchPendingCount = async () => {
    const token = localStorage.getItem('chat_session_token');
    if (!token || !currentUser || currentUser.role !== 'admin') return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPendingCount(data.pendingCount || 0);
      }
    } catch {
      // Ignore background network error
    }
  };

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      fetchPendingCount();
      const interval = setInterval(fetchPendingCount, 30000);
      return () => clearInterval(interval);
    } else {
      setPendingCount(0);
    }
  }, [currentUser]);



  const handleAuthSuccess = async (user, token) => {
    setCurrentUser(user);
    try {
      const convsRes = await fetch('/api/conversations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (convsRes.ok) {
        const convsData = await convsRes.json();
        if (convsData.conversations && convsData.conversations.length > 0) {
          setConversations(convsData.conversations);
          setActiveId(convsData.conversations[0].id);
        } else if (conversations.length > 0) {
          // If server is empty, sync current conversations
          for (const c of conversations) {
            await fetch('/api/conversations', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                id: c.id,
                title: c.title,
                messages: c.messages
              })
            });
          }
        }
      }
    } catch (err) {
      console.warn('Error loading conversations after auth:', err);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('chat_session_token');
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.warn('Logout error:', e);
    }
    localStorage.removeItem('chat_session_token');
    setCurrentUser(null);
    setConversations([]);
    setActiveId(null);
  };

  // Active conversation object
  const activeConversation = conversations.find((c) => c.id === activeId);
  const messages = activeConversation ? activeConversation.messages : [];

  // Calculate real-time token stats for active session (measuring output/completion tokens only)
  const tokenStats = useMemo(() => {
    const maxSession = configLimits.maxResponseTokens || configLimits.maxSessionTokens || 2048;
    const maxResponse = configLimits.maxResponseTokens || 2048;

    let prompt = 0;
    let completion = 0;

    (messages || []).forEach((m) => {
      const text = m.content || '';
      const cost = text ? Math.max(1, Math.floor(text.length / 3)) : 0;
      if (m.role === 'user') prompt += cost;
      else if (m.role === 'assistant') completion += cost;
    });

    // Count ONLY output tokens (completion tokens generated by assistant)
    const total = completion;
    const remaining = Math.max(0, maxSession - total);
    const percent = maxSession > 0 ? Math.min(100, Math.round((total / maxSession) * 1000) / 10) : 0;
    const isExceeded = maxSession > 0 && total >= maxSession;

    return {
      total,
      maxSession,
      maxResponse,
      remaining,
      percent,
      prompt,
      completion,
      system: 0,
      messageCount: (messages || []).length,
      isExceeded,
    };
  }, [messages, configLimits]);

  // Reset active session: clear messages to reset token usage back to 0
  const handleResetSession = () => {
    if (!activeId) return;
    handleStopGeneration(activeId);
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: [], updatedAt: Date.now() } : c))
    );
    if (currentUser) {
      const target = conversations.find((c) => c.id === activeId);
      if (target) {
        syncConversationToBackend({ ...target, messages: [] });
      }
    }
  };

  // Check if user has scrolled away from the bottom (allow manual top-down scrolling while generating)
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // If distance > 90px, mark user as actively reading/scrolled up
    userScrolledUpRef.current = distanceFromBottom > 90;
  };

  // Scroll to bottom without locking user viewport
  const scrollToBottom = (force = false) => {
    if (force) {
      userScrolledUpRef.current = false;
    }
    // Only scroll if user hasn't scrolled up or if forced
    if (!userScrolledUpRef.current) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }
    }
  };

  useEffect(() => {
    userScrolledUpRef.current = false;
    scrollToBottom(true);
  }, [activeId]);

  // Per-session streaming typewriter loop: runs concurrently and background-safe
  const startSessionTypewriterLoop = (convId) => {
    let lastFlushTime = 0;

    const flushBuffer = (force = false) => {
      const session = activeStreamsRef.current.get(convId);
      if (!session) return;
      if (session.streamBuffer.length === 0) return;

      const now = performance.now();
      // In background tabs, or if forced, or every ~20ms: flush chunk
      if (force || document.hidden || now - lastFlushTime >= 20) {
        const take = document.hidden
          ? session.streamBuffer.length
          : session.streamBuffer.length > 60
          ? 6
          : session.streamBuffer.length > 20
          ? 3
          : 1;

        const chunk = session.streamBuffer.slice(0, take);
        session.streamBuffer = session.streamBuffer.slice(take);
        session.activeAssistantMsg += chunk;

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id !== convId) return c;
            const updatedMessages = [...c.messages];
            const lastIdx = updatedMessages.length - 1;
            if (lastIdx >= 0 && updatedMessages[lastIdx].role === 'assistant') {
              updatedMessages[lastIdx] = {
                ...updatedMessages[lastIdx],
                content: session.activeAssistantMsg
              };
            }
            return {
              ...c,
              updatedAt: Date.now(),
              messages: updatedMessages
            };
          })
        );

        lastFlushTime = now;
        // Only scroll if this conversation is currently being viewed
        if (!document.hidden && activeIdRef.current === convId) {
          scrollToBottom(false);
        }
      }
    };

    const cleanupSession = () => {
      const session = activeStreamsRef.current.get(convId);
      if (session) {
        if (session.timerId) clearInterval(session.timerId);
        if (session.animFrameId) cancelAnimationFrame(session.animFrameId);
        activeStreamsRef.current.delete(convId);
      }
      setStreamingIds((prev) => {
        const next = new Set(prev);
        next.delete(convId);
        return next;
      });
      // Sync completed conversation to backend if logged in
      setConversations((latestConvs) => {
        const conv = latestConvs.find((c) => c.id === convId);
        if (conv) syncConversationToBackend(conv);
        return latestConvs;
      });
    };

    // Use setInterval as the primary background-safe driver
    const timerId = setInterval(() => {
      flushBuffer();
      const session = activeStreamsRef.current.get(convId);
      if (session && !session.isStreaming && session.streamBuffer.length === 0) {
        cleanupSession();
      }
    }, 20);

    // Also use requestAnimationFrame when active tab is focused
    const renderFrame = () => {
      const session = activeStreamsRef.current.get(convId);
      if (session && (session.isStreaming || session.streamBuffer.length > 0)) {
        flushBuffer();
        session.animFrameId = requestAnimationFrame(renderFrame);
      } else {
        cleanupSession();
      }
    };

    const session = activeStreamsRef.current.get(convId);
    if (session) {
      session.timerId = timerId;
      session.animFrameId = requestAnimationFrame(renderFrame);
    }
  };

  const handleNewChat = () => {
    const newId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newConv = {
      id: newId,
      title: 'New conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };

    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newId);
    setInput('');
  };

  const handleSelectConversation = (id) => {
    setActiveId(id);
  };

  const handleDeleteConversation = (id) => {
    handleStopGeneration(id);

    setConversations((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (activeId === id) {
        setActiveId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });

    if (currentUser) {
      syncDeleteConversation(id);
    }
  };

  const handleRenameConversation = (id, newTitle) => {
    setConversations((prev) => {
      const updated = prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: Date.now() } : c));
      const target = updated.find((c) => c.id === id);
      if (target && currentUser) {
        syncConversationToBackend(target);
      }
      return updated;
    });
  };

  const handleStopGeneration = (convId = activeId) => {
    if (!convId) return;
    const session = activeStreamsRef.current.get(convId);
    if (session) {
      if (session.abortController) {
        session.abortController.abort();
      }
      if (session.timerId) clearInterval(session.timerId);
      if (session.animFrameId) cancelAnimationFrame(session.animFrameId);
      activeStreamsRef.current.delete(convId);
    }
    setStreamingIds((prev) => {
      const next = new Set(prev);
      next.delete(convId);
      return next;
    });
  };

  const handleSendMessage = async (textToSend = null) => {
    const promptText = (textToSend !== null ? textToSend : input).trim();
    if (!promptText) return;

    let currentId = activeId;
    let targetConv = activeConversation;

    // Create a new conversation if none active
    if (!currentId || !targetConv) {
      const newId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const title = promptText.length > 30 ? `${promptText.substring(0, 30)}...` : promptText;
      targetConv = {
        id: newId,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      };
      setConversations((prev) => [targetConv, ...prev]);
      setActiveId(newId);
      currentId = newId;
    }

    // If this specific session is already streaming, don't double send
    if (activeStreamsRef.current.has(currentId)) return;

    if (tokenStats.isExceeded) {
      alert('Session token limit reached (2,048 tokens). Please click "Reset Session" to continue chatting.');
      return;
    }

    setInput('');

    if (targetConv.messages.length === 0) {
      // Auto-set title from first user prompt
      const title = promptText.length > 30 ? `${promptText.substring(0, 30)}...` : promptText;
      handleRenameConversation(currentId, title);
    }

    const userMessage = { role: 'user', content: promptText };
    const emptyAssistantMessage = { role: 'assistant', content: '' };

    const updatedHistory = [...(targetConv ? targetConv.messages : []), userMessage];

    // Update conversation with user message and placeholder assistant message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== currentId) return c;
        return {
          ...c,
          updatedAt: Date.now(),
          messages: [...updatedHistory, emptyAssistantMessage]
        };
      })
    );

    // Mark conversation as streaming
    setStreamingIds((prev) => new Set(prev).add(currentId));

    const controller = new AbortController();
    const sessionData = {
      convId: currentId,
      abortController: controller,
      streamBuffer: '',
      activeAssistantMsg: '',
      isStreaming: true,
      timerId: null,
      animFrameId: null
    };
    activeStreamsRef.current.set(currentId, sessionData);

    // Reset user scroll state so viewport snaps to the new user prompt
    userScrolledUpRef.current = false;
    setTimeout(() => {
      if (activeIdRef.current === currentId) {
        scrollToBottom(true);
      }
    }, 10);

    startSessionTypewriterLoop(currentId);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: updatedHistory,
          model: currentModel,
          temperature: settings.temperature,
          max_tokens: settings.maxTokens,
          system_prompt: settings.systemPrompt || null
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let currentEvent = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.replace(/^event:\s*/, '');
          } else if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.replace(/^data:\s*/, '');
            try {
              const parsed = JSON.parse(dataStr);
              const session = activeStreamsRef.current.get(currentId);
              if (!session) break;

              if (currentEvent === 'exceeded' || parsed.status === 'exceeded') {
                session.isStreaming = false;
                const msg = parsed.message || 'Session token limit reached (2,048/2,048 tokens). Please click Reset Session to continue.';
                setConversations((prev) =>
                  prev.map((c) => {
                    if (c.id !== currentId) return c;
                    const updated = [...c.messages];
                    const lastIdx = updated.length - 1;
                    if (lastIdx >= 0 && updated[lastIdx].role === 'assistant') {
                      let content = session.activeAssistantMsg;
                      const codeFences = (content.match(/```/g) || []).length;
                      if (codeFences % 2 === 1) {
                        content += '\n```';
                        session.activeAssistantMsg = content;
                      }
                      updated[lastIdx] = {
                        ...updated[lastIdx],
                        content,
                        exceeded: true,
                        exceededMsg: msg
                      };
                    }
                    return { ...c, messages: updated, updatedAt: Date.now() };
                  })
                );
              } else if (parsed.token) {
                session.streamBuffer += parsed.token;
              } else if (parsed.status === 'completed') {
                session.isStreaming = false;
              } else if (parsed.error) {
                session.streamBuffer += `\n\n*[Error: ${parsed.error}]*`;
                session.isStreaming = false;
              }
            } catch {
              // Ignore non-json or control data
            }
            currentEvent = null;
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log(`Generation for conversation ${currentId} aborted by user.`);
      } else {
        console.error('Streaming error:', err);
        const session = activeStreamsRef.current.get(currentId);
        if (session) {
          session.streamBuffer += `\n\n*[Connection error: ${err.message}]*`;
        }
      }
    } finally {
      const session = activeStreamsRef.current.get(currentId);
      if (session) {
        session.isStreaming = false;
      }
    }
  };

  const handleRegenerate = () => {
    if (isCurrentStreaming || !activeConversation || messages.length === 0) return;
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;

    const actualIdx = messages.length - 1 - lastUserIdx;
    const lastUserPrompt = messages[actualIdx].content;

    // Prune messages up to that user prompt
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeId) return c;
        return {
          ...c,
          messages: c.messages.slice(0, actualIdx)
        };
      })
    );

    setTimeout(() => {
      handleSendMessage(lastUserPrompt);
    }, 50);
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all conversation history?')) {
      // Abort all active streams
      for (const [id] of activeStreamsRef.current) {
        handleStopGeneration(id);
      }
      if (currentUser) {
        for (const c of conversations) {
          syncDeleteConversation(c.id);
        }
      }
      setConversations([]);
      setActiveId(null);
      localStorage.removeItem(STORAGE_CONVERSATIONS);
      setSettingsOpen(false);
    }
  };

  const handleExportChats = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(conversations, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `chatgpt_history_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  if (authChecking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          color: 'var(--text-secondary)',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            border: '3px solid rgba(37, 99, 235, 0.2)',
            borderTopColor: 'var(--accent-color, #2563eb)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <span style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>Loading...</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  return (
    <div className="app-container">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        streamingIds={streamingIds}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((prev) => !prev)}
        onOpenSettings={() => setSettingsOpen(true)}
        activeModel={currentModel}
        user={currentUser}
        onOpenAuth={() => setAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenAdmin={() => setAdminModalOpen(true)}
        pendingCount={pendingCount}
      />

      <main className="main-chat">
        <Header
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          models={models}
          currentModel={currentModel}
          onSelectModel={setCurrentModel}
          onOpenSettings={() => setSettingsOpen(true)}
          tokenStats={tokenStats}
          onOpenTokenStats={() => setTokenStatsOpen(true)}
        />

        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className={`messages-container ${messages.length === 0 ? 'empty-state' : ''}`}
        >
          {messages.length === 0 ? (
            <div className="welcome-screen">
              <WelcomeHero />
              {tokenStats.isExceeded && (
                <div className="token-exceeded-banner">
                  <div className="token-exceeded-banner-text">
                    <AlertTriangle size={18} color="#ef4444" />
                    <span>
                      <strong>Session token limit reached ({tokenStats.total.toLocaleString()} / {tokenStats.maxSession.toLocaleString()} tokens).</strong> Please reset the session to continue chatting.
                    </span>
                  </div>
                  <div className="token-exceeded-banner-actions">
                    <button
                      type="button"
                      className="btn-banner-reset"
                      onClick={handleResetSession}
                      title="Reset this session to 0 tokens"
                    >
                      <RotateCcw size={14} />
                      <span>Reset Session</span>
                    </button>
                    <button
                      type="button"
                      className="btn-banner-new"
                      onClick={handleNewChat}
                      title="Start a new chat"
                    >
                      <Plus size={14} />
                      <span>New Chat</span>
                    </button>
                  </div>
                </div>
              )}
              <ChatInput
                input={input}
                setInput={setInput}
                onSend={() => handleSendMessage()}
                onStop={() => handleStopGeneration(activeId)}
                isStreaming={isCurrentStreaming}
                centered={true}
                tokenStats={tokenStats}
                onOpenTokenStats={() => setTokenStatsOpen(true)}
                isExceeded={tokenStats.isExceeded}
                onResetSession={handleResetSession}
              />
            </div>
          ) : (
            <div className="messages-inner">
              {messages.map((msg, index) => {
                const isLast = index === messages.length - 1;
                return (
                  <ChatMessage
                    key={index}
                    message={msg}
                    isStreaming={isLast && isCurrentStreaming}
                    onRegenerate={isLast && !isCurrentStreaming ? handleRegenerate : null}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {messages.length > 0 && (
          <div className="bottom-dock">
            {tokenStats.isExceeded && (
              <div className="token-exceeded-banner">
                <div className="token-exceeded-banner-text">
                  <AlertTriangle size={18} color="#ef4444" />
                  <span>
                    <strong>Session token limit reached ({tokenStats.total.toLocaleString()} / {tokenStats.maxSession.toLocaleString()} tokens).</strong> Chat is paused. Please click <strong>Reset Session</strong> or start a new chat to continue.
                  </span>
                </div>
                <div className="token-exceeded-banner-actions">
                  <button
                    type="button"
                    className="btn-banner-reset"
                    onClick={handleResetSession}
                    title="Clear messages in this session to reset tokens to 0"
                  >
                    <RotateCcw size={14} />
                    <span>Reset Session</span>
                  </button>
                  <button
                    type="button"
                    className="btn-banner-new"
                    onClick={handleNewChat}
                    title="Start a new chat"
                  >
                    <Plus size={14} />
                    <span>New Chat</span>
                  </button>
                </div>
              </div>
            )}
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={() => handleSendMessage()}
              onStop={() => handleStopGeneration(activeId)}
              isStreaming={isCurrentStreaming}
              tokenStats={tokenStats}
              onOpenTokenStats={() => setTokenStatsOpen(true)}
              isExceeded={tokenStats.isExceeded}
              onResetSession={handleResetSession}
            />
          </div>
        )}
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onClearAll={handleClearAll}
        onExportChats={handleExportChats}
        currentUser={currentUser}
        onOpenAdmin={() => setAdminModalOpen(true)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <TokenStatsModal
        isOpen={tokenStatsOpen}
        onClose={() => setTokenStatsOpen(false)}
        tokenStats={tokenStats}
        activeModel={currentModel}
        onResetSession={handleResetSession}
      />

      <AdminModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        currentUserId={currentUser?.id}
        onUserUpdated={fetchPendingCount}
      />
    </div>
  );
}
