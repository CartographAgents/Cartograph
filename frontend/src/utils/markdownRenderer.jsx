import React from 'react';

export function renderInlineMarkdown(text, keyPrefix) {
    const safeText = typeof text === 'string' ? text : String(text ?? '');
    const pattern = /(\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*)/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    let idx = 0;

    while ((match = pattern.exec(safeText)) !== null) {
        if (match.index > lastIndex) {
            parts.push(
                <React.Fragment key={`${keyPrefix}-text-${idx++}`}>
                    {safeText.slice(lastIndex, match.index)}
                </React.Fragment>
            );
        }

        if (match[2]) {
            parts.push(
                <a
                    key={`${keyPrefix}-link-${idx++}`}
                    href={match[2]}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {match[1].slice(1, match[1].indexOf(']'))}
                </a>
            );
        } else if (match[3]) {
            parts.push(<strong key={`${keyPrefix}-bold-${idx++}`}>{match[3]}</strong>);
        } else if (match[4]) {
            parts.push(<code key={`${keyPrefix}-code-${idx++}`}>{match[4]}</code>);
        } else if (match[5]) {
            parts.push(<em key={`${keyPrefix}-italic-${idx++}`}>{match[5]}</em>);
        }

        lastIndex = pattern.lastIndex;
    }

    if (lastIndex < safeText.length) {
        parts.push(
            <React.Fragment key={`${keyPrefix}-tail-${idx++}`}>
                {safeText.slice(lastIndex)}
            </React.Fragment>
        );
    }

    return parts.length > 0 ? parts : safeText;
}

export function renderMessageContent(content) {
    const safeContent = typeof content === 'string' ? content : String(content ?? '');
    const lines = safeContent.split('\n');
    const blocks = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        if (!trimmed) {
            i += 1;
            continue;
        }

        if (/^#{1,6}\s+/.test(trimmed)) {
            const level = trimmed.match(/^(#{1,6})\s+/)[1].length;
            const text = trimmed.replace(/^#{1,6}\s+/, '');
            const Tag = `h${level}`;
            blocks.push(<Tag key={`md-h-${key++}`}>{renderInlineMarkdown(text, `md-h-${key}`)}</Tag>);
            i += 1;
            continue;
        }

        if (/^\d+\.\s+/.test(trimmed)) {
            const items = [];
            while (i < lines.length) {
                const current = lines[i].trim();
                if (!current) {
                    i += 1;
                    continue;
                }
                if (!/^\d+\.\s+/.test(current)) break;
                items.push(current.replace(/^\d+\.\s+/, ''));
                i += 1;
            }
            blocks.push(
                <ol key={`md-ol-${key++}`}>
                    {items.map((item, itemIdx) => (
                        <li key={`md-ol-item-${itemIdx}`}>{renderInlineMarkdown(item, `md-ol-${key}-${itemIdx}`)}</li>
                    ))}
                </ol>
            );
            continue;
        }

        if (/^[-*]\s+/.test(trimmed)) {
            const items = [];
            while (i < lines.length) {
                const current = lines[i].trim();
                if (!current) {
                    i += 1;
                    continue;
                }
                if (!/^[-*]\s+/.test(current)) break;
                items.push(current.replace(/^[-*]\s+/, ''));
                i += 1;
            }
            blocks.push(
                <ul key={`md-ul-${key++}`}>
                    {items.map((item, itemIdx) => (
                        <li key={`md-ul-item-${itemIdx}`}>{renderInlineMarkdown(item, `md-ul-${key}-${itemIdx}`)}</li>
                    ))}
                </ul>
            );
            continue;
        }

        const paragraph = [];
        while (i < lines.length) {
            const next = lines[i].trim();
            if (!next || /^\d+\.\s+/.test(next) || /^[-*]\s+/.test(next) || /^#{1,6}\s+/.test(next)) break;
            paragraph.push(lines[i]);
            i += 1;
        }

        const joined = paragraph.join(' ').replace(/\s+/g, ' ').trim();
        if (joined) {
            blocks.push(<p key={`md-p-${key++}`}>{renderInlineMarkdown(joined, `md-p-${key}`)}</p>);
        }
    }

    return blocks.length > 0 ? blocks : safeContent;
}
