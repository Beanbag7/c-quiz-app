import React from 'react';
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

    // Parse HTML content safely
    const createMarkup = (html) => {
        return { __html: html };
    };

    return (
        <button
            className={getClassName()}
            onClick={onClick}
            disabled={disabled}
        >
            <span className="option-key">{optionKey}</span>
            <span
                className="option-text"
                dangerouslySetInnerHTML={createMarkup(optionText)}
            />
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
