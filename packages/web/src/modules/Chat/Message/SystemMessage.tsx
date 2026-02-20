import React from 'react';
import { getPerRandomColor } from '@fiora/utils/getRandomColor';

interface SystemMessageProps {
    message: string;
    username: string;
}

function SystemMessage(props: SystemMessageProps) {
    const { message, username } = props;
    return (
        <div className="system" data-fiora="message-system">
            <span style={{ color: getPerRandomColor(username) }} data-fiora="message-system-username">
                {username}
            </span>
            &nbsp;
            <span data-fiora="message-system-content">{message}</span>
        </div>
    );
}

export default SystemMessage;
