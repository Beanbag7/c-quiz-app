import React from 'react';
import './FillBlankQuestion.css';

function FillBlankQuestion({
    question,
    userAnswer,
    onAnswerChange,
    onSubmit,
    showAnswer,
    isCorrect
}) {
    const handleSubmit = () => {
        if (userAnswer && userAnswer.trim()) {
            onSubmit();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && userAnswer && userAnswer.trim()) {
            onSubmit();
        }
    };

    const answerContent = question.答案 ?? question.答案文本 ?? question.正确答案;

    return (
        <div className="fill-blank-question">
            <div className="question-content">
                <p>{question.题目内容}</p>
            </div>

            <div className="answer-input-section">
                <label htmlFor="fill-answer">您的答案：</label>
                <input
                    id="fill-answer"
                    type="text"
                    className={`fill-input ${showAnswer ? (isCorrect ? 'correct' : 'wrong') : ''}`}
                    value={userAnswer || ''}
                    onChange={(e) => onAnswerChange(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={showAnswer}
                    placeholder="请输入答案..."
                    autoFocus
                />
            </div>

            {!showAnswer && (
                <button
                    className="submit-button"
                    onClick={handleSubmit}
                    disabled={!userAnswer || !userAnswer.trim()}
                >
                    提交答案
                </button>
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
                                {Array.isArray(answerContent) ? (
                                    <ul>
                                        {answerContent.map((ans, index) => (
                                            <li key={index}>{ans}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <span className="answer-text">{answerContent}</span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default FillBlankQuestion;
