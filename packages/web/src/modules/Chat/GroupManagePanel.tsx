import React, { useState, useContext, useEffect } from 'react';
import { useSelector } from 'react-redux';
import Switch from 'react-switch';

import readDiskFIle from '../../utils/readDiskFile';
import uploadFile, { getOSSFileUrl } from '../../utils/uploadFile';
import Style from './GroupManagePanel.less';
import useIsLogin from '../../hooks/useIsLogin';
import { State, GroupMember } from '../../state/reducer';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Message from '../../components/Message';
import Avatar from '../../components/Avatar';
import Tooltip from '../../components/Tooltip';
import Dialog from '../../components/Dialog';
import {
    changeGroupName,
    changeGroupAvatar,
    deleteGroup,
    leaveGroup,
    toggleGroupMute,
    adminGetGroupMessages,
    adminGetGroupUsers,
    hardDeleteMessage,
    hardDeleteUser,
} from '../../service';
import useAction from '../../hooks/useAction';
import config from '../../../../config/client';
import { ShowUserOrGroupInfoContext } from '../../context';

interface GroupManagePanelProps {
    visible: boolean;
    onClose: () => void;
    groupId: string;
    avatar: string;
    creator: string;
    onlineMembers: GroupMember[];
    disableMute: boolean; // 是否禁言（true=禁言，false=不禁言）
}

