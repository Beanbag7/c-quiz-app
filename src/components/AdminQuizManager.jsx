import { useEffect, useMemo, useState } from 'react';
import {
  getAdminQuizBanks,
  createQuizBank,
  updateQuizBank,
  deleteQuizBank,
  getBankQuestions,
  importBankQuestions,
  deleteBankQuestion
} from '../services/quizApi.js';
import { loginAdmin } from '../services/visitorApi.js';

const emptyBankForm = {
  subjectKey: '',
  name: '',
  icon: '📖',
  sortOrder: 0
};

const emptyEditForm = {
  name: '',
  icon: '',
  sortOrder: 0
};

function truncateText(value, maxLength = 80) {
  if (!value) return '-';
  const text = String(value).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function formatAnswer(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (Array.isArray(value)) return value.join('、');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function extractBanks(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.banks)) return result.banks;
  return [];
}

function extractQuestions(result) {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.questions)) return result.questions;
  if (Array.isArray(result?.items)) return result.items;
  return [];
}

function AdminQuizManager() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [visibleQuestionCount, setVisibleQuestionCount] = useState(20);
  const [bankForm, setBankForm] = useState(emptyBankForm);
  const [editBankId, setEditBankId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [importBank, setImportBank] = useState(null);
  const [importText, setImportText] = useState('');
  const [loading, setLoading] = useState(true);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [actionKey, setActionKey] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');

  const visibleQuestions = useMemo(
    () => questions.slice(0, visibleQuestionCount),
    [questions, visibleQuestionCount]
  );

  const showError = (text) => {
    setMessageType('error');
    setMessage(text);
  };

  const showSuccess = (text) => {
    setMessageType('success');
    setMessage(text);
  };

  const loadBanks = async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await getAdminQuizBanks();
      const nextBanks = extractBanks(result);
      setBanks(nextBanks);
      setAuthenticated(true);
      if (selectedBank) {
        const refreshedBank = nextBanks.find((bank) => bank.id === selectedBank.id);
        setSelectedBank(refreshedBank || null);
      }
    } catch (error) {
      if (error.status === 401 || error.status === 403 || error.message === 'HTTP 401' || error.message === 'HTTP 403') {
        setAuthenticated(false);
      } else {
        showError(error.message || '题库列表加载失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (bank) => {
    if (!bank?.id) return;
    setSelectedBank(bank);
    setQuestionLoading(true);
    setVisibleQuestionCount(20);
    setMessage('');
    try {
      const result = await getBankQuestions(bank.id);
      setQuestions(extractQuestions(result));
      setAuthenticated(true);
    } catch (error) {
      if (error.status === 401 || error.status === 403 || error.message === 'HTTP 401' || error.message === 'HTTP 403') {
        setAuthenticated(false);
      } else {
        showError(error.message || '题目加载失败');
      }
    } finally {
      setQuestionLoading(false);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(loadBanks, 0);
    return () => window.clearTimeout(timerId);
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setMessage('');
    try {
      const result = await loginAdmin(password);
      if (!result?.authenticated) {
        setAuthenticated(false);
        showError('管理员密码不正确');
        return;
      }
      setPassword('');
      await loadBanks();
    } catch (error) {
      setAuthenticated(false);
      showError(error.message || '管理员登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBank = async (event) => {
    event.preventDefault();
    if (!bankForm.subjectKey.trim() || !bankForm.name.trim()) return;

    setActionKey('create-bank');
    setMessage('');
    try {
      await createQuizBank({
        subjectKey: bankForm.subjectKey.trim(),
        name: bankForm.name.trim(),
        icon: bankForm.icon.trim() || '📖',
        sortOrder: Number(bankForm.sortOrder) || 0
      });
      setBankForm(emptyBankForm);
      showSuccess('题库创建成功');
      await loadBanks();
    } catch (error) {
      showError(error.message || '题库创建失败');
    } finally {
      setActionKey('');
    }
  };

  const startEditBank = (bank) => {
    setEditBankId(bank.id);
    setEditForm({
      name: bank.name || '',
      icon: bank.icon || '📖',
      sortOrder: bank.sortOrder ?? 0
    });
    setMessage('');
  };

  const handleUpdateBank = async (bankId) => {
    if (!editForm.name.trim()) return;

    const key = `update-bank:${bankId}`;
    setActionKey(key);
    setMessage('');
    try {
      await updateQuizBank(bankId, {
        name: editForm.name.trim(),
        icon: editForm.icon.trim() || '📖',
        sortOrder: Number(editForm.sortOrder) || 0
      });
      setEditBankId(null);
      showSuccess('题库信息已更新');
      await loadBanks();
    } catch (error) {
      showError(error.message || '题库更新失败');
    } finally {
      setActionKey('');
    }
  };

  const handleDeleteBank = async (bank) => {
    if (!window.confirm(`确认删除题库「${bank.name}」？该操作会删除题库下所有题目。`)) return;

    const key = `delete-bank:${bank.id}`;
    setActionKey(key);
    setMessage('');
    try {
      await deleteQuizBank(bank.id);
      if (selectedBank?.id === bank.id) {
        setSelectedBank(null);
        setQuestions([]);
      }
      showSuccess('题库已删除');
      await loadBanks();
    } catch (error) {
      showError(error.message || '题库删除失败');
    } finally {
      setActionKey('');
    }
  };

  const openImportModal = (bank) => {
    setImportBank(bank);
    setImportText('');
    setMessage('');
  };

  const closeImportModal = () => {
    setImportBank(null);
    setImportText('');
  };

  const handleImportQuestions = async (event) => {
    event.preventDefault();
    if (!importBank?.id || !importText.trim()) return;

    setActionKey(`import-bank:${importBank.id}`);
    setMessage('');
    try {
      const parsedData = JSON.parse(importText);
      if (!Array.isArray(parsedData?.questions)) {
        showError('JSON 必须包含 questions 数组');
        return;
      }
      await importBankQuestions(importBank.id, parsedData.questions);
      showSuccess(`已导入 ${parsedData.questions.length} 道题目`);
      closeImportModal();
      await loadBanks();
      if (selectedBank?.id === importBank.id) {
        await loadQuestions(importBank);
      }
    } catch (error) {
      showError(error instanceof SyntaxError ? 'JSON 格式不正确' : (error.message || '题目导入失败'));
    } finally {
      setActionKey('');
    }
  };

  const handleDeleteQuestion = async (question) => {
    if (!selectedBank?.id || !question?.id) return;
    if (!window.confirm(`确认删除第 ${question['序号'] || question.id} 题？`)) return;

    const key = `delete-question:${question.id}`;
    setActionKey(key);
    setMessage('');
    try {
      await deleteBankQuestion(selectedBank.id, question.id);
      setQuestions((current) => current.filter((item) => item.id !== question.id));
      showSuccess('题目已删除');
      await loadBanks();
    } catch (error) {
      showError(error.message || '题目删除失败');
    } finally {
      setActionKey('');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-panel">
        <div className="admin-header">
          <div>
            <h1>题库管理</h1>
            <p>管理 MySQL 题库、批量导入 JSON 题目，并查看每个题库的题目明细。</p>
          </div>
          <a className="admin-home-link" href="#home">返回首页</a>
        </div>

        {!authenticated ? (
          <div className="admin-login-shell">
            <div className="admin-login-copy">
              <h2>管理员登录</h2>
              <p>登录后可创建、编辑、删除题库，并导入 MySQL 题目数据。</p>
            </div>
            <form className="admin-login" onSubmit={handleLogin}>
              <label htmlFor="admin-quiz-password">管理员密码</label>
              <input
                id="admin-quiz-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="请输入管理员密码"
              />
              <button type="submit" disabled={loading || !password.trim()}>
                {loading ? '验证中...' : '登录管理题库'}
              </button>
              {message && <p className="admin-message error">{message}</p>}
            </form>
          </div>
        ) : (
          <div className="visitor-log">
            <div className="visitor-log-actions">
              <span>题库列表</span>
              <button type="button" onClick={loadBanks} disabled={loading}>
                {loading ? '刷新中...' : '刷新题库'}
              </button>
            </div>

            {message && (
              <p className={messageType === 'error' ? 'admin-message error' : 'ban-status'}>
                {message}
              </p>
            )}

            <form className="ban-reason-card" onSubmit={handleCreateBank}>
              <label htmlFor="bank-subject-key">创建新题库</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
                <input
                  id="bank-subject-key"
                  type="text"
                  value={bankForm.subjectKey}
                  onChange={(event) => setBankForm((current) => ({ ...current, subjectKey: event.target.value }))}
                  placeholder="subjectKey"
                />
                <input
                  type="text"
                  value={bankForm.name}
                  onChange={(event) => setBankForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="题库名称"
                />
                <input
                  type="text"
                  value={bankForm.icon}
                  onChange={(event) => setBankForm((current) => ({ ...current, icon: event.target.value }))}
                  placeholder="图标 Emoji"
                />
                <input
                  type="number"
                  value={bankForm.sortOrder}
                  onChange={(event) => setBankForm((current) => ({ ...current, sortOrder: event.target.value }))}
                  placeholder="排序"
                />
              </div>
              <div className="visitor-log-actions compact" style={{ marginTop: 4, marginBottom: 0 }}>
                <span>subjectKey 用于前台路由与题库识别</span>
                <button
                  type="submit"
                  disabled={actionKey === 'create-bank' || !bankForm.subjectKey.trim() || !bankForm.name.trim()}
                >
                  {actionKey === 'create-bank' ? '创建中...' : '创建题库'}
                </button>
              </div>
            </form>

            {loading && banks.length === 0 ? (
              <div className="empty-log">题库加载中...</div>
            ) : banks.length === 0 ? (
              <div className="empty-log">暂无题库</div>
            ) : (
              <div className="type-cards" style={{ maxWidth: 'none', marginBottom: 28 }}>
                {banks.map((bank) => {
                  const isEditing = editBankId === bank.id;
                  const isSelected = selectedBank?.id === bank.id;

                  return (
                    <div
                      key={bank.id}
                      className="type-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => !isEditing && loadQuestions(bank)}
                      onKeyDown={(event) => {
                        if (!isEditing && (event.key === 'Enter' || event.key === ' ')) loadQuestions(bank);
                      }}
                      style={isSelected ? { borderColor: 'var(--primary-blue)' } : undefined}
                    >
                      {isEditing ? (
                        <div className="admin-login" style={{ maxWidth: 'none' }} onClick={(event) => event.stopPropagation()}>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                            placeholder="题库名称"
                          />
                          <input
                            type="text"
                            value={editForm.icon}
                            onChange={(event) => setEditForm((current) => ({ ...current, icon: event.target.value }))}
                            placeholder="图标 Emoji"
                          />
                          <input
                            type="number"
                            value={editForm.sortOrder}
                            onChange={(event) => setEditForm((current) => ({ ...current, sortOrder: event.target.value }))}
                            placeholder="排序"
                          />
                          <div className="ban-actions">
                            <button
                              type="button"
                              className="unban-button"
                              disabled={actionKey === `update-bank:${bank.id}` || !editForm.name.trim()}
                              onClick={() => handleUpdateBank(bank.id)}
                            >
                              保存
                            </button>
                            <button type="button" className="ban-button secondary" onClick={() => setEditBankId(null)}>
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="type-icon">{bank.icon || '📖'}</div>
                          <h3>{bank.name}</h3>
                          <p className="type-count"><span>{bank.questionCount ?? 0}</span> 道题</p>
                          <div className="subject-stats">
                            <span className="stat-badge">Key：{bank.subjectKey}</span>
                            <span className="stat-badge">排序：{bank.sortOrder ?? 0}</span>
                          </div>
                          <div className="ban-actions" style={{ justifyContent: 'center', marginTop: 18 }} onClick={(event) => event.stopPropagation()}>
                            <button type="button" className="unban-button" onClick={() => loadQuestions(bank)}>
                              查看题目
                            </button>
                            <button type="button" className="ban-button secondary" onClick={() => openImportModal(bank)}>
                              导入 JSON
                            </button>
                            <button type="button" className="ban-button secondary" onClick={() => startEditBank(bank)}>
                              编辑
                            </button>
                            <button
                              type="button"
                              className="ban-button"
                              disabled={actionKey === `delete-bank:${bank.id}`}
                              onClick={() => handleDeleteBank(bank)}
                            >
                              删除
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="ban-list-section">
              <div className="visitor-log-actions compact">
                <span>{selectedBank ? `${selectedBank.name} · 题目预览` : '题目预览'}</span>
                {selectedBank && <strong>{questions.length} 道题</strong>}
              </div>

              {!selectedBank ? (
                <div className="empty-log">点击题库卡片查看题目</div>
              ) : questionLoading ? (
                <div className="empty-log">题目加载中...</div>
              ) : questions.length === 0 ? (
                <div className="empty-log">当前题库暂无题目</div>
              ) : (
                <>
                  <div className="visitor-table-wrap">
                    <table className="visitor-table">
                      <thead>
                        <tr>
                          <th>序号</th>
                          <th>题型</th>
                          <th>内容</th>
                          <th>正确答案</th>
                          <th>操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleQuestions.map((question, index) => (
                          <tr key={question.id || `${selectedBank.id}-${index}`}>
                            <td>{question['序号'] ?? index + 1}</td>
                            <td>{question['题目类型'] || '-'}</td>
                            <td>{truncateText(question['题目内容'])}</td>
                            <td>{truncateText(formatAnswer(question['正确答案']), 40)}</td>
                            <td>
                              <button
                                type="button"
                                className="ban-button"
                                disabled={actionKey === `delete-question:${question.id}`}
                                onClick={() => handleDeleteQuestion(question)}
                              >
                                删除题目
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {visibleQuestionCount < questions.length && (
                    <div className="navigation-buttons">
                      <button
                        type="button"
                        className="next-btn"
                        onClick={() => setVisibleQuestionCount((count) => count + 20)}
                      >
                        加载更多（{Math.min(visibleQuestionCount, questions.length)} / {questions.length}）
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {importBank && (
        <div className="modal-overlay">
          <form className="result-modal" onSubmit={handleImportQuestions}>
            <h2>导入 {importBank.name}</h2>
            <div className="ban-reason-card" style={{ margin: '0 0 20px' }}>
              <label htmlFor="import-json">粘贴 JSON：{'{ "questions": [...] }'}</label>
              <textarea
                id="import-json"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder='{"questions":[{"序号":1,"题目类型":"单选题","题目内容":"...","正确答案":"A"}]}'
                rows={12}
                style={{ width: '100%', resize: 'vertical', padding: 14, borderRadius: 12, border: '1px solid #D1D5DB', fontSize: 14 }}
              />
              <p>导入会替换该题库现有题目，请确认 JSON 内容无误。</p>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={closeImportModal}>
                取消
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={actionKey === `import-bank:${importBank.id}` || !importText.trim()}
              >
                {actionKey === `import-bank:${importBank.id}` ? '导入中...' : '确认导入'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminQuizManager;
