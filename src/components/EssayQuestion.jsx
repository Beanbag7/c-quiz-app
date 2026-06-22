import React, { useState } from 'react';
import QuestionContent from './QuestionContent';
import MarkdownContent from './MarkdownContent';
import './EssayQuestion.css';

// 归一化参考答案：兼容 答案 / 答案文本 / 正确答案 三种字段来源
// 优先使用「答案文本」（解答题通常是结构化数组），其次「正确答案」，最后「答案」
// 返回字符串数组，便于统一渲染为列表
function normalizeReferenceAnswer(question) {
    const raw = question?.答案文本 ?? question?.正确答案 ?? question?.答案;
    if (raw === null || raw === undefined || raw === '') return [];
    if (Array.isArray(raw)) return raw.map((item) => String(item));
    return [String(raw)];
}

const MARKDOWN_IMAGE_REGEX = /!\[([^\]]*)\]\(([^)]+)\)/g;
const HTML_IMAGE_REGEX = /<img\b([^>]*)>/gi;

function removeEmbeddedImages(text) {
    return String(text ?? '')
        .replace(MARKDOWN_IMAGE_REGEX, '')
        .replace(HTML_IMAGE_REGEX, '')
        .trim();
}

function renderAnswerContent(text) {
    if (!text) return null;
    return <MarkdownContent content={text} />;
}

function EssayQuestion({ question, onNext, onScoreChange, onSkip, onPrevious, canGoPrevious = false }) {
    const [userAnswer, setUserAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [answerRevealed, setAnswerRevealed] = useState(false);
    const [score, setScore] = useState(0);

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

        // 去除图片语法，避免图片标签干扰关键词评分
        answerText = removeEmbeddedImages(answerText);

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

        const referenceAnswer = question?.答案文本 ?? question?.正确答案 ?? question?.答案;
        // 评分前去除图片语法
        let referenceAnswerForScore = referenceAnswer;
        if (Array.isArray(referenceAnswerForScore)) {
            referenceAnswerForScore = referenceAnswerForScore.map(s => removeEmbeddedImages(s));
        } else {
            referenceAnswerForScore = removeEmbeddedImages(referenceAnswerForScore);
        }
        const calculatedScore = calculateScore(userAnswer, referenceAnswerForScore);
        setScore(calculatedScore);
        setSubmitted(true);

        // 查看答案后的提交仅用于练习展示，不再改写父级统计。
        if (!answerRevealed && onScoreChange) {
            onScoreChange(calculatedScore);
        }
    };

    const handleNext = () => {
        onNext();
        // 重置状态留给父组件处理
    };

    const handleViewAnswer = () => {
        setAnswerRevealed(true);
        if (onScoreChange) {
            onScoreChange(0);
        }
    };

    const referenceAnswer = normalizeReferenceAnswer(question);
    const questionText = question.题目内容;
    const shouldShowReference = submitted || answerRevealed;

    return (
        <div className="essay-question">
            <div className="question-content">
                <h3 className="question-title">解答题 (满分5分)</h3>
                {questionText && <div className="question-text"><QuestionContent content={questionText} /></div>}
                {/* 题干图片（如有） */}
                {Array.isArray(question.题目图片) && question.题目图片.length > 0 && (
                    <div className="question-images">
                        {question.题目图片.map((src, i) => (
                            <img key={i} className="answer-image" src={src} alt={`题干图${i+1}`} loading="lazy" />
                        ))}
                    </div>
                )}
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

                    <div className="essay-action-buttons">
                        {!answerRevealed && (
                            <button
                                type="button"
                                className="essay-previous-button"
                                onClick={onPrevious}
                                disabled={!canGoPrevious}
                            >
                                ← 上一题
                            </button>
                        )}
                        <button
                            className="submit-button"
                            onClick={handleSubmit}
                            disabled={!userAnswer.trim()}
                        >
                            提交答案
                        </button>
                        {!answerRevealed && (
                            <button
                                type="button"
                                className="essay-view-answer-button"
                                onClick={handleViewAnswer}
                            >
                                查看答案
                            </button>
                        )}
                        {!answerRevealed && (
                            <button
                                type="button"
                                className="essay-skip-button"
                                onClick={onSkip}
                            >
                                跳过此题
                            </button>
                        )}
                    </div>
                </>
            )}

            {shouldShowReference && (
                <>
                    {submitted ? (
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
                    ) : (
                        <div className="answer-revealed-notice">
                            已查看参考答案，本题计为未掌握
                        </div>
                    )}

                    {submitted && (
                        <div className="user-answer-display">
                            <h4>您的答案：</h4>
                            <p className="user-answer-text">{userAnswer}</p>
                        </div>
                    )}

                    {referenceAnswer.length > 0 && (
                        <div className="answer-section">
                            <h4 className="answer-title">📖 参考答案</h4>
                            <div className="answer-content">
                                {referenceAnswer.length > 1 ? (
                                    <ol className="answer-list">
                                        {referenceAnswer.map((point, index) => (
                                            <li key={index} className="answer-point">
                                                {renderAnswerContent(point)}
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <div className="answer-text">{renderAnswerContent(referenceAnswer[0])}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {question.解析 && (
                        <div className="explanation-section">
                            <h4 className="explanation-title">💡 解析</h4>
                            <div className="explanation-text">
                                <MarkdownContent content={question.解析} />
                            </div>
                        </div>
                    )}

                    <div className="action-buttons">
                        <button
                            className="previous-button"
                            onClick={onPrevious}
                            disabled={!canGoPrevious}
                        >
                            ← 上一题
                        </button>
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
