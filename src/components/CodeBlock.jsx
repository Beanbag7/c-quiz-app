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

        keywords.forEach(keyword => {
            const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
            highlighted = highlighted.replace(regex, '<span class="code-keyword">$1</span>');
        });

        // 第4步：高亮字符串
        highlighted = highlighted.replace(
            /(&quot;(?:[^&]|&(?!quot;))*&quot;)/g,
            '<span class="code-string">$1</span>'
        );

        // 第5步：高亮数字
        highlighted = highlighted.replace(
            /\b(\d+\.?\d*)\b/g,
            '<span class="code-number">$1</span>'
        );

        // 第6步：高亮注释
        highlighted = highlighted.replace(
            /\/\/(.*?)$/gm,
            '<span class="code-comment">//$1</span>'
        );
        highlighted = highlighted.replace(
            /\/\*([\s\S]*?)\*\//g,
            '<span class="code-comment">/*$1*/</span>'
        );

        return highlighted;
    };

    return (
        <pre className="code-block">
            <code dangerouslySetInnerHTML={{ __html: highlightCode(code) }} />
        </pre>
    );
};

export default CodeBlock;
