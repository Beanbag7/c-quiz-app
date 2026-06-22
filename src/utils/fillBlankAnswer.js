const NUMBERED_ANSWER_MARKER = /(?:^|[、,，;；\s])(?:\(|（)?\d+(?:\)|）)[\s、:：.]*/g;
const ANSWER_SPLIT_PATTERN = /[，,、;；\n]+/;

function getBlankCount(questionText) {
    return (String(questionText ?? '').match(/[（(]\s*[）)]/g) || []).length;
}

function cleanAnswerItem(value) {
    return String(value ?? '')
        .replace(/^[\s、,，;；:：.]+/, '')
        .replace(/[\s、,，;；]+$/, '')
        .trim();
}

function splitNumberedAnswer(rawText) {
    const text = String(rawText ?? '').trim();
    const matches = [...text.matchAll(NUMBERED_ANSWER_MARKER)];
    if (matches.length === 0) return [];

    return matches
        .map((match, index) => {
            const start = match.index + match[0].length;
            const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
            return cleanAnswerItem(text.slice(start, end));
        })
        .filter(Boolean);
}

// 统一归一化答案字段：兼容 答案 / 答案文本 / 正确答案 三种来源
// 优先使用「答案文本」（通常是已合并的展示文本），其次「正确答案」，最后「答案」
// 返回字符串数组（每个元素是一个答案项），便于统一展示与多空场景
export function parseFillBlankAnswerItems(question) {
    const raw = question?.答案文本 ?? question?.正确答案 ?? question?.答案;
    const blankCount = getBlankCount(question?.题目内容);

    if (raw === null || raw === undefined || raw === '') return [];
    if (Array.isArray(raw)) return raw.map((item) => String(item));

    const numberedItems = splitNumberedAnswer(raw);
    if (numberedItems.length > 0) return numberedItems;

    if (blankCount > 1) {
        const splitItems = String(raw)
            .split(ANSWER_SPLIT_PATTERN)
            .map(cleanAnswerItem)
            .filter(Boolean);
        if (splitItems.length > 1) return splitItems;
    }

    return [String(raw)];
}
