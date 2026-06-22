import { useEffect, useState } from 'react';
import { sendVisitorHeartbeat } from '../services/visitorApi';

// 在线用户数据来自访客心跳，后端会返回脱敏 IP 与地区。

function OnlineCount({ scope = 'home' }) {
  const [count, setCount] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refreshPresence = async () => {
      try {
        const data = await sendVisitorHeartbeat(scope);
        if (!cancelled && data?.online) {
          setCount(data.online.total ?? 0);
          setUsers(Array.isArray(data.users) ? data.users : []);
          setError(false);
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
          setError(true);
        }
      }
    };

    refreshPresence();
    const timer = setInterval(refreshPresence, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [scope]);

  return (
    <div className="online-count">
      <span className="online-dot" aria-hidden="true"></span>
      <span>在线</span>
      {error ? (
        <span className="online-unavailable">暂不可用</span>
      ) : (
        <strong>{count === null ? '同步中' : `${count} 人`}</strong>
      )}
      {!error && users.length > 0 && (
        <div className="online-user-list" aria-label="在线用户列表">
          {users.map((user) => (
            <div className="online-user-item" key={user.visitorId}>
              <span className="online-user-ip">{user.maskedIp || 'unknown'}</span>
              <span className="online-user-location">{user.locationText || '未知地区'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default OnlineCount;
