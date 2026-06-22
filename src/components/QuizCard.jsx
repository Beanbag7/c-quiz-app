import React from 'react';
import QuestionContent from './QuestionContent';
import './QuizCard.css';

const QuizCard = ({ question, currentIndex, totalQuestions }) => {
  return (
    <div className="quiz-card">
      <div className="quiz-header">
        <div className="question-number">
          题目 {currentIndex + 1} / {totalQuestions}
        </div>
        <div className="question-type-badge">
          {question.题目类型}
        </div>
      </div>

      <div className="question-content">
        <div className="question-text">
          <QuestionContent content={question.题目内容} />
        </div>
      </div>
    </div>
  );
};

export default QuizCard;
