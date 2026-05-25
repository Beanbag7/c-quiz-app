import React from 'react';
import './Statistics.css';

const Statistics = ({ totalQuestions, answeredQuestions, correctAnswers }) => {
    const accuracy = answeredQuestions > 0
        ? Math.round((correctAnswers / answeredQuestions) * 100)
        : 0;

    return (
        <div className="statistics-panel">
            <h3 className="statistics-title">答题统计</h3>
            <div className="statistics-grid">
                <div className="stat-item">
                    <div className="stat-value">{totalQuestions}</div>
                    <div className="stat-label">总题数</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value stat-primary">{answeredQuestions}</div>
                    <div className="stat-label">已答题</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value stat-success">{correctAnswers}</div>
                    <div className="stat-label">正确</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value stat-error">{answeredQuestions - correctAnswers}</div>
                    <div className="stat-label">错误</div>
                </div>
            </div>
            <div className="accuracy-section">
                <div className="accuracy-label">正确率</div>
                <div className="accuracy-value">{accuracy}%</div>
                <div className="accuracy-bar">
                    <div
                        className="accuracy-fill"
                        style={{ width: `${accuracy}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default Statistics;