function GroupManagePanel(props: GroupManagePanelProps) {
    const { visible, onClose, groupId, avatar, creator, onlineMembers, disableMute: initialDisableMute } = props;

    const action = useAction();
    const isLogin = useIsLogin();
    const selfId = useSelector((state: State) => state.user?._id);
    const isAdmin = useSelector((state: State) => state.user?.isAdmin || false);
    const [deleteConfirmDialog, setDialogStatus] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [disableMute, setDisableMute] = useState(initialDisableMute);

// 管理员：消息/用户列表与硬删除
const [adminMessagesVisible, setAdminMessagesVisible] = useState(false);
const [adminUsersVisible, setAdminUsersVisible] = useState(false);
const [adminMessagesLoading, setAdminMessagesLoading] = useState(false);
const [adminUsersLoading, setAdminUsersLoading] = useState(false);
const [adminMessages, setAdminMessages] = useState<any[]>([]);
const [adminUsers, setAdminUsers] = useState<any[]>([]);
const [confirmDelete, setConfirmDelete] = useState<
    | { type: 'message'; id: string }
    | { type: 'user'; id: string; username?: string }
    | null
>(null);

async function loadAdminMessages() {
    if (!isAdmin) return;
    setAdminMessagesLoading(true);
    const res = await adminGetGroupMessages(groupId, 1, 200);
    if (res?.messages) {
        setAdminMessages(res.messages);
    } else {
        setAdminMessages([]);
    }
    setAdminMessagesLoading(false);
}

async function loadAdminUsers() {
    if (!isAdmin) return;
    setAdminUsersLoading(true);
    const res = await adminGetGroupUsers(groupId);
    if (res?.users) {
        setAdminUsers(res.users);
    } else {
        setAdminUsers([]);
    }
    setAdminUsersLoading(false);
}

useEffect(() => {
    if (adminMessagesVisible) {
        loadAdminMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [adminMessagesVisible]);

useEffect(() => {
    if (adminUsersVisible) {
        loadAdminUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [adminUsersVisible]);
    const context = useContext(ShowUserOrGroupInfoContext);

    // 当 props 中的 disableMute 变化时，更新本地状态
    useEffect(() => {
        setDisableMute(initialDisableMute);
    }, [initialDisableMute]);

    async function handleChangeGroupName() {
        const isSuccess = await changeGroupName(groupId, groupName);
        if (isSuccess) {
            Message.success('修改群名称成功');
            action.setLinkmanProperty(groupId, 'name', groupName);
        }
    }

    async function handleChangeGroupAvatar() {
        const image = await readDiskFIle(
            'blob',
            'image/png,image/jpeg,image/gif',
        );
        if (!image) {
            return;
        }
        if (image.length > config.maxAvatarSize) {
            // eslint-disable-next-line consistent-return
            return Message.error('设置群头像失败, 请选择小于1.5MB的图片');
        }

        try {
            const imageUrl = await uploadFile(
                image.result as Blob,
                `GroupAvatar/${selfId}_${Date.now()}.${image.ext}`,
            );
            const isSuccess = await changeGroupAvatar(groupId, imageUrl);
            if (isSuccess) {
                // 使用服务器返回的路径，而不是本地 blob URL
                // 这样其他用户也能看到更新后的头像
                action.setLinkmanProperty(
                    groupId,
                    'avatar',
                    imageUrl,
                );
                Message.success('修改群头像成功');
            }
        } catch (err) {
            console.error('[GroupAvatar] 上传失败:', err);
            Message.error('上传群头像失败');
        }
    }

    async function handleDeleteGroup() {
        const isSuccess = await deleteGroup(groupId);
        if (isSuccess) {
            setDialogStatus(false);
            onClose();
            action.removeLinkman(groupId);
            Message.success('解散群组成功');
        }
    }

    async function handleLeaveGroup() {
        const isSuccess = await leaveGroup(groupId);
        if (isSuccess) {
            onClose();
            action.removeLinkman(groupId);
            Message.success('退出群组成功');
        }
    }

    function handleClickMask(e: React.MouseEvent) {
        if (e.target === e.currentTarget) {
            onClose();
        }
    }

    function handleShowUserInfo(userInfo: any) {
        if (userInfo._id === selfId) {
            return;
        }
        // @ts-ignore
        context.showUserInfo(userInfo);
        onClose();
    }

    /**
     * 切换群组禁言状态
     */
    async function handleToggleGroupMute() {
        const newDisableMute = !disableMute;
        const isSuccess = await toggleGroupMute(groupId, newDisableMute);
        if (isSuccess) {
            setDisableMute(newDisableMute);
            action.setLinkmanProperty(groupId, 'disableMute', newDisableMute);
            Message.success(newDisableMute ? '已开启群组禁言' : '已关闭群组禁言');
        } else {
            Message.error('操作失败，请重试');
        }
    }

    return (
        <div
            className={`${Style.groupManagePanel} ${visible ? 'show' : 'hide'}`}
            onClick={handleClickMask}
            role="button"
            data-float-panel="true"
        >
            <div
                className={`${Style.container} ${
                    visible ? Style.show : Style.hide
                }`}
            >
                <p className={Style.title}>群组信息</p>
                <div className={Style.content}>
                    {isLogin && selfId === creator ? (
                        <div className={Style.block}>
                            <p className={Style.blockTitle}>修改群名称</p>
                            <Input
                                className={Style.input}
                                value={groupName}
                                onChange={setGroupName}
                            />
                            <Button
                                className={Style.button}
                                onClick={handleChangeGroupName}
                            >
                                确认修改
                            </Button>
                        </div>
                    ) : null}
                    {isLogin && selfId === creator ? (
                        <div className={Style.block}>
                            <p className={Style.blockTitle}>修改群头像</p>
                            <div
                                style={{ cursor: 'pointer', display: 'inline-block' }}
                                onClick={handleChangeGroupAvatar}
                            >
                                <Avatar
                                    size={80}
                                    src={avatar}
                                />
                            </div>
                        </div>
                    ) : null}

                    {(isLogin && (selfId === creator || isAdmin)) ? (
                        <div className={Style.block}>
                            <p className={Style.blockTitle}>群组禁言</p>
                            <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                                <span style={{ marginRight: '10px', fontSize: '14px', color: '#333' }}>
                                    {disableMute ? '已开启禁言（仅管理员可发言）' : '未开启禁言（所有成员可发言）'}
                                </span>
                                <Switch
                                    onChange={handleToggleGroupMute}
                                    checked={disableMute}
                                />
                            </div>

{isAdmin ? (
    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
        <Button
            className={Style.button}
            onClick={() => setAdminMessagesVisible(true)}
        >
            列出消息
        </Button>
        <Button
            className={Style.button}
            onClick={() => setAdminUsersVisible(true)}
        >
            列出用户
        </Button>
    </div>
) : null}
                        </div>
                    ) : null}

                    <div className={Style.block}>
                        <p className={Style.blockTitle}>功能</p>
                        {selfId === creator ? (
                            <Button
                                className={Style.button}
                                type="danger"
                                onClick={() => setDialogStatus(true)}
                            >
                                解散群组
                            </Button>
                        ) : (
                            <Button
                                className={Style.button}
                                type="danger"
                                onClick={handleLeaveGroup}
                            >
                                退出群组
                            </Button>
                        )}
                    </div>
                    <div className={Style.block}>
                        <p className={Style.blockTitle}>
                            在线成员 &nbsp;<span>{onlineMembers.length}</span>
                        </p>
                        <div>
                            {onlineMembers.map((member) => (
                                <div
                                    key={member.user._id}
                                    className={Style.onlineMember}
                                >
                                    <div
                                        className={Style.userinfoBlock}
                                        onClick={() =>
                                            handleShowUserInfo(member.user)
                                        }
                                        role="button"
                                    >
                                        <Avatar
                                            size={24}
                                            src={member.user.avatar}
                                        />
                                        <p className={Style.username}>
                                            {member.user.username}
                                        </p>
                                    </div>
                                    <Tooltip
                                        placement="top"
                                        trigger={['hover']}
                                        overlay={
                                            <span>{member.environment}</span>
                                        }
                                    >
                                        <p className={Style.clientInfoText}>
                                            {member.browser}
                                            &nbsp;&nbsp;
                                            {member.os ===
                                            'Windows Server 2008 R2 / 7'
                                                ? 'Windows 7'
                                                : member.os}
                                        </p>
                                    </Tooltip>
                                </div>
                            ))}
                        </div>
                    </div>
{/* 管理员：消息列表（包含撤回消息） */}
<Dialog
    title="消息列表（数据库）"
    visible={adminMessagesVisible}
    onClose={() => setAdminMessagesVisible(false)}
    width={640}
    style={{ top: 40 }}
    footer={null}
>
    <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
        {adminMessagesLoading ? (
            <p>加载中...</p>
        ) : adminMessages.length === 0 ? (
            <p>暂无消息</p>
        ) : (
            adminMessages.map((m) => (
                <div
                    key={m._id}
                    style={{
                        borderBottom: '1px solid #eee',
                        padding: '8px 0',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '8px',
                        }}
                    >
                        <div style={{ fontSize: '12px', color: '#666' }}>
                            <span>
                                {m.from?.username || '未知用户'}
                            </span>
                            <span style={{ margin: '0 6px' }}>•</span>
                            <span>{new Date(m.createTime).toLocaleString()}</span>
                            <span style={{ margin: '0 6px' }}>•</span>
                            <span>{m.type}</span>
                            {m.deleted ? (
                                <span style={{ marginLeft: 8, color: '#d46b08' }}>
                                    已撤回(仍在库)
                                </span>
                            ) : null}
                        </div>
                        <Button
                            type="danger"
                            onClick={() =>
                                setConfirmDelete({
                                    type: 'message',
                                    id: m._id,
                                })
                            }
                        >
                            从数据库删除
                        </Button>
                    </div>
                    <div style={{ marginTop: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {String(m.content || '')}
                    </div>
                </div>
            ))
        )}
    </div>
</Dialog>

{/* 管理员：用户列表 */}
<Dialog
    title="用户列表（群成员，数据库）"
    visible={adminUsersVisible}
    onClose={() => setAdminUsersVisible(false)}
    width={640}
    style={{ top: 40 }}
    footer={null}
>
    <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
        {adminUsersLoading ? (
            <p>加载中...</p>
        ) : adminUsers.length === 0 ? (
            <p>暂无用户</p>
        ) : (
            adminUsers.map((u) => (
                <div
                    key={u._id}
                    style={{
                        borderBottom: '1px solid #eee',
                        padding: '8px 0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '10px',
                    }}
                >
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', color: '#333' }}>
                            {u.username}
                            {u.isCreator ? (
                                <span style={{ marginLeft: 8, color: '#1677ff', fontSize: 12 }}>
                                    群主
                                </span>
                            ) : null}
                            {u.isSealed ? (
                                <span style={{ marginLeft: 8, color: '#d46b08', fontSize: 12 }}>
                                    已封禁
                                </span>
                            ) : null}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                            ID: {u._id}
                        </div>
                    </div>
                    <Button
                        type="danger"
                        onClick={() =>
                            setConfirmDelete({
                                type: 'user',
                                id: u._id,
                                username: u.username,
                            })
                        }
                    >
                        从数据库删除
                    </Button>
                </div>
            ))
        )}
    </div>
</Dialog>

{/* 二次确认：硬删除（消息/用户） */}
<Dialog
    title="二次确认"
    visible={!!confirmDelete}
    onClose={() => setConfirmDelete(null)}
    width={420}
    style={{ top: 120 }}
    footer={(
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setConfirmDelete(null)}>取消</Button>
            <Button
                type="danger"
                onClick={async () => {
                    if (!confirmDelete) return;
                    try {
                        if (confirmDelete.type === 'message') {
                            const ok = await hardDeleteMessage(confirmDelete.id);
                            if (ok) {
                                Message.success('已从数据库删除消息');
                                await loadAdminMessages();
                            } else {
                                Message.error('删除失败');
                            }
                        } else if (confirmDelete.type === 'user') {
                            const ok = await hardDeleteUser(confirmDelete.id);
                            if (ok) {
                                Message.success('已从数据库删除用户');
                                await loadAdminUsers();
                            } else {
                                Message.error('删除失败');
                            }
                        }
                    } finally {
                        setConfirmDelete(null);
                    }
                }}
            >
                确认删除
            </Button>
        </div>
    )}
>
    <p style={{ lineHeight: 1.6 }}>
        {confirmDelete?.type === 'message'
            ? '确定要从数据库中彻底删除这条消息吗？删除后不可恢复。'
            : `确定要从数据库中彻底删除用户「${confirmDelete?.username || ''}」吗？该用户的消息等关联数据也会被删除，且不可恢复。`}
    </p>
</Dialog>
                    <Dialog
                        className={Style.deleteGroupConfirmDialog}
                        title="再次确认是否解散群组?"
                        visible={deleteConfirmDialog}
                        onClose={() => setDialogStatus(false)}
                    >
                        <Button
                            className={Style.deleteGroupConfirmButton}
                            type="danger"
                            onClick={handleDeleteGroup}
                        >
                            确认
                        </Button>
                        <Button
                            className={Style.deleteGroupConfirmButton}
                            onClick={() => setDialogStatus(false)}
                        >
                            取消
                        </Button>
                    </Dialog>
                </div>
            </div>
        </div>
    );
}

export default GroupManagePanel;
