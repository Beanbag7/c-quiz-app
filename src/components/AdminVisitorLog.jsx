import { useEffect, useState } from 'react';
import { banVisitorTarget, getAdminBans, getAdminVisitors, loginAdmin, unbanVisitorTarget } from '../services/visitorApi';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

// 相对时间：刚刚 / X 分钟前 / X 小时前 / X 天前
function formatRelativeTime(value) {
  if (!value) return '-';
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return '-';

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return formatDate(value);

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  return formatDate(value);
}

function formatBanText(banStatus) {
  const labels = [];
  if (banStatus?.deviceBan?.active) labels.push('设备已封禁');
  if (banStatus?.ipBan?.active) labels.push('IP 已封禁');
  return labels.length > 0 ? labels.join(' / ') : '正常';
}

function formatBanTargetType(targetType) {
  if (targetType === 'deviceId') return '设备';
  if (targetType === 'ipAddress') return 'IP';
  return targetType || '-';
}

function AdminVisitorLog() {
  const [password, setPassword] = useState('');
  const [items, setItems] = useState([]);
  const [bans, setBans] = useState([]);
  const [banReason, setBanReason] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [actionKey, setActionKey] = useState('');

  const loadVisitors = async () => {
    setLoading(true);
    setMessage('');
    try {
      const [visitorData, banData] = await Promise.all([
        getAdminVisitors(),
        getAdminBans()
      ]);
      setItems(Array.isArray(visitorData?.items) ? visitorData.items : []);
      setBans(Array.isArray(banData?.items) ? banData.items : []);
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

  const handleBanToggle = async ({ targetType, targetValue, active }) => {
    if (!targetValue || targetValue === 'unknown') return;

    const key = `${targetType}:${targetValue}`;
    setActionKey(key);
    setMessage('');

    try {
      if (active) {
        await unbanVisitorTarget({ targetType, targetValue });
      } else {
        const defaultReason = targetType === 'deviceId' ? '管理员封禁设备' : '管理员封禁 IP';
        await banVisitorTarget({
          targetType,
          targetValue,
          reason: banReason.trim() || defaultReason
        });
      }

      if (!active) setBanReason('');
      await loadVisitors();
    } catch (error) {
      setMessage(error.message || '封禁操作失败');
    } finally {
      setActionKey('');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-panel">
        <div className="admin-header">
          <div>
            <h1>访客日志</h1>
            <p>仅管理员可查看真实 IP、设备标识、中文来源地与封禁状态。</p>
          </div>
          <a className="admin-home-link" href="#home">返回首页</a>
        </div>

        {!authenticated ? (
          <div className="admin-login-shell">
            <div className="admin-login-copy">
              <h2>管理员登录</h2>
              <p>登录后可查看访问来源、真实 IP、设备 ID，并执行设备/IP 封禁。</p>
            </div>
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
                {loading ? '验证中...' : '登录查看日志'}
              </button>
              {message && <p className="admin-message error">{message}</p>}
            </form>
          </div>
        ) : (
          <div className="visitor-log">
            <div className="visitor-log-actions">
              <span>最近访客记录</span>
              <button type="button" onClick={loadVisitors} disabled={loading}>
                {loading ? '刷新中...' : '刷新'}
              </button>
            </div>

            {message && <p className="admin-message error">{message}</p>}

            <div className="ban-reason-card">
              <label htmlFor="ban-reason">封禁原因</label>
              <input
                id="ban-reason"
                type="text"
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                placeholder="例如：异常刷题、恶意访问、手动测试"
              />
              <p>点击“封禁设备”或“封禁 IP”时会记录这个原因；留空则使用默认原因。</p>
            </div>

            {!loading && items.length === 0 ? (
              <div className="empty-log">暂无访客记录</div>
            ) : (
              <div className="visitor-table-wrap">
                <table className="visitor-table">
                  <thead>
                    <tr>
                      <th>设备</th>
                      <th>网络位置</th>
                      <th>活跃情况</th>
                      <th>封禁状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const deviceBanActive = Boolean(item.banStatus?.deviceBan?.active);
                      const ipBanActive = Boolean(item.banStatus?.ipBan?.active);
                      const deviceActionKey = `deviceId:${item.deviceId || item.visitorId}`;
                      const ipActionKey = `ipAddress:${item.ipAddress}`;
                      const openCount = item.ipPageOpenCount ?? item.heartbeatCount ?? 0;
                      const hasLocation = Boolean(item.locationText && item.locationText.trim());

                      return (
                        <tr key={item.visitorId} className={item.banStatus?.isBanned ? 'banned-visitor-row' : ''}>
                          <td>
                            <div className="device-cell">
                              <strong>{item.deviceLabel || '未知设备'}</strong>
                              <span>{item.deviceId || item.visitorId}</span>
                            </div>
                          </td>
                          <td>
                            <div className="network-cell">
                              <strong>{item.ipAddress || '-'}</strong>
                              {hasLocation && <span>{item.locationText}</span>}
                            </div>
                          </td>
                          <td>
                            <div className="activity-cell">
                              <strong>{formatRelativeTime(item.lastSeenAt)}</strong>
                              <span className="activity-meta">
                                首次 {formatRelativeTime(item.firstSeenAt)} · {openCount} 次 · {item.lastScope || '-'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className={item.banStatus?.isBanned ? 'ban-status active' : 'ban-status'}>
                              {formatBanText(item.banStatus)}
                            </span>
                          </td>
                          <td>
                            <div className="ban-actions">
                              <button
                                type="button"
                                className={deviceBanActive ? 'unban-button' : 'ban-button'}
                                disabled={actionKey === deviceActionKey}
                                onClick={() => handleBanToggle({
                                  targetType: 'deviceId',
                                  targetValue: item.deviceId || item.visitorId,
                                  active: deviceBanActive
                                })}
                              >
                                {deviceBanActive ? '解封设备' : '封禁设备'}
                              </button>
                              <button
                                type="button"
                                className={ipBanActive ? 'unban-button' : 'ban-button secondary'}
                                disabled={!item.ipAddress || item.ipAddress === 'unknown' || actionKey === ipActionKey}
                                onClick={() => handleBanToggle({
                                  targetType: 'ipAddress',
                                  targetValue: item.ipAddress,
                                  active: ipBanActive
                                })}
                              >
                                {ipBanActive ? '解封 IP' : '封禁 IP'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="ban-list-section">
              <div className="visitor-log-actions compact">
                <span>封禁列表</span>
                <strong>{bans.filter((ban) => ban.active).length} 个生效</strong>
              </div>

              {bans.length === 0 ? (
                <div className="empty-log">暂无封禁记录</div>
              ) : (
                <div className="visitor-table-wrap">
                  <table className="visitor-table ban-list-table">
                    <thead>
                      <tr>
                        <th>类型</th>
                        <th>目标</th>
                        <th>状态</th>
                        <th>原因</th>
                        <th>创建时间</th>
                        <th>更新时间</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bans.map((ban) => {
                        const key = `${ban.targetType}:${ban.targetValue}`;

                        return (
                          <tr key={key} className={ban.active ? 'banned-visitor-row' : ''}>
                            <td>{formatBanTargetType(ban.targetType)}</td>
                            <td>{ban.targetValue}</td>
                            <td>
                              <span className={ban.active ? 'ban-status active' : 'ban-status'}>
                                {ban.active ? '生效中' : '已解封'}
                              </span>
                            </td>
                            <td>{ban.reason || '-'}</td>
                            <td>{formatDate(ban.createdAt)}</td>
                            <td>{formatDate(ban.updatedAt || ban.revokedAt)}</td>
                            <td>
                              <button
                                type="button"
                                className={ban.active ? 'unban-button' : 'ban-button'}
                                disabled={actionKey === key}
                                onClick={() => handleBanToggle({
                                  targetType: ban.targetType,
                                  targetValue: ban.targetValue,
                                  active: ban.active
                                })}
                              >
                                {ban.active ? '解封' : '重新封禁'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminVisitorLog;
