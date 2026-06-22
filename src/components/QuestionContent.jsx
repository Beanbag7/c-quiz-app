import React from 'react';
import CodeBlock from './CodeBlock';
import MarkdownContent from './MarkdownContent';

const VM_CODE_BLOCK_PATTERN = '<div class="v-md-pre-wrapper[^"]*">\\s*<pre class="v-md-prism-language"><code>([\\s\\S]*?)<\\/code><\\/pre>\\s*<\\/div>\\s*<\\/div>';
const SIMPLE_CODE_BLOCK_PATTERN = '<pre><code>([\\s\\S]*?)<\\/code><\\/pre>';
const INLINE_CODE_START_PATTERNS = [
  /\btypedef\s+struct\b/,
  /\btypedef\b/,
  /\bstruct\s+[A-Za-z_]\w*\s*\{/,
  /\b(?:int|char|float|double)\s+[A-Za-z_]\w*(?:\[[^\]]+\])?\s*=/,
  /\b(?:int|void|char|float|double)\s+[A-Za-z_][\w\s*]*\(/,
];
const TRAILING_PROSE_AFTER_CODE_REGEX = /^([\s\S]*\})\s+((?:对于|已知|若|给定|请|要求|其中|试|则|计算|画出|写出|求)[\s\S]*)$/;
const IMAGE_TAG_REGEX = /<img\b/i;
const IMAGE_TAG_SPLIT_REGEX = /<img\b[^>]*>/gi;
const HTML_SRC_ATTR_REGEX = /\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i;
const HTML_ALT_ATTR_REGEX = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const HTML_STYLE_ATTR_REGEX = /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const MARKDOWN_HINT_REGEX = /(^|\n)\s*\|.+\|\s*\n\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?|(^|\n)\s*[-*]\s+|(^|\n)\s*\d+\.\s+|!\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*/m;

