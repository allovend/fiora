import React, { useState } from 'react';
import { useSelector } from 'react-redux';

import { getOSSFileUrl } from '../utils/uploadFile';
import Dialog from '../components/Dialog';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import Input from '../components/Input';
import { State } from '../state/reducer';
import useAction from '../hooks/useAction';
import { joinGroup, getLinkmanHistoryMessages } from '../service';

import Style from './InfoDialog.less';

interface GroupInfoProps {
    visible: boolean;
    group?: {
        _id: string;
        name: string;
        avatar: string;
        members: number;
        isPrivate?: boolean;
    };
    onClose: () => void;
}

function GroupInfo(props: GroupInfoProps) {
    const { visible, onClose, group } = props;

    const action = useAction();
    const isAdmin = useSelector((state: State) => state.user?.isAdmin || false);
    const hasLinkman = useSelector(
        (state: State) => !!state.linkmans[group?._id as string],
    );
    const [largerAvatar, toggleLargetAvatar] = useState(false);
    const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
    const [joinPassword, setJoinPassword] = useState('');

    if (!group) {
        return null;
    }

    async function doJoin(password = '') {
        if (!group) return;
        const groupRes = await joinGroup(group._id, password);
        if (groupRes) {
            groupRes.type = 'group';
            action.addLinkman(groupRes, true);

            const messages = await getLinkmanHistoryMessages(group._id, 0);
            if (messages) {
                action.addLinkmanHistoryMessages(group._id, messages);
            }
        }
    }

    async function handleJoinGroup() {
        if (!group) return;

        // 私密群：非管理员需要输入密码
        if (group.isPrivate && !isAdmin) {
            onClose();
            setJoinPassword('');
            setPasswordDialogVisible(true);
            return;
        }

        onClose();
        await doJoin('');
    }

    async function handleConfirmPassword() {
        setPasswordDialogVisible(false);
        await doJoin(joinPassword);
        setJoinPassword('');
    }

    function handleFocusGroup() {
        onClose();

        if (!group) {
            return;
        }
        action.setFocus(group._id);
    }

    return (
        <>
            <Dialog
                className={Style.infoDialog}
                visible={visible}
                onClose={onClose}
            >
                <div className={Style.coantainer}>
                <div className={Style.header}>
                    <Avatar
                        size={60}
                        src={group.avatar}
                        onMouseEnter={() => toggleLargetAvatar(true)}
                        onMouseLeave={() => toggleLargetAvatar(false)}
                    />
                    <img
                        className={`${Style.largeAvatar} ${
                            largerAvatar ? 'show' : 'hide'
                        }`}
                        src={getOSSFileUrl(group.avatar)}
                        alt="群组头像"
                    />
                    <p>{group.name}</p>
                </div>
                <div className={Style.info}>
                    <div className={Style.onlineStatus}>
                        <p className={Style.onlineText}>成员:</p>
                        <div>{group.members}人</div>
                    </div>
                    {hasLinkman ? (
                        <Button onClick={handleFocusGroup}>发送消息</Button>
                    ) : (
                        <Button onClick={handleJoinGroup}>加入群组</Button>
                    )}
                </div>
                </div>
            </Dialog>

            <Dialog
                title="加入私密群组"
                visible={passwordDialogVisible}
                onClose={() => {
                    setPasswordDialogVisible(false);
                    setJoinPassword('');
                }}
            >
                <div className={Style.coantainer}>
                    <h3 className={Style.text}>请输入密码</h3>
                    <Input
                        className={Style.input}
                        type="password"
                        value={joinPassword}
                        placeholder="请输入密码！"
                        onChange={setJoinPassword}
                    />
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            marginTop: 12,
                        }}
                    >
                        <Button
                            onClick={() => {
                                setPasswordDialogVisible(false);
                                setJoinPassword('');
                            }}
                        >
                            取消
                        </Button>
                        <div style={{ width: 8 }} />
                        <Button onClick={handleConfirmPassword}>确定</Button>
                    </div>
                </div>
            </Dialog>
        </>
    );
}

export default GroupInfo;
