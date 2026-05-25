import React from 'react';
import './ProgressBar.css';

function ProgressBar({ current, total }) {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

    return (
        <div className="progress-bar-container">
            <div className="progress-header">
                <span className="progress-label">答题进度</span>
                <span className="progress-count">{current} / {total} 题</span>
                <span className="progress-percentage">{percentage}%</span>
            </div>
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${percentage}%` }}
                >
                    <div className="progress-shine"></div>
                </div>
            </div>
        </div>
    );
}

export default ProgressBar;
