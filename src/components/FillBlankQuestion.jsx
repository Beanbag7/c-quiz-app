import React, { useEffect, useRef } from 'react';
import CodeBlock from './CodeBlock';
import QuestionContent from './QuestionContent';
import MarkdownContent from './MarkdownContent';
import { parseFillBlankAnswerItems } from '../utils/fillBlankAnswer';
import './FillBlankQuestion.css';

function splitQuestionCode(content) {
    const text = String(content ?? '');
    const candidates = [
        text.indexOf('typedef'),
        text.indexOf('struct '),
        text.search(/\b(?:int|void|char|float|double)\s+[A-Za-z_]\w*\s*\(/),
    ].filter((index) => index >= 0);

    if (candidates.length === 0) return null;

    const codeStart = Math.min(...candidates);
    return {
        intro: text.slice(0, codeStart).trim(),
        code: text.slice(codeStart).trim(),
    };
}

function formatQuestionCode(code) {
    const formatted = String(code ?? '')
        .replace(/\s+/g, ' ')
        .replace(/\s*(typedef\s+struct\b)/g, '$1')
        .replace(/\s*(struct\s+[A-Za-z_]\w*\s*\*)/g, '\n  $1')
        .replace(/\s*}\s*([A-Za-z_]\w*;)/g, '\n} $1\n')
        .replace(/\s*(int|void|char|float|double)\s+([A-Za-z_]\w*\s*\()/g, '\n$1 $2')
        .replace(/\s*(\{)\s*/g, ' $1\n  ')
        .replace(/(\/\/.*?)(\s+)([A-Za-z_]\w*\s*=\s*\()/g, '$1\n$3')
        .replace(/(\/\/.*?)(\s+)(return\b)/g, '$1\n$3')
        .replace(/\s*(else)\s*/g, '\nelse ')
        .replace(/\s*(\/\/[^\n]*)/g, '\n  $1')
        .replace(/\s*(;)\s*/g, '$1\n  ')
        .replace(/\s*(\})(?!\s*[A-Za-z_]\w*;)\s*/g, '\n}\n')
        .replace(/\n\s*\n+/g, '\n')
        .trim();

    return formatted
        .split('\n')
        .reduce((lines, line) => {
            const trimmed = line.trim();
            if (!trimmed) return lines;

            let indentLevel = lines.indentLevel;
            if (trimmed.startsWith('}')) {
                indentLevel = Math.max(0, indentLevel - 1);
            }

            lines.output.push(`${'  '.repeat(indentLevel)}${trimmed}`);

            if (trimmed.endsWith('{')) {
                indentLevel += 1;
            }
            lines.indentLevel = indentLevel;
            return lines;
        }, { output: [], indentLevel: 0 }).output
        .join('\n');
}

function renderFillBlankQuestionContent(content) {
    const split = splitQuestionCode(content);
    if (!split) return <QuestionContent content={content} />;

    return (
        <>
            {split.intro && <p>{split.intro}</p>}
            <CodeBlock code={formatQuestionCode(split.code)} />
        </>
    );
}

// 将归一化后的答案格式化为展示文本：多答案用「、」连接
function formatAnswerDisplay(answerList) {
    if (!Array.isArray(answerList) || answerList.length === 0) return '-';
    return answerList.join('、');
}

function AnswerMarkdown({ answers }) {
    return <MarkdownContent content={formatAnswerDisplay(answers)} />;
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
    const inputRefs = useRef([]);
    const questionKey = question?.题目ID ?? question?.序号 ?? question?.题目内容;
    const answerContent = parseFillBlankAnswerItems(question);
    const isMultiBlank = answerContent.length > 1;
    const userAnswers = Array.isArray(userAnswer) ? userAnswer : [];
    const singleAnswer = Array.isArray(userAnswer) ? userAnswer.join('、') : (userAnswer || '');

    const getUserAnswerAt = (index) => userAnswers[index] || '';
    const hasSubmittableAnswer = isMultiBlank
        ? answerContent.every((_, index) => getUserAnswerAt(index).trim())
        : singleAnswer.trim();

    useEffect(() => {
        if (showAnswer) return;

        const frameId = requestAnimationFrame(() => {
            const firstInput = isMultiBlank ? inputRefs.current[0] : inputRef.current;
            firstInput?.focus();
            firstInput?.select();
        });

        return () => cancelAnimationFrame(frameId);
    }, [questionKey, showAnswer, isMultiBlank]);

    const handleSubmit = (e) => {
        e?.preventDefault();
        if (hasSubmittableAnswer) {
            onSubmit();
        }
    };

    const handleAnswerChange = (index, value) => {
        const nextAnswers = answerContent.map((_, itemIndex) =>
            itemIndex === index ? value : getUserAnswerAt(itemIndex)
        );
        onAnswerChange(nextAnswers);
    };

    const handleKeyDown = (e, index = 0) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (isMultiBlank && index < answerContent.length - 1) {
                inputRefs.current[index + 1]?.focus();
                inputRefs.current[index + 1]?.select();
                return;
            }
            if (hasSubmittableAnswer) {
                handleSubmit(e);
            }
        }
    };

    return (
        <form className="fill-blank-question" onSubmit={handleSubmit}>
            <div className="question-content">
                {renderFillBlankQuestionContent(question.题目内容)}
            </div>

            <div className="answer-input-section">
                <label htmlFor="fill-answer">您的答案：</label>
                {isMultiBlank ? (
                    <div className="fill-input-list">
                        {answerContent.map((_, index) => (
                            <div className="fill-input-row" key={`${questionKey}-${index}`}>
                                <span className="fill-input-label">第 {index + 1} 空</span>
                                <input
                                    ref={(el) => { inputRefs.current[index] = el; }}
                                    id={index === 0 ? 'fill-answer' : undefined}
                                    type="text"
                                    className={`fill-input ${showAnswer ? (isCorrect ? 'correct' : 'wrong') : ''}`}
                                    value={getUserAnswerAt(index)}
                                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    disabled={showAnswer}
                                    placeholder={`请输入第 ${index + 1} 空...`}
                                    autoFocus={index === 0}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <input
                        ref={inputRef}
                        id="fill-answer"
                        type="text"
                        className={`fill-input ${showAnswer ? (isCorrect ? 'correct' : 'wrong') : ''}`}
                        value={singleAnswer}
                        onChange={(e) => onAnswerChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={showAnswer}
                        placeholder="请输入答案..."
                        autoFocus
                    />
                )}
            </div>

            {/* 已查看答案但未提交时，显示正确答案，仍可输入提交 */}
            {answerRevealed && !showAnswer && (
                <div className="revealed-answer-section">
                    <span className="revealed-label">
                        <span className="revealed-icon">👁</span> 正确答案：
                    </span>
                    <div className="answer-text"><AnswerMarkdown answers={answerContent} /></div>
                </div>
            )}

            {!showAnswer && (
                <div className="fill-blank-actions">
                    <button
                        type="submit"
                        className="submit-button"
                        disabled={!hasSubmittableAnswer}
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
                                <div className="answer-text"><AnswerMarkdown answers={answerContent} /></div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </form>
    );
}

export default FillBlankQuestion;
