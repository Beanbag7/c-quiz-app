import { useEffect, useState } from 'react';

// 统一在线人数数据源：来自 WebSocket 连接数（/api/chat/online）
// 与聊天室实时在线人数一致

function OnlineCount() {
  const [count, setCount] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const res = await fetch('/api/chat/online');
        const data = await res.json();
        if (!cancelled && data.ok) {
          setCount(data.onlineCount ?? 0);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };

    fetchCount();
    const timer = setInterval(fetchCount, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  return (
    <div className="online-count">
      <span className="online-dot" aria-hidden="true"></span>
      <span>在线</span>
      {error ? (
        <span className="online-unavailable">暂不可用</span>
      ) : (
        <strong>{count === null ? '同步中' : `${count} 人`}</strong>
      )}
    </div>
  );
}

export default OnlineCount;