function decodeHtml(text) {
  return String(text ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function renderHtmlWithCodeBlocks(html, regex) {
  const parts = [];
  let lastIndex = 0;
  let match;
  let partIndex = 0;
  let hasCodeBlock = false;

  while ((match = regex.exec(html)) !== null) {
    hasCodeBlock = true;
    const textBefore = html.substring(lastIndex, match.index);
    if (textBefore.trim()) {
      const cleanText = textBefore.replace(/<div[^>]*>\s*<\/div>/g, '');
      if (cleanText.trim()) {
        parts.push(<div key={`text-${partIndex++}`} dangerouslySetInnerHTML={{ __html: cleanText }} />);
      }
    }

    parts.push(<CodeBlock key={`code-${partIndex++}`} code={decodeHtml(match[1])} />);
    lastIndex = regex.lastIndex;
  }

  if (!hasCodeBlock) return null;

  const textAfter = html.substring(lastIndex);
  if (textAfter.trim()) {
    const cleanText = textAfter.replace(/<div[^>]*>\s*<\/div>/g, '');
    if (cleanText.trim()) {
      parts.push(<div key={`text-${partIndex++}`} dangerouslySetInnerHTML={{ __html: cleanText }} />);
    }
  }

  return parts.length > 0 ? parts : null;
}

function getHtmlAttr(attrs, regex) {
  const match = String(attrs ?? '').match(regex);
  if (!match) return '';
  return match[1] || match[2] || match[3] || '';
}

function normalizeImageSrc(src) {
  const source = String(src ?? '').trim();
  if (!source || /^(?:https?:)?\/\//i.test(source) || source.startsWith('/')) return source;
  return `/${source}`;
}

function renderImageTag(tag, key) {
  const src = normalizeImageSrc(getHtmlAttr(tag, HTML_SRC_ATTR_REGEX));
  if (!src) return null;
  const inlineStyle = getHtmlAttr(tag, HTML_STYLE_ATTR_REGEX);
  const maxWidthMatch = inlineStyle.match(/\bmax-width\s*:\s*([^;]+)/i);
  const widthMatch = inlineStyle.match(/\bwidth\s*:\s*([^;]+)/i);
  const sourceMaxWidth = (maxWidthMatch?.[1] || widthMatch?.[1] || '').trim();
  const imageStyle = sourceMaxWidth
    ? { maxWidth: `min(100%, ${sourceMaxWidth})` }
    : undefined;

  return (
    <figure className="question-image-frame" key={key}>
      <img
        className="question-inline-image"
        src={src}
        alt={getHtmlAttr(tag, HTML_ALT_ATTR_REGEX) || '题目图片'}
        loading="lazy"
        style={imageStyle}
        onLoad={(event) => {
          const image = event.currentTarget;
          const figure = image.closest('.question-image-frame');
          if (figure && image.naturalHeight > 0 && image.naturalHeight <= 80) {
            figure.dataset.compact = 'true';
          }
        }}
        onError={(event) => {
          const figure = event.currentTarget.closest('.question-image-frame');
          if (figure) figure.dataset.loadError = 'true';
          event.currentTarget.style.display = 'none';
        }}
      />
    </figure>
  );
}

function splitInlineCode(text) {
  const source = String(text ?? '');
  const matches = INLINE_CODE_START_PATTERNS
    .map((pattern) => {
      const match = source.match(pattern);
      return match && match.index !== undefined ? match.index : -1;
    })
    .filter((index) => index >= 0);

  if (matches.length === 0) {
    return { text: source, code: '' };
  }

  const codeStart = Math.min(...matches);
  const codeAndTail = source.slice(codeStart).trim();
  const trailingProseMatch = codeAndTail.match(TRAILING_PROSE_AFTER_CODE_REGEX);

  return {
    text: source.slice(0, codeStart).trim(),
    code: trailingProseMatch ? trailingProseMatch[1].trim() : codeAndTail,
    afterText: trailingProseMatch ? trailingProseMatch[2].trim() : '',
  };
}

function formatInlineCode(code) {
  const initializerTokens = [];
  const forHeaderTokens = [];
  const source = String(code ?? '')
    .replace(/=\s*\{([^{}]*)\}/g, (_, initializer) => {
      const token = `@@CQINIT${initializerTokens.length}@@`;
      initializerTokens.push({ token, value: `={${initializer.trim()}}` });
      return token;
    })
    .replace(/\bfor\s*\(([^)]*)\)/g, (header) => {
      const token = `@@CQFOR${forHeaderTokens.length}@@`;
      forHeaderTokens.push({ token, value: header.replace(/\s+/g, ' ').trim() });
      return token;
    });

  const formatted = source
    .replace(/\s+/g, ' ')
    .replace(/\s*(typedef\s+struct\b)/g, '$1')
    .replace(/\s*(struct\s+[A-Za-z_]\w*\s*\*)/g, '\n  $1')
    .replace(/\s*}\s*([A-Za-z_]\w*;)/g, '\n} $1\n')
    .replace(/\s*(int|void|char|float|double)\s+([A-Za-z_]\w*\s*\()/g, '\n$1 $2')
    .replace(/\s*(\{)\s*/g, ' $1\n  ')
    .replace(/(\/\/.*?)(\s+)([A-Za-z_]\w*\s*=\s*\()/g, '$1\n$3')
    .replace(/(\/\/.*?)(\s+)(return\b)/g, '$1\n$3')
    .replace(/\s*(else)\s*/g, '\n$1 ')
    .replace(/\s*(\/\/[^\n]*)/g, '\n  $1')
    .replace(/\s*(;)\s*/g, '$1\n  ')
    .replace(/\s*(\})(?!\s*[A-Za-z_]\w*;)\s*/g, '\n$1\n')
    .replace(/\n\s*\n+/g, '\n')
    .trim();

  const result = formatted
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

  return [...initializerTokens, ...forHeaderTokens].reduce(
    (nextCode, { token, value }) => nextCode.replace(token, value),
    result
  );
}

function renderTextContent(rawContent, keyPrefix = 'content') {
  const vmParts = renderHtmlWithCodeBlocks(rawContent, new RegExp(VM_CODE_BLOCK_PATTERN, 'g'));
  if (vmParts) return vmParts.map((node, index) => <React.Fragment key={`${keyPrefix}-vm-${index}`}>{node}</React.Fragment>);

  const simpleParts = renderHtmlWithCodeBlocks(rawContent, new RegExp(SIMPLE_CODE_BLOCK_PATTERN, 'g'));
  if (simpleParts) return simpleParts.map((node, index) => <React.Fragment key={`${keyPrefix}-simple-${index}`}>{node}</React.Fragment>);

  const { text, code, afterText } = splitInlineCode(rawContent);
  if (code) {
    return [
      text ? <p key={`${keyPrefix}-text`}>{text}</p> : null,
      <CodeBlock key={`${keyPrefix}-code`} code={formatInlineCode(code)} />,
      afterText ? <p key={`${keyPrefix}-after`}>{afterText}</p> : null,
    ].filter(Boolean);
  }

  if (MARKDOWN_HINT_REGEX.test(rawContent)) {
    return <MarkdownContent key={`${keyPrefix}-markdown`} content={rawContent} />;
  }

  return <p key={`${keyPrefix}-plain`}>{rawContent}</p>;
}

function renderContentWithImages(rawContent) {
  const nodes = [];
  let lastIndex = 0;
  let match;
  let index = 0;

  while ((match = IMAGE_TAG_SPLIT_REGEX.exec(rawContent)) !== null) {
    const textBefore = rawContent.slice(lastIndex, match.index).trim();
    if (textBefore) {
      nodes.push(renderTextContent(textBefore, `text-${index}`));
    }

    const imageNode = renderImageTag(match[0], `image-${index}`);
    if (imageNode) nodes.push(imageNode);
    lastIndex = IMAGE_TAG_SPLIT_REGEX.lastIndex;
    index += 1;
  }

  const textAfter = rawContent.slice(lastIndex).trim();
  if (textAfter) {
    nodes.push(renderTextContent(textAfter, `text-${index}`));
  }

  return nodes.length > 0 ? nodes.flat() : null;
}

const QuestionContent = ({ content }) => {
  if (!content) return null;

  const rawContent = String(content);
  if (IMAGE_TAG_REGEX.test(rawContent)) {
    return <>{renderContentWithImages(rawContent)}</>;
  }

  return <>{renderTextContent(rawContent)}</>;
};

export default QuestionContent;
