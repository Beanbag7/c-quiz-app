import { useCallback, useEffect, useState } from 'react';
import {
  clearAdminAnnouncement,
  getAdminAnnouncement,
  saveAdminAnnouncement
} from '../services/announcementApi.js';
import { loginAdmin } from '../services/visitorApi.js';

const emptyForm = {
  title: '',
  content: '',
  level: 'info',
  active: true
};

function AdminAnnouncementManager() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');

  const showMessage = (text, type = 'error') => {
    setMessage(text);
    setMessageType(type);
  };

  const applyAnnouncement = (announcement) => {
    setForm({
      title: announcement?.title || '',
      content: announcement?.content || '',
      level: announcement?.level || 'info',
      active: announcement ? Boolean(announcement.active) : true
    });
  };

  const loadAnnouncement = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const result = await getAdminAnnouncement();
      applyAnnouncement(result?.announcement);
      setAuthenticated(true);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setAuthenticated(false);
      } else {
        showMessage(error.message || '公告加载失败');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(loadAnnouncement, 0);
    return () => window.clearTimeout(timerId);
  }, [loadAnnouncement]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setMessage('');
    try {
      const result = await loginAdmin(password);
      if (!result?.authenticated) {
        setAuthenticated(false);
        showMessage('管理员密码不正确');
        return;
      }
      setPassword('');
      await loadAnnouncement();
    } catch (error) {
      setAuthenticated(false);
      showMessage(error.message || '管理员登录失败');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    if (!form.title.trim() && !form.content.trim()) {
      showMessage('标题和内容至少填写一项');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const result = await saveAdminAnnouncement(form);
      applyAnnouncement(result?.announcement);
      showMessage(form.active ? '公告已发布' : '公告已保存但未上线', 'success');
    } catch (error) {
      showMessage(error.message || '公告保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setMessage('');
    try {
      const result = await clearAdminAnnouncement();
      applyAnnouncement(result?.announcement);
      showMessage('公告已下线', 'success');
    } catch (error) {
      showMessage(error.message || '公告下线失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-panel">
        <div className="admin-header">
          <div>
            <h1>前端公告</h1>
            <p>发布后会展示在题库选择页，适合放维护通知、考试提醒和临时说明。</p>
          </div>
          <a className="admin-home-link" href="#home">返回首页</a>
        </div>

        {!authenticated ? (
          <div className="admin-login-shell">
            <div className="admin-login-copy">
              <h2>管理员登录</h2>
              <p>登录后可发布、保存或下线首页公告。</p>
            </div>
            <form className="admin-login" onSubmit={handleLogin}>
              <label htmlFor="announcement-admin-password">管理员密码</label>
              <input
                id="announcement-admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="请输入管理员密码"
              />
              <button type="submit" disabled={loading || !password.trim()}>
                {loading ? '验证中...' : '登录管理公告'}
              </button>
              {message && <p className={`admin-message ${messageType}`}>{message}</p>}
            </form>
          </div>
        ) : (
          <form className="announcement-admin-form" onSubmit={handleSave}>
            <div className="announcement-admin-grid">
              <label>
                公告标题
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => updateField('title', event.target.value)}
                  maxLength={80}
                  placeholder="例如：今晚 22:00 系统维护"
                />
              </label>
              <label>
                公告级别
                <select value={form.level} onChange={(event) => updateField('level', event.target.value)}>
                  <option value="info">普通</option>
                  <option value="success">成功</option>
                  <option value="warning">提醒</option>
                  <option value="danger">重要</option>
                </select>
              </label>
            </div>

            <label>
              公告内容
              <textarea
                value={form.content}
                onChange={(event) => updateField('content', event.target.value)}
                maxLength={1200}
                rows={6}
                placeholder="输入需要展示给前端用户的公告内容"
              />
            </label>

            <label className="announcement-active-toggle">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => updateField('active', event.target.checked)}
              />
              立即在前端展示
            </label>

            <div className="announcement-preview-block">
              <span>前端预览</span>
              <section className={`announcement-banner ${form.level}`}>
                <div className="announcement-label">公告</div>
                <div className="announcement-body">
                  <h2>{form.title || '公告标题'}</h2>
                  <p>{form.content || '公告内容会显示在这里。'}</p>
                </div>
              </section>
            </div>

            {message && <p className={`admin-message ${messageType}`}>{message}</p>}

            <div className="announcement-admin-actions">
              <button type="submit" disabled={saving || (!form.title.trim() && !form.content.trim())}>
                {saving ? '保存中...' : '发布/保存公告'}
              </button>
              <button type="button" className="secondary" onClick={loadAnnouncement} disabled={saving || loading}>
                刷新
              </button>
              <button type="button" className="danger" onClick={handleClear} disabled={saving}>
                下线公告
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default AdminAnnouncementManager;
