import React from 'react';

interface UrlMessageProps {
    url: string;
}

function UrlMessage(props: UrlMessageProps) {
    const { url } = props;
    return (
        <a href={url} target="_black" rel="noopener noreferrer" data-fiora="message-url">
            {url}
        </a>
    );
}

export default UrlMessage;
