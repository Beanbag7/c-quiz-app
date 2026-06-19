const API_BASE = import.meta.env.VITE_VISITOR_API_BASE_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export function getQuizBanks() {
  return request('/api/quiz/banks');
}

export function getAdminQuizBanks() {
  return request('/api/admin/quiz/banks');
}

export function createQuizBank(data) {
  return request('/api/admin/quiz/banks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateQuizBank(id, data) {
  return request(`/api/admin/quiz/banks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteQuizBank(id) {
  return request(`/api/admin/quiz/banks/${id}`, {
    method: 'DELETE',
  });
}

export function getBankQuestions(bankId) {
  return request(`/api/admin/quiz/banks/${bankId}/questions`);
}

export function importBankQuestions(bankId, questions) {
  return request(`/api/admin/quiz/banks/${bankId}/import`, {
    method: 'POST',
    body: JSON.stringify({ questions }),
  });
}

export function deleteBankQuestion(bankId, questionId) {
  return request(`/api/admin/quiz/banks/${bankId}/questions/${questionId}`, {
    method: 'DELETE',
  });
}
