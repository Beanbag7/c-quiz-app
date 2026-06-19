import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ChatWidget.css';

const STORAGE_KEY = 'cq_chat_sender';
const RECONNECT_DELAY = 3000;
const HISTORY_LIMIT = 50;
const EMOJIS = ['😂', '👍', '💯', '🎉', '🤔', '🔥', '💪', '👀'];

function getWsUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function getOrPromptName() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  const name = window.prompt('输入你的聊天昵称（留空则匿名）：')?.trim().slice(0, 12);
  const final = name || '匿名用户';
  localStorage.setItem(STORAGE_KEY, final);
  return final;
}

function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [sender, setSender] = useState(() => getOrPromptName());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unread, setUnread] = useState(0);
  const [connected, setConnected] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [danmakuList, setDanmakuList] = useState([]);

  const wsRef = useRef(null);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const danmakuIdRef = useRef(0);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 同步历史消息
  useEffect(() => {
    fetch(`/api/chat/messages?limit=${HISTORY_LIMIT}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok && Array.isArray(data.messages)) {
          setMessages(data.messages);
          requestAnimationFrame(scrollToBottom);
        }
      })
      .catch(() => {});
    // 初始化在线人数
    fetch('/api/chat/online')
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setOnlineCount(data.onlineCount || 0);
          if (Array.isArray(data.onlineUsers)) setOnlineUsers(data.onlineUsers);
        }
      })
      .catch(() => {});
  }, [scrollToBottom]);

  // WebSocket 连接
  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        if (cancelled) { ws.close(); return; }
        setConnected(true);
        ws.send(JSON.stringify({ type: 'join', sender }));
      };

      ws.onmessage = (event) => {
        if (cancelled) return;
        try {
          const msg = JSON.parse(event.data);
          setMessages(prev => [...prev, msg]);
          if (!open && msg.type === 'message') setUnread(c => c + 1);
          if (msg.onlineCount !== undefined) setOnlineCount(msg.onlineCount);
          if (Array.isArray(msg.onlineUsers)) setOnlineUsers(msg.onlineUsers);
          if (open) requestAnimationFrame(scrollToBottom);
          // 弹幕
          if (msg.type === 'message') {
            const id = ++danmakuIdRef.current;
            const topPct = 10 + Math.random() * 70;
            const duration = 8 + Math.random() * 5;
            setDanmakuList(prev => [...prev, { id, sender: msg.sender, text: msg.text, top: topPct, duration }]);
            setTimeout(() => setDanmakuList(prev => prev.filter(d => d.id !== id)), duration * 1000 + 500);
          }
        } catch {}
      };

      ws.onclose = () => {
        if (cancelled) return;
        setConnected(false);
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY);
      };
      ws.onerror = () => {};
    }

    connect();
    return () => {
      cancelled = true;
      clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
    };
  }, [sender, open, scrollToBottom]);

  // 发送消息
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'message', text }));
    setInput('');
  }, [input]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // @ 提及
  const handleUserClick = useCallback((name) => {
    setInput(prev => (prev ? prev + ' ' : '') + `@${name} `);
    setShowUsers(false);
    inputRef.current?.focus();
  }, []);

  // emoji
  const handleEmoji = useCallback((emoji) => {
    setInput(prev => prev + emoji);
    inputRef.current?.focus();
  }, []);

  const handleToggle = useCallback(() => {
    setOpen(prev => {
      if (!prev) {
        setUnread(0);
        requestAnimationFrame(scrollToBottom);
      }
      return !prev;
    });
    setShowUsers(false);
  }, [scrollToBottom]);

  return (
    <div className="chat-widget">
      {/* 弹幕层 */}
      <div className="danmaku-layer">
        {danmakuList.map(d => (
          <div key={d.id} className="danmaku-item" style={{ top: `${d.top}%`, animationDuration: `${d.duration}s` }}>
            <span className="danmaku-sender">{d.sender}</span>
            <span className="danmaku-text">{d.text}</span>
          </div>
        ))}
      </div>

      {!open && (
        <button className="chat-bubble" onClick={handleToggle} aria-label="打开聊天">
          <span className="chat-bubble-icon">💬</span>
          {unread > 0 && <span className="chat-bubble-badge">{unread > 99 ? '99+' : unread}</span>}
        </button>
      )}

      {open && (
        <div className={`chat-panel ${connected ? '' : 'disconnected'}`}>
          {/* 标题栏 + 在线用户列表 */}
          <div className="chat-header" onClick={() => setShowUsers(s => !s)} title="点击查看在线用户">
            <span className="chat-header-title">在线聊天 · {onlineCount} 人在线</span>
            <span className={`chat-header-status ${connected ? 'online' : 'offline'}`}>
              {connected ? '' : '重连中'}
            </span>
            <button className="chat-close" onClick={(e) => { e.stopPropagation(); handleToggle(); }}>✕</button>
          </div>

          {/* 在线用户列表 */}
          {showUsers && onlineUsers.length > 0 && (
            <div className="chat-users-dropdown">
              {onlineUsers.map((name, i) => (
                <button key={i} className="chat-user-item" onClick={() => handleUserClick(name)}>
                  <span className="chat-user-dot"></span>
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* 消息列表 */}
          <div className="chat-messages">
            {messages.map((msg) => {
              if (msg.type === 'join' || msg.type === 'leave') {
                return (
                  <div key={msg.id} className="chat-message system">
                    <span className="chat-system-text">{msg.text}</span>
                  </div>
                );
              }
              const isSelf = msg.sender === sender;
              return (
                <div key={msg.id} className={`chat-message ${isSelf ? 'self' : 'other'}`}>
                  {!isSelf && (
                    <span className="chat-sender" onClick={() => handleUserClick(msg.sender)} title="点击 @ 提及">
                      {msg.sender}
                    </span>
                  )}
                  <div className={`chat-bubble-text ${isSelf ? 'self' : 'other'}`}>{msg.text}</div>
                  <span className="chat-time">{formatTime(msg.timestamp)}</span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* emoji 快捷栏 */}
          <div className="chat-emoji-bar">
            {EMOJIS.map(emoji => (
              <button key={emoji} className="chat-emoji-btn" onClick={() => handleEmoji(emoji)}>{emoji}</button>
            ))}
          </div>

          {/* 输入区 */}
          <div className="chat-input-area">
            <textarea
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={connected ? '输入消息...' : '连接中...'}
              rows={1}
              disabled={!connected}
              maxLength={500}
            />
            <button className="chat-send" onClick={handleSend} disabled={!connected || !input.trim()}>发送</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWidget;
