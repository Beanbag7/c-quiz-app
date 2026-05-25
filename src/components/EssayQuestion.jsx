import React, { useState, useEffect } from 'react';
import './EssayQuestion.css';

function EssayQuestion({ question, onNext, onScoreChange }) {
    const [userAnswer, setUserAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [score, setScore] = useState(0);

    // 当题目变化时重置状态
    useEffect(() => {
        setUserAnswer('');
        setSubmitted(false);
        setScore(0);
    }, [question]);

    // 改进的智能评分算法
    const calculateScore = (userAns, correctAnswers) => {
        if (!userAns || userAns.trim().length === 0) {
            return 0;
        }

        const userText = userAns.toLowerCase().trim();

        // 获取标准答案文本
        let answerText = '';
        if (Array.isArray(correctAnswers)) {
            answerText = correctAnswers.join(' ');
        } else {
            answerText = correctAnswers;
        }

        // 改进的关键词提取（提取所有有意义的词组）
        const stopWords = new Set([
            '的', '了', '在', '是', '和', '与', '或', '要', '将', '可以', '能够',
            '应该', '必须', '进行', '实现', '完成', '包括', '通过', '为了', '因为',
            '所以', '但是', '然而', '如果', '那么', '这个', '那个', '一个', '这些',
            '那些', '有', '没有', '不', '也', '都', '就', '才', '还', '又', '从', '到'
        ]);

        // 提取1-4字的中文词组作为关键词
        const keywords = new Set();
        for (let len = 4; len >= 1; len--) {
            const regex = new RegExp(`[\\u4e00-\\u9fa5]{${len}}`, 'g');
            const matches = answerText.match(regex) || [];
            matches.forEach(word => {
                if (!stopWords.has(word) && word.length >= 2) {
                    keywords.add(word);
                }
            });
        }

        // 计算匹配度（支持部分匹配）
        let totalScore = 0;
        const keywordArray = Array.from(keywords);

        keywordArray.forEach(keyword => {
            if (userText.includes(keyword)) {
                totalScore += 1; // 完全匹配得1分
            } else {
                // 部分匹配：如果用户答案包含关键词的一半以上字符
                const halfLen = Math.ceil(keyword.length / 2);
                for (let i = 0; i <= keyword.length - halfLen; i++) {
                    const substr = keyword.substring(i, i + halfLen);
                    if (userText.includes(substr)) {
                        totalScore += 0.3; // 部分匹配得0.3分
                        break;
                    }
                }
            }
        });

        // 关键词覆盖率
        const coverage = keywordArray.length > 0 ? totalScore / keywordArray.length : 0;

        // 长度评分（更宽松的标准）
        const minLength = Math.min(answerText.length * 0.3, 50); // 至少30%长度或50字
        const lengthScore = userText.length >= minLength ? 1 : userText.length / minLength;

        // 综合评分（关键词60%，长度20%，基础分20%）
        const finalScore = (coverage * 0.6 + lengthScore * 0.2 + 0.2) * 5;

        // 确保最低1分（只要写了就有分）
        const minScore = userText.length > 10 ? 1 : 0.5;

        // 四舍五入到0.5分
        return Math.max(minScore, Math.round(finalScore * 2) / 2);
    };

    const handleSubmit = () => {
        if (!userAnswer.trim()) return;

        const calculatedScore = calculateScore(userAnswer, question.答案);
        setScore(calculatedScore);
        setSubmitted(true);

        // 通知父组件分数变化
        if (onScoreChange) {
            onScoreChange(calculatedScore);
        }
    };

    const handleNext = () => {
        onNext();
        // 重置状态留给父组件处理
    };

    return (
        <div className="essay-question">
            <div className="question-content">
                <h3 className="question-title">解答题 (满分5分)</h3>
                <p className="question-text">{question.题目内容}</p>
            </div>

            {!submitted && (
                <>
                    <div className="answer-input-section">
                        <label htmlFor="essay-answer">您的答案：</label>
                        <textarea
                            id="essay-answer"
                            className="essay-textarea"
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            placeholder="请输入您的答案..."
                            rows={8}
                            autoFocus
                        />
                        <div className="char-count">
                            {userAnswer.length} 字
                        </div>
                    </div>

                    <button
                        className="submit-button"
                        onClick={handleSubmit}
                        disabled={!userAnswer.trim()}
                    >
                        提交答案
                    </button>
                </>
            )}

            {submitted && (
                <>
                    <div className="score-display">
                        <div className={`score-badge ${score >= 4 ? 'excellent' : score >= 3 ? 'good' : score >= 2 ? 'fair' : 'poor'}`}>
                            <span className="score-label">得分</span>
                            <span className="score-value">{score}</span>
                            <span className="score-max">/ 5</span>
                        </div>
                        {score >= 4 && <p className="score-message">✨ 优秀！</p>}
                        {score >= 3 && score < 4 && <p className="score-message">👍 良好</p>}
                        {score >= 2 && score < 3 && <p className="score-message">📝 合格</p>}
                        {score < 2 && <p className="score-message">💪 需要加强</p>}
                    </div>

                    <div className="user-answer-display">
                        <h4>您的答案：</h4>
                        <p className="user-answer-text">{userAnswer}</p>
                    </div>

                    <div className="answer-section">
                        <h4 className="answer-title">📖 参考答案</h4>
                        <div className="answer-content">
                            {Array.isArray(question.答案) ? (
                                <ol className="answer-list">
                                    {question.答案.map((point, index) => (
                                        <li key={index} className="answer-point">
                                            {point}
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="answer-text">{question.答案}</p>
                            )}
                        </div>
                    </div>

                    {question.解析 && (
                        <div className="explanation-section">
                            <h4 className="explanation-title">💡 解析</h4>
                            <p className="explanation-text">{question.解析}</p>
                        </div>
                    )}

                    <div className="action-buttons">
                        <button className="next-button" onClick={handleNext}>
                            下一题 →
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default EssayQuestion;
