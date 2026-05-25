import { useEffect, useState } from 'react';
import { getAdminVisitors, loginAdmin } from '../services/visitorApi';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function AdminVisitorLog() {
  const [password, setPassword] = useState('');
  const [items, setItems] = useState([]);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadVisitors = async () => {
    setLoading(true);
    setMessage('');
    try {
      const data = await getAdminVisitors();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setAuthenticated(true);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        setAuthenticated(false);
      } else {
        setMessage(error.message || '访客日志加载失败');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(loadVisitors, 0);
    return () => window.clearTimeout(timerId);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setMessage('');
    try {
      const result = await loginAdmin(password);
      if (!result?.authenticated) {
        setAuthenticated(false);
        setMessage('管理员密码不正确');
        return;
      }
      setPassword('');
      await loadVisitors();
    } catch (error) {
      setAuthenticated(false);
      setMessage(error.message || '管理员登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-panel">
        <div className="admin-header">
          <div>
            <h1>访客日志</h1>
            <p>仅管理员可查看脱敏 IP 与粗粒度来源地。</p>
          </div>
          <a className="admin-home-link" href="#home">返回首页</a>
        </div>

        {!authenticated ? (
          <form className="admin-login" onSubmit={handleSubmit}>
            <label htmlFor="admin-password">管理员密码</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="请输入管理员密码"
            />
            <button type="submit" disabled={loading || !password.trim()}>
              {loading ? '验证中...' : '登录查看'}
            </button>
            {message && <p className="admin-message error">{message}</p>}
          </form>
        ) : (
          <div className="visitor-log">
            <div className="visitor-log-actions">
              <span>最近访客记录</span>
              <button type="button" onClick={loadVisitors} disabled={loading}>
                {loading ? '刷新中...' : '刷新'}
              </button>
            </div>

            {message && <p className="admin-message error">{message}</p>}

            {!loading && items.length === 0 ? (
              <div className="empty-log">暂无访客记录</div>
            ) : (
              <div className="visitor-table-wrap">
                <table className="visitor-table">
                  <thead>
                    <tr>
                      <th>访客</th>
                      <th>脱敏 IP</th>
                      <th>来源地</th>
                      <th>最后页面</th>
                      <th>首次访问</th>
                      <th>最后活跃</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.visitorId}>
                        <td>{item.visitorId}</td>
                        <td>{item.maskedIp || '-'}</td>
                        <td>{[item.country, item.region, item.city].filter(Boolean).join(' / ') || '-'}</td>
                        <td>{item.lastScope || '-'}</td>
                        <td>{formatDate(item.firstSeenAt)}</td>
                        <td>{formatDate(item.lastSeenAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminVisitorLog;
