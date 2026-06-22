import React from 'react';
import CodeBlock from './CodeBlock';
import './MarkdownContent.css';

const FENCE_REGEX = /^```(\w+)?\s*$/;
const TABLE_SEPARATOR_REGEX = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/;
const INLINE_TOKEN_REGEX = /(!\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)/g;
const HTML_IMAGE_REGEX = /<img\b([^>]*)>/gi;
const HTML_BR_REGEX = /<br\s*\/?>/gi;
const HTML_CODE_BLOCK_REGEX = /<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi;
const HTML_SRC_ATTR_REGEX = /\bsrc\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i;
const HTML_ALT_ATTR_REGEX = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;
const HTML_STYLE_ATTR_REGEX = /\bstyle\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

function getHtmlAttr(attrs, regex) {
  const match = String(attrs ?? '').match(regex);
  if (!match) return '';
  return match[1] || match[2] || match[3] || '';
}

function normalizeAssetSrc(src) {
  const source = String(src ?? '').trim();
  if (!source || /^(?:https?:)?\/\//i.test(source) || source.startsWith('/')) return source;
  return `/${source}`;
}

function decodeHtml(text) {
  return String(text ?? '')
    .replace(HTML_BR_REGEX, '\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function stripHtmlWrappers(text) {
  return String(text ?? '')
    .replace(/<\/?(?:p|div|span)[^>]*>/gi, '\n')
    .replace(/<hr\b[^>]*>/gi, '\n---\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeMarkdownInput(content) {
  const codeBlocks = [];
  const withCodeTokens = String(content ?? '').replace(HTML_CODE_BLOCK_REGEX, (_, code) => {
    const token = `@@CQ_CODE_BLOCK_${codeBlocks.length}@@`;
    codeBlocks.push({ token, value: `\n\`\`\`c\n${decodeHtml(code).trim()}\n\`\`\`\n` });
    return token;
  });

  const normalized = stripHtmlWrappers(withCodeTokens
    .replace(HTML_BR_REGEX, '\n')
    .replace(HTML_IMAGE_REGEX, (_, attrs) => {
      const src = getHtmlAttr(attrs, HTML_SRC_ATTR_REGEX);
      const alt = getHtmlAttr(attrs, HTML_ALT_ATTR_REGEX) || '图片';
      const style = getHtmlAttr(attrs, HTML_STYLE_ATTR_REGEX);
      return src ? `![${alt}](${normalizeAssetSrc(src)}${style ? ` "${style}"` : ''})` : '';
    }));

  return codeBlocks.reduce(
    (next, { token, value }) => next.replace(token, value),
    normalized
  );
}

function splitTableRow(line) {
  return String(line)
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableStart(lines, index) {
  return (
    index + 1 < lines.length &&
    String(lines[index]).includes('|') &&
    TABLE_SEPARATOR_REGEX.test(lines[index + 1])
  );
}

function renderInline(text, keyPrefix) {
  const source = String(text ?? '');
  const nodes = [];
  let lastIndex = 0;
  let match;
  let index = 0;

  while ((match = INLINE_TOKEN_REGEX.exec(source)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(source.slice(lastIndex, match.index));
    }

    const token = match[0];
    const imageMatch = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      const [, alt, target] = imageMatch;
      const targetMatch = target.match(/^(\S+)(?:\s+["']([^"']+)["'])?$/);
      const imageStyle = targetMatch?.[2] || '';
      const maxWidthMatch = imageStyle.match(/\bmax-width\s*:\s*([^;]+)/i);
      const widthMatch = imageStyle.match(/\bwidth\s*:\s*([^;]+)/i);
      const sourceMaxWidth = (maxWidthMatch?.[1] || widthMatch?.[1] || '').trim();
      nodes.push(
        <img
          key={`${keyPrefix}-img-${index++}`}
          className="markdown-image"
          src={normalizeAssetSrc(targetMatch?.[1] || target)}
          alt={alt || '图片'}
          loading="lazy"
          style={sourceMaxWidth ? { maxWidth: `min(100%, ${sourceMaxWidth})` } : undefined}
          onError={(event) => {
            event.currentTarget.dataset.loadError = 'true';
            event.currentTarget.style.display = 'none';
          }}
        />
      );
    } else if (token.startsWith('`')) {
      nodes.push(<code key={`${keyPrefix}-code-${index++}`}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={`${keyPrefix}-strong-${index++}`}>{token.slice(2, -2)}</strong>);
    }

    lastIndex = INLINE_TOKEN_REGEX.lastIndex;
  }

  if (lastIndex < source.length) {
    nodes.push(source.slice(lastIndex));
  }

  return nodes;
}

