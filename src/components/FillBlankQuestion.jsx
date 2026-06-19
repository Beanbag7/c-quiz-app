import React, { useEffect, useRef } from 'react';
import './FillBlankQuestion.css';

// 统一归一化答案字段：兼容 答案 / 答案文本 / 正确答案 三种来源
// 优先使用「答案文本」（通常是已合并的展示文本），其次「正确答案」，最后「答案」
// 返回字符串数组（每个元素是一个答案项），便于统一展示与多空场景
function normalizeAnswer(question) {
    const raw = question?.答案文本 ?? question?.正确答案 ?? question?.答案;

    if (raw === null || raw === undefined || raw === '') return [];
    if (Array.isArray(raw)) return raw.map((item) => String(item));
    // 字符串：可能是单答案，也可能是已合并的多空答案（如 "N、U、L、L"），原样保留
    return [String(raw)];
}

// 将归一化后的答案格式化为展示文本：多答案用「、」连接
function formatAnswerDisplay(answerList) {
    if (!Array.isArray(answerList) || answerList.length === 0) return '-';
    return answerList.join('、');
}

function FillBlankQuestion({
    question,
    userAnswer,
    onAnswerChange,
    onSubmit,
    showAnswer,
    isCorrect,
    onViewAnswer,
    answerRevealed
}) {
    const inputRef = useRef(null);
    const questionKey = question?.题目ID ?? question?.序号 ?? question?.题目内容;

    useEffect(() => {
        if (showAnswer) return;

        const frameId = requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        });

        return () => cancelAnimationFrame(frameId);
    }, [questionKey, showAnswer]);

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (userAnswer && userAnswer.trim()) {
            onSubmit();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && userAnswer && userAnswer.trim()) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const answerContent = normalizeAnswer(question);

    return (
        <form className="fill-blank-question" onSubmit={handleSubmit}>
            <div className="question-content">
                <p>{question.题目内容}</p>
            </div>

            <div className="answer-input-section">
                <label htmlFor="fill-answer">您的答案：</label>
                <input
                    ref={inputRef}
                    id="fill-answer"
                    type="text"
                    className={`fill-input ${showAnswer ? (isCorrect ? 'correct' : 'wrong') : ''}`}
                    value={userAnswer || ''}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={showAnswer}
                    placeholder="请输入答案..."
                    autoFocus
                />
            </div>

            {/* 已查看答案但未提交时，显示正确答案，仍可输入提交 */}
            {answerRevealed && !showAnswer && (
                <div className="revealed-answer-section">
                    <span className="revealed-icon">👁</span> 正确答案：
                    <span className="answer-text">{formatAnswerDisplay(answerContent)}</span>
                </div>
            )}

            {!showAnswer && (
                <div className="fill-blank-actions">
                    <button
                        type="submit"
                        className="submit-button"
                        disabled={!userAnswer || !userAnswer.trim()}
                    >
                        提交答案
                    </button>
                    {!answerRevealed && (
                        <button
                            type="button"
                            className="view-answer-button"
                            onClick={onViewAnswer}
                        >
                            查看答案
                        </button>
                    )}
                </div>
            )}

            {showAnswer && (
                <div className={`feedback-section ${isCorrect ? 'correct' : 'wrong'}`}>
                    {isCorrect ? (
                        <div className="correct-feedback">
                            <span className="icon">✓</span> 回答正确！
                        </div>
                    ) : (
                        <div className="wrong-feedback">
                            <span className="icon">✗</span> 回答错误
                            <div className="correct-answer-display">
                                <strong>正确答案：</strong>
                                <span className="answer-text">{formatAnswerDisplay(answerContent)}</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </form>
    );
}

export default FillBlankQuestion;
