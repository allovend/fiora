import React from 'react';
import { useSelector } from 'react-redux';

import Time from '@fiora/utils/time';
import { isMobile } from '@fiora/utils/ua';
import Avatar from '../../components/Avatar';
import { State } from '../../state/reducer';
import useAction from '../../hooks/useAction';

import Style from './Linkman.less';
import useAero from '../../hooks/useAero';
import { useStore } from '../../hooks/useStore';
import { updateHistory } from '../../service';

interface LinkmanProps {
    id: string;
    name: string;
    avatar: string;
    /** 消息预览 */
    preview: string;
    unread: number;
    time: Date;
}

function Linkman(props: LinkmanProps) {
    const { id, name, avatar, preview, unread, time } = props;

    const action = useAction();
    const focus = useSelector((state: State) => state.focus);
    const aero = useAero();
    const { linkmans } = useStore();

    function formatTime() {
        const nowTime = new Date();
        if (Time.isToday(nowTime, time)) {
            return Time.getHourMinute(time);
        }
        if (Time.isYesterday(nowTime, time)) {
            return '昨天';
        }
        return Time.getMonthDate(time);
    }

    async function handleClick() {
        // Update next linkman read history
        const nextFocusLinkman = linkmans[id];
        if (nextFocusLinkman) {
            const messageKeys = Object.keys(nextFocusLinkman.messages);
            if (messageKeys.length > 0) {
                const lastMessageId =
                    nextFocusLinkman.messages[
                        messageKeys[messageKeys.length - 1]
                    ]._id;
                updateHistory(nextFocusLinkman._id, lastMessageId);
            }
        }

        action.setFocus(id);
        if (isMobile) {
            action.setStatus('functionBarAndLinkmanListVisible', false);
        }
    }

    return (
        <div
            className={`${Style.linkman} ${id === focus ? Style.focus : ''}`}
            onClick={handleClick}
            role="button"
            // 稳定选择器：
            // - data-fiora="linkman-item"：联系人条目
            // - 若为当前 focus，再追加一个 token：linkman-focus（便于自定义高亮样式）
            data-fiora={`linkman-item${id === focus ? ' linkman-focus' : ''}`}
            {...aero}
        >
            <Avatar src={avatar} size={48} data-fiora="linkman-avatar" />
            <div className={Style.container} data-fiora="linkman-info">
                <div
                    className={`${Style.rowContainer} ${Style.nameTimeBlock}`}
                    data-fiora="linkman-name-time"
                >
                    <p className={Style.name} data-fiora="linkman-name">
                        {name}
                    </p>
                    <p className={Style.time} data-fiora="linkman-time">
                        {formatTime()}
                    </p>
                </div>
                <div
                    className={`${Style.rowContainer} ${Style.previewUnreadBlock}`}
                    data-fiora="linkman-preview-unread"
                >
                    <p
                        className={Style.preview}
                        // eslint-disable-next-line react/no-danger
                        dangerouslySetInnerHTML={{ __html: preview }}
                        data-fiora="linkman-preview"
                    />
                    {unread > 0 && (
                        <div className={Style.unread} data-fiora="linkman-unread">
                            <span>{unread > 99 ? '99+' : unread}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Linkman;