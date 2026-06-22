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

export function getCurrentAnnouncement() {
  return request('/api/announcements/current');
}

export function getAdminAnnouncement() {
  return request('/api/admin/announcement');
}

export function saveAdminAnnouncement(payload) {
  return request('/api/admin/announcement', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export function clearAdminAnnouncement() {
  return request('/api/admin/announcement', {
    method: 'DELETE'
  });
}
