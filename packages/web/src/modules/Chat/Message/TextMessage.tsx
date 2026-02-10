import React from 'react';
import DOMPurify from 'dompurify';

import expressions from '@fiora/utils/expressions';
import { TRANSPARENT_IMAGE } from '@fiora/utils/const';
import Style from './Message.less';

interface TextMessageProps {
    content: string;
}

function escapeHTML(str: string) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** 去除零宽字符等常见隐藏注入字符 */
function stripZeroWidth(str: string) {
    return str.replace(/[\u200B-\u200F\uFEFF\u2060\u180E]/g, '');
}

function TextMessage(props: TextMessageProps) {
    const raw = stripZeroWidth(props.content || '');

    const urlRe =
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}(\.[a-z]{2,6})?\b(:[0-9]{2,5})?([-a-zA-Z0-9@:%_+.~#?&//=]*)/g;

    let html = '';
    let lastIndex = 0;
    for (const match of raw.matchAll(urlRe)) {
        const url = match[0];
        const index = match.index || 0;
        html += escapeHTML(raw.slice(lastIndex, index));
        const safeHref = encodeURI(url);
        html += `<a class="${Style.selecteAble}" href="${safeHref}" rel="noopener noreferrer" target="_blank">${escapeHTML(
            url,
        )}</a>`;
        lastIndex = index + url.length;
    }
    html += escapeHTML(raw.slice(lastIndex));

    // 表情替换：#(xx)
    html = html.replace(/#\(([\u4e00-\u9fa5a-z]+)\)/g, (r, e) => {
        const index = expressions.default.indexOf(e);
        if (index !== -1) {
            // 移除 onerror 等事件属性，交由 DOMPurify 白名单控制
            return `<img class="${Style.baidu} ${Style.selecteAble}" src="${TRANSPARENT_IMAGE}" style="background-position: left ${-30 *
                index}px;" alt="${escapeHTML(r)}">`;
        }
        return escapeHTML(r);
    });

    // 允许 a/img/style/class/href/src/target/rel/alt，其它全部清理，避免 XSS/JS 注入
    const sanitized = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['a', 'img'],
        ALLOWED_ATTR: ['class', 'href', 'rel', 'target', 'src', 'style', 'alt'],
    });

    return (
        <div
            className={Style.textMessage}
            data-fiora="message-text"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: sanitized }}
        />
    );
}

export default TextMessage;
