const API_BASE_URL = (import.meta.env.VITE_VISITOR_API_BASE_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const message = body?.error || body?.message || `请求失败：${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return body;
}

export function sendVisitorHeartbeat(scope) {
  return request('/api/visitors/heartbeat', {
    method: 'POST',
    body: JSON.stringify({ scope })
  });
}

export function loginAdmin(password) {
  return request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password })
  });
}

export function getAdminVisitors() {
  return request('/api/admin/visitors');
}

export function getAdminBans() {
  return request('/api/admin/bans');
}

export function banVisitorTarget({ targetType, targetValue, reason = '', expiresAt = '' }) {
  return request('/api/admin/bans', {
    method: 'POST',
    body: JSON.stringify({ targetType, targetValue, reason, expiresAt })
  });
}

export function unbanVisitorTarget({ targetType, targetValue }) {
  return request('/api/admin/bans', {
    method: 'DELETE',
    body: JSON.stringify({ targetType, targetValue })
  });
}
