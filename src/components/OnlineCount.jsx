import { useVisitorPresence } from '../hooks/useVisitorPresence';

const scopeLabel = {
  home: '首页',
  quiz: '答题页'
};

function OnlineCount({ scope }) {
  const { onlineCount, error, observedAt } = useVisitorPresence(scope);

  return (
    <div className="online-count" title={observedAt ? `更新时间：${observedAt}` : undefined}>
      <span className="online-dot" aria-hidden="true"></span>
      <span>{scopeLabel[scope]}在线</span>
      {error ? (
        <span className="online-unavailable">暂不可用</span>
      ) : (
        <strong>{onlineCount === null ? '同步中' : `${onlineCount} 人`}</strong>
      )}
    </div>
  );
}

export default OnlineCount;
