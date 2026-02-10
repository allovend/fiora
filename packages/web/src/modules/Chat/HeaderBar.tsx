import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { css } from 'linaria';

import { isMobile } from '@fiora/utils/ua';
import { State } from '../../state/reducer';
import useIsLogin from '../../hooks/useIsLogin';
import useAction from '../../hooks/useAction';
import IconButton from '../../components/IconButton';
import Message from '../../components/Message';
import Dialog from '../../components/Dialog';
import Input from '../../components/Input';
import Button from '../../components/Button';
import fetch from '../../utils/fetch';

import Style from './HeaderBar.less';
import useAero from '../../hooks/useAero';

const styles = {
    count: css`
        font-size: 14px;
        @media (max-width: 500px) {
            font-size: 12px;
        }
    `,
};

type Props = {
    id: string;
    /** 联系人名称, 没有联系人时会传空 */
    name: string;
    /** 联系人类型, 没有联系人时会传空 */
    type: string;
    onlineMembersCount?: number;
    isOnline?: boolean;
    /** 功能按钮点击事件 */
    onClickFunction: () => void;
};

function HeaderBar(props: Props) {
    const {
        id,
        name,
        type,
        onlineMembersCount,
        isOnline,
        onClickFunction,
    } = props;

    const action = useAction();
    const connectStatus = useSelector((state: State) => state.connect);
    const isLogin = useIsLogin();
    const sidebarVisible = useSelector(
        (state: State) => state.status.sidebarVisible,
    );
    const aero = useAero();

    const [shareVisible, setShareVisible] = useState(false);
    const [shareType, setShareType] = useState<'permanent' | 'custom'>('permanent');
    const [shareDays, setShareDays] = useState('7');

    async function handleShareGroup() {
        // 打开覆盖在聊天页上的小界面（非跳转）
        setShareVisible(true);
    }

    async function handleConfirmShare() {
        if (type !== 'group') return;
        const days = shareType === 'permanent' ? 0 : Math.max(1, Math.min(3650, parseInt(shareDays || '0', 10)));
        const [error, res] = await fetch('createGroupInviteLink', { groupId: id, expireDays: days });
        if (error) {
            Message.error(String(error));
            return;
        }
        const token = (res as any).token as string;
        const link = `${window.location.origin}/invite/group/${id}?token=${encodeURIComponent(token)}`;
        try {
            await navigator.clipboard.writeText(link);
        } catch (e) {
            // fallback
            const input = document.createElement('input');
            input.value = link;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }
        setShareVisible(false);
        Message.success('已复制邀请链接到粘贴板');
    }

    return (
        <div
            className={`${Style.headerBar} headerBar`}
            // 稳定选择器：聊天头部栏
            data-fiora="chat-header"
            {...aero}
        >
            {isMobile && (
                <div className={Style.buttonContainer}>
                    <IconButton
                        width={40}
                        height={40}
                        icon="feature"
                        iconSize={24}
                        onClick={() =>
                            action.setStatus('sidebarVisible', !sidebarVisible)
                        }
                    />
                    <IconButton
                        width={40}
                        height={40}
                        icon="friends"
                        iconSize={24}
                        onClick={() =>
                            action.setStatus(
                                'functionBarAndLinkmanListVisible',
                                true,
                            )
                        }
                    />
                </div>
            )}
            <h2 className={`${Style.name} name`} data-fiora="chat-header-name">
                {name && (
                    <span>
                        {name}{' '}
                        {isLogin && onlineMembersCount !== undefined && (
                            <b
                                className={styles.count}
                                data-fiora="chat-header-online-count"
                            >{`(${onlineMembersCount})`}</b>
                        )}
                        {isLogin && isOnline !== undefined && (
                            <b className={styles.count} data-fiora="chat-header-status">{`(${
                                isOnline ? '在线' : '离线'
                            })`}</b>
                        )}
                    </span>
                )}
                {isMobile && (
                    <span className={Style.status} data-fiora="chat-header-mobile-status">
                        <div className={connectStatus ? 'online' : 'offline'} />
                        {connectStatus ? '在线' : '离线'}
                    </span>
                )}
            </h2>
            {isLogin && type ? (
                <div
                    className={`${Style.buttonContainer} buttonContainer ${Style.rightButtonContainer}`}
                    data-fiora="chat-header-buttons"
                >
                    {type === 'group' && (
                        <CopyToClipboard text={`${window.location.origin}/invite/group/${id}`}>
                            <IconButton
                                width={40}
                                height={40}
                                icon="share"
                                iconSize={24}
                                onClick={handleShareGroup}
                            />
                        </CopyToClipboard>
                    )}
                    <IconButton
                        width={40}
                        height={40}
                        icon="gongneng"
                        iconSize={24}
                        onClick={onClickFunction}
                    />
                </div>
            ) : (
                <div className={`${Style.buttonContainer} buttonContainer`} data-fiora="chat-header-buttons" />
            )}

<Dialog
    title="分享邀请链接"
    visible={shareVisible}
    onClose={() => setShareVisible(false)}
>
    <div style={{ padding: 8 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <label>
                <input
                    type="radio"
                    checked={shareType === 'custom'}
                    onChange={() => setShareType('custom')}
                />
                自定义
            </label>
            <label>
                <input
                    type="radio"
                    checked={shareType === 'permanent'}
                    onChange={() => setShareType('permanent')}
                />
                永久
            </label>
        </div>
        {shareType === 'custom' ? (
            <Input
                value={shareDays}
                onChange={setShareDays}
                placeholder="有效期（天）"
            />
        ) : null}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button onClick={handleConfirmShare}>生成并复制链接</Button>
        </div>
    </div>
</Dialog>

        </div>
    );
}

export default HeaderBar;
