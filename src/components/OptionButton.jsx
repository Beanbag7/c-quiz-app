import React from 'react';
import MarkdownContent from './MarkdownContent';
import './OptionButton.css';

const OptionButton = ({
    optionKey,
    optionText,
    isSelected,
    isCorrect,
    isWrong,
    disabled,
    onClick
}) => {
    const getClassName = () => {
        let className = 'option-button';
        if (isSelected) className += ' selected';
        if (isCorrect) className += ' correct';
        if (isWrong) className += ' wrong';
        if (disabled) className += ' disabled';
        return className;
    };

    return (
        <button
            className={getClassName()}
            onClick={onClick}
            disabled={disabled}
        >
            <span className="option-key">{optionKey}</span>
            <div className="option-text">
                <MarkdownContent content={optionText} />
            </div>
            {isCorrect && (
                <span className="feedback-icon">✓</span>
            )}
            {isWrong && (
                <span className="feedback-icon">✗</span>
            )}
        </button>
    );
};

export default OptionButton;
