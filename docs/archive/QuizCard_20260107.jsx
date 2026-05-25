import React from 'react';
import CodeBlock from './CodeBlock';
import './QuizCard.css';

const QuizCard = ({ question, currentIndex, totalQuestions }) => {
  const renderContent = (html) => {
    if (!html) return null;

    // 提取所有代码块（完整的v-md-pre-wrapper结构）
    const wrapperRegex = /<div class="v-md-pre-wrapper[^"]*">\s*<pre class="v-md-prism-language"><code>([\s\S]*?)<\/code><\/pre>\s*<\/div>\s*<\/div>/g;

    const parts = [];
    let lastIndex = 0;
    let match;
    let partIndex = 0;

    while ((match = wrapperRegex.exec(html)) !== null) {
      // 添加代码块之前的文本
      const textBefore = html.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        // 移除可能残留的空div
        const cleanText = textBefore.replace(/<div[^>]*>\s*<\/div>/g, '');
        if (cleanText.trim()) {
          parts.push(
            <div key={`text-${partIndex}`} dangerouslySetInnerHTML={{ __html: cleanText }} />
          );
          partIndex++;
        }
      }

      // 解码并添加代码块
      const codeContent = match[1]
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

      parts.push(<CodeBlock key={`code-${partIndex}`} code={codeContent} />);
      partIndex++;
      lastIndex = wrapperRegex.lastIndex;
    }

    // 添加最后剩余的文本
    const textAfter = html.substring(lastIndex);
    if (textAfter.trim()) {
      const cleanText = textAfter.replace(/<div[^>]*>\s*<\/div>/g, '');
      if (cleanText.trim()) {
        parts.push(
          <div key={`text-${partIndex}`} dangerouslySetInnerHTML={{ __html: cleanText }} />
        );
      }
    }

    // 如果成功提取到了代码块，返回parts
    if (parts.length > 0) {
      return <>{parts}</>;
    }

    // 回退：尝试简单的pre/code格式
    const simpleRegex = /<pre><code>([\s\S]*?)<\/code><\/pre>/g;
    parts.length = 0;
    partIndex = 0;
    lastIndex = 0;

    while ((match = simpleRegex.exec(html)) !== null) {
      const textBefore = html.substring(lastIndex, match.index);
      if (textBefore.trim()) {
        parts.push(
          <div key={`text-${partIndex}`} dangerouslySetInnerHTML={{ __html: textBefore }} />
        );
        partIndex++;
      }

      const codeContent = match[1]
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"');

      parts.push(<CodeBlock key={`code-${partIndex}`} code={codeContent} />);
      partIndex++;
      lastIndex = simpleRegex.lastIndex;
    }

    const textAfter2 = html.substring(lastIndex);
    if (textAfter2.trim()) {
      parts.push(
        <div key={`text-${partIndex}`} dangerouslySetInnerHTML={{ __html: textAfter2 }} />
      );
    }

    if (parts.length > 0) {
      return <>{parts}</>;
    }

    // 最终回退：直接显示HTML
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

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
          {renderContent(question.题目内容)}
        </div>
      </div>
    </div>
  );
};

export default QuizCard;
