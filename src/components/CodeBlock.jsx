import React from 'react';
import './CodeBlock.css';

const CodeBlock = ({ code }) => {
    const highlightCode = (codeText) => {
        if (!codeText) return '';

        // 第1步：彻底清理所有HTML标签（包括破损的标签）
        let cleaned = codeText
            // 移除完整的HTML标签
            .replace(/<[^>]*>/g, '')
            // 移除破损的开始标签（如 `class="xxx"`）
            .replace(/\s+(class|id|style|data-\w+)=[""'][^""']*[""']/g, '')
            // 移除孤立的属性
            .replace(/\s+(class|id|style)=/g, ' ')
            .trim();

        // 第2步：转义HTML特殊字符
        let highlighted = cleaned
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const protectedTokens = [];
        const makeToken = (prefix) => `@@CQ${prefix}${'A'.repeat(protectedTokens.length + 1)}@@`;
        const protect = (value, renderer, prefix = 'TOKEN') => {
            const token = makeToken(prefix);
            protectedTokens.push({ token, value, renderer });
            return token;
        };

        highlighted = highlighted.replace(
            /\/\*[\s\S]*?\*\//g,
            (comment) => protect(comment, (value) => `<span class="code-comment">${value}</span>`, 'COMMENT')
        );
        highlighted = highlighted.replace(
            /\/\/(.*?)$/gm,
            (comment) => protect(comment, (value) => `<span class="code-comment">${value}</span>`, 'COMMENT')
        );
        highlighted = highlighted.replace(
            /&quot;(?:[^&]|&(?!quot;))*&quot;/g,
            (str) => protect(str, (value) => `<span class="code-string">${value}</span>`, 'STRING')
        );
        highlighted = highlighted.replace(/\(\s*(\d+)\s*\)/g, (_, blankNumber) => {
            return protect(blankNumber, (value) => `<span class="code-blank">第 ${value} 空</span>`, 'BLANK');
        });

        // 第3步：高亮关键字
        const keywords = [
            'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char',
            'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum',
            'extends', 'false', 'final', 'finally', 'float', 'for', 'goto', 'if',
            'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native',
            'new', 'null', 'package', 'private', 'protected', 'public', 'return',
            'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this',
            'throw', 'throws', 'transient', 'true', 'try', 'void', 'volatile', 'while',
            'sizeof', 'struct', 'typedef', 'union', 'unsigned', 'signed', 'extern',
            'register', 'auto', 'String', 'one', 'two', 'three'
        ];

        const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
        highlighted = highlighted.replace(
            keywordRegex,
            '<span class="code-keyword">$1</span>'
        );

        // 第4步：高亮数字
        highlighted = highlighted.replace(
            /\b(\d+\.?\d*)\b/g,
            '<span class="code-number">$1</span>'
        );

        protectedTokens.forEach(({ token, value, renderer }) => {
            highlighted = highlighted.replace(token, renderer(value));
        });

        return highlighted;
    };

    return (
        <pre className="code-block">
            <code dangerouslySetInnerHTML={{ __html: highlightCode(code) }} />
        </pre>
    );
};

export default CodeBlock;