function renderTable(lines, startIndex, blockIndex) {
  const header = splitTableRow(lines[startIndex]);
  const body = [];
  let index = startIndex + 2;

  while (index < lines.length && String(lines[index]).includes('|') && lines[index].trim()) {
    body.push(splitTableRow(lines[index]));
    index += 1;
  }

  return {
    nextIndex: index,
    node: (
      <div className="markdown-table-wrap" key={`table-${blockIndex}`}>
        <table className="markdown-table">
          <thead>
            <tr>
              {header.map((cell, cellIndex) => (
                <th key={`h-${cellIndex}`}>{renderInline(cell, `table-${blockIndex}-h-${cellIndex}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, rowIndex) => (
              <tr key={`r-${rowIndex}`}>
                {header.map((_, cellIndex) => (
                  <td key={`c-${cellIndex}`}>
                    {renderInline(row[cellIndex] || '', `table-${blockIndex}-r-${rowIndex}-c-${cellIndex}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  };
}

function renderList(lines, startIndex, blockIndex) {
  const ordered = /^\s*\d+\.\s+/.test(lines[startIndex]);
  const items = [];
  let index = startIndex;
  const pattern = ordered ? /^\s*\d+\.\s+(.*)$/ : /^\s*[-*]\s+(.*)$/;

  while (index < lines.length) {
    const match = String(lines[index]).match(pattern);
    if (!match) break;
    items.push(match[1]);
    index += 1;
  }

  const Tag = ordered ? 'ol' : 'ul';
  return {
    nextIndex: index,
    node: (
      <Tag className="markdown-list" key={`list-${blockIndex}`}>
        {items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInline(item, `list-${blockIndex}-${itemIndex}`)}</li>
        ))}
      </Tag>
    ),
  };
}

function renderParagraph(lines, startIndex, blockIndex) {
  const paragraph = [];
  let index = startIndex;

  while (index < lines.length && lines[index].trim()) {
    if (isTableStart(lines, index) || FENCE_REGEX.test(lines[index]) || /^\s*(?:[-*]|\d+\.)\s+/.test(lines[index])) {
      break;
    }
    paragraph.push(lines[index].trim());
    index += 1;
  }

  return {
    nextIndex: index,
    node: <p key={`p-${blockIndex}`}>{renderInline(paragraph.join(' '), `p-${blockIndex}`)}</p>,
  };
}

function parseMarkdown(markdown) {
  const lines = normalizeMarkdownInput(markdown).replace(/\r\n/g, '\n').split('\n');
  const nodes = [];
  let index = 0;
  let blockIndex = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(FENCE_REGEX);
    if (fence) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !FENCE_REGEX.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      nodes.push(<CodeBlock key={`code-${blockIndex++}`} code={codeLines.join('\n')} language={fence[1] || ''} />);
      continue;
    }

    if (isTableStart(lines, index)) {
      const rendered = renderTable(lines, index, blockIndex++);
      nodes.push(rendered.node);
      index = rendered.nextIndex;
      continue;
    }

    if (/^\s*(?:[-*]|\d+\.)\s+/.test(line)) {
      const rendered = renderList(lines, index, blockIndex++);
      nodes.push(rendered.node);
      index = rendered.nextIndex;
      continue;
    }

    const rendered = renderParagraph(lines, index, blockIndex++);
    nodes.push(rendered.node);
    index = rendered.nextIndex;
  }

  return nodes;
}

function MarkdownContent({ content }) {
  if (!content) return null;
  return <div className="markdown-content">{parseMarkdown(content)}</div>;
}

export default MarkdownContent;
