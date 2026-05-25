import { useEffect, useState } from 'react';
import { sendVisitorHeartbeat } from '../services/visitorApi';

const HEARTBEAT_INTERVAL_MS = 20000;

function readOnlineCount(payload, scope) {
  const count = payload?.online?.[scope];
  return typeof count === 'number' ? count : null;
}

export function useVisitorPresence(scope) {
  const [onlineCount, setOnlineCount] = useState(null);
  const [error, setError] = useState(null);
  const [observedAt, setObservedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let timerId = null;

    const heartbeat = async () => {
      if (document.visibilityState !== 'visible') return;

      try {
        const payload = await sendVisitorHeartbeat(scope);
        if (cancelled) return;
        setOnlineCount(readOnlineCount(payload, scope));
        setObservedAt(new Date().toISOString());
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setOnlineCount(null);
        setError(err.message || '在线人数暂不可用');
      }
    };

    const startHeartbeat = () => {
      heartbeat();
      timerId = window.setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        heartbeat();
      }
    };

    startHeartbeat();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      if (timerId) window.clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [scope]);

  return { onlineCount, error, observedAt };
}
