import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import getFriendId from '@fiora/utils/getFriendId';
import { getOSSFileUrl } from '../utils/uploadFile';
import Style from './InfoDialog.less';
import Dialog from '../components/Dialog';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Message from '../components/Message';
import { State, Linkman } from '../state/reducer';
import { ActionTypes } from '../state/action';
import useAction from '../hooks/useAction';
import {
    addFriend,
    getLinkmanHistoryMessages,
    deleteFriend,
    sealUser,
    getUserIps,
    sealUserOnlineIp,
    beginTotpSetup,
    enableTotp,
    disableTotp,
} from '../service';

import QRCode from 'qrcode.react';

import QRCode from 'qrcode.react';

interface UserInfoProps {
    visible: boolean;
    user?: {
        _id: string;
        username: string;
        avatar: string;
        ip: string;
        isOnline?: string;
    };
    onClose: () => void;
}

function UserInfo(props: UserInfoProps) {
    const { visible, onClose, user } = props;

    const dispatch = useDispatch();

    const action = useAction();

    const selfId =
        useSelector((state: State) => state.user && state.user._id) || '';
    const selfTotpEnabled = !!useSelector(
        (state: State) => state.user && (state.user as any).totpEnabled,
    );
    const isSelf = !!user && user._id === selfId;

    // 2FA (TOTP)
    const [totpDialogVisible, setTotpDialogVisible] = useState(false);
    const [totpSetup, setTotpSetup] = useState<
        { otpauthUrl: string; secret?: string } | null
    >(null);
    const [totpCode, setTotpCode] = useState('');
    const [totpPassword, setTotpPassword] = useState('');
    // 获取好友id
    if (user && user._id.length === selfId.length) {
        user._id = getFriendId(selfId, user._id);
    }
    /** 获取原始用户id */
    const originUserId = user && user._id.replace(selfId, '');

    // @ts-ignore
    const linkman = useSelector((state: State) => state.linkmans[user?._id]);
    const isFriend = linkman && linkman.type === 'friend';
    const isAdmin = useSelector(
        (state: State) => state.user && state.user.isAdmin,
    );
    const [largerAvatar, toggleLargetAvatar] = useState(false);

    const [userIps, setUserIps] = useState([]);

    async function handleOpenTotp() {
        if (!isSelf) return;
        setTotpDialogVisible(true);
        setTotpCode('');
        setTotpPassword('');
        setTotpSetup(null);
    }

    function closeTotpDialog() {
        setTotpDialogVisible(false);
        setTotpCode('');
        setTotpPassword('');
        setTotpSetup(null);
    }

    async function handleBeginTotpSetup() {
        const res = await beginTotpSetup();
        if (!res) return;
        setTotpSetup(res);
    }

    async function handleEnableTotp() {
        if (!totpCode.trim()) {
            Message.error('请输入2FA验证码');
            return;
        }
        const res = await enableTotp(totpCode.trim());
        if (!res) return;
        dispatch({
            type: ActionTypes.UpdateUserInfo,
            payload: { totpEnabled: true },
        });
        Message.success('已启用两步验证');
        closeTotpDialog();
    }

    async function handleDisableTotp() {
        if (!totpPassword) {
            Message.error('请输入登录密码');
            return;
        }
        if (!totpCode.trim()) {
            Message.error('请输入2FA验证码');
            return;
        }
        const res = await disableTotp(totpPassword, totpCode.trim());
        if (!res) return;
        dispatch({
            type: ActionTypes.UpdateUserInfo,
            payload: { totpEnabled: false },
        });
        Message.success('已关闭两步验证');
        closeTotpDialog();
    }

    useEffect(() => {
        if (isAdmin && user && user._id) {
            (async () => {
                const ips = await getUserIps(user._id.replace(selfId, ''));
                setUserIps(ips);
            })();
        }
    }, [isAdmin, selfId, user]);

    if (!user) {
        return null;
    }

    function handleFocusUser() {
        onClose();
        // @ts-ignore
        action.setFocus(user._id);
    }

    async function handleAddFriend() {
        // @ts-ignore
        const friend = await addFriend(originUserId);
        if (friend) {
            onClose();
            // @ts-ignore
            const { _id } = user;
            let existCount = 0;
            if (linkman) {
                existCount = Object.keys(linkman.messages).length;
                action.setLinkmanProperty(_id, 'type', 'friend');
            } else {
                const newLinkman = {
                    _id,
                    from: selfId,
                    to: {
                        _id: originUserId,
                        username: friend.username,
                        avatar: friend.avatar,
                    },
                    type: 'friend',
                    createTime: Date.now(),
                };
                action.addLinkman((newLinkman as unknown) as Linkman, true);
            }
            const messages = await getLinkmanHistoryMessages(_id, existCount);
            if (messages) {
                action.addLinkmanHistoryMessages(_id, messages);
            }
            handleFocusUser();
        }
    }

    async function handleDeleteFriend() {
        // @ts-ignore
        const isSuccess = await deleteFriend(originUserId);
        if (isSuccess) {
            onClose();
            // @ts-ignore
            action.removeLinkman(user._id);
            Message.success('删除好友成功');
        }
    }

    async function handleSeal() {
        // @ts-ignore
        const isSuccess = await sealUser(user.name || user.username);
        if (isSuccess) {
            Message.success('封禁用户成功');
        }
    }

    async function handleSealIp() {
        // @ts-ignore
        const isSuccess = await sealUserOnlineIp(originUserId);
        if (isSuccess) {
            Message.success('封禁ip成功');
        }
    }

    function searchIp(ip: string) {
        window.open(`https://www.baidu.com/s?wd=${ip}`);
    }

    function handleClose() {
        toggleLargetAvatar(false);
        onClose();
    }

    return (
        <>
            <Dialog
                className={Style.infoDialog}
                visible={visible}
                onClose={handleClose}
            >
                <div>
                    {visible && user ? (
                        <div className={Style.coantainer}>
                            <div className={Style.header}>
                                <Avatar
                                    size={60}
                                    src={user.avatar}
                                    onMouseEnter={() =>
                                        toggleLargetAvatar(true)
                                    }
                                    onMouseLeave={() =>
                                        toggleLargetAvatar(false)
                                    }
                                />
                                <img
                                    className={`${Style.largeAvatar} ${
                                        largerAvatar ? 'show' : 'hide'
                                    }`}
                                    src={getOSSFileUrl(user.avatar)}
                                    alt="用户头像"
                                />
                                <p>{user.username}</p>
                                <p className={Style.ip}>
                                    {userIps.map((ip) => (
                                        <span
                                            key={ip}
                                            onClick={() => searchIp(ip)}
                                            role="button"
                                        >
                                            {ip}
                                        </span>
                                    ))}
                                </p>
                            </div>
                            <div className={Style.info}>
                                {isFriend ? (
                                    <Button onClick={handleFocusUser}>
                                        发送消息
                                    </Button>
                                ) : null}
                                {isFriend ? (
                                    <Button
                                        type="danger"
                                        onClick={handleDeleteFriend}
                                    >
                                        删除好友
                                    </Button>
                                ) : (
                                    <Button onClick={handleAddFriend}>
                                        加为好友
                                    </Button>
                                )}
                                {isSelf ? (
                                    <Button onClick={handleOpenTotp}>
                                        {selfTotpEnabled
                                            ? '管理两步验证'
                                            : '开启两步验证'}
                                    </Button>
                                ) : null}
                                {isAdmin ? (
                                    <Button type="danger" onClick={handleSeal}>
                                        封禁用户
                                    </Button>
                                ) : null}
                                {isAdmin ? (
                                    <Button
                                        type="danger"
                                        onClick={handleSealIp}
                                    >
                                        封禁ip
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </div>
            </Dialog>

            <Dialog
                className={Style.infoDialog}
                visible={totpDialogVisible}
                onClose={closeTotpDialog}
            >
                <div style={{ padding: 12, width: 360 }}>
                    <h3 style={{ margin: '0 0 10px 0' }}>两步验证 (2FA)</h3>
                    <p style={{ margin: '0 0 12px 0', opacity: 0.8 }}>
                        使用验证器 App（如 Google Authenticator、Microsoft Authenticator）
                        扫描二维码生成 6 位验证码。
                    </p>

                    {selfTotpEnabled ? (
                        <>
                            <p style={{ margin: '0 0 10px 0' }}>
                                当前状态：<b>已启用</b>
                            </p>
                            <div style={{ marginBottom: 10 }}>
                                <input
                                    type="password"
                                    placeholder="请输入登录密码"
                                    value={totpPassword}
                                    onChange={(e) =>
                                        setTotpPassword(e.target.value)
                                    }
                                    style={{ width: '100%', padding: 8 }}
                                />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <input
                                    placeholder="请输入 6 位验证码"
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value)}
                                    style={{ width: '100%', padding: 8 }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <Button type="danger" onClick={handleDisableTotp}>
                                    关闭两步验证
                                </Button>
                                <Button onClick={closeTotpDialog}>取消</Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p style={{ margin: '0 0 10px 0' }}>
                                当前状态：<b>未启用</b>
                            </p>
                            {!totpSetup ? (
                                <Button onClick={handleBeginTotpSetup}>
                                    开始设置
                                </Button>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                                        <QRCode value={totpSetup.otpauthUrl} size={168} />
                                    </div>
                                    {totpSetup.secret ? (
                                        <p style={{ margin: '0 0 10px 0', wordBreak: 'break-all' }}>
                                            备用密钥：<code>{totpSetup.secret}</code>
                                        </p>
                                    ) : null}
                                    <div style={{ marginBottom: 12 }}>
                                        <input
                                            placeholder="请输入 6 位验证码"
                                            value={totpCode}
                                            onChange={(e) => setTotpCode(e.target.value)}
                                            style={{ width: '100%', padding: 8 }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <Button onClick={handleEnableTotp}>
                                            确认启用
                                        </Button>
                                        <Button onClick={closeTotpDialog}>取消</Button>
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>
            </Dialog>
        </>
    );
}

export default UserInfo;
