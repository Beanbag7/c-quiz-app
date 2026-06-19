import React, { useEffect, useState } from 'react';

function Leaderboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/chat/leaderboard?limit=10');
        const data = await res.json();
        if (!cancelled && data.ok && Array.isArray(data.items)) {
          setItems(data.items);
        }
      } catch {} finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    const timer = setInterval(fetchData, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  if (loading || items.length === 0) return null;

  // 兜底给没名字的存 Redis 条目显示 userId 前 8 位
  const displayName = (item) => {
    const v = item.value || item.member || '';
    return v.length > 20 ? v.slice(0, 8) + '...' : v;
  };

  return (
    <div className="leaderboard">
      <h3 className="leaderboard-title">🏆 本周得分榜</h3>
      <ol className="leaderboard-list">
        {items.slice(0, 10).map((item, i) => (
          <li key={i} className={`leaderboard-item rank-${i + 1}`}>
            <span className="leaderboard-rank">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
            <span className="leaderboard-name">{displayName(item)}</span>
            <span className="leaderboard-score">{item.score} 分</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default Leaderboard;
