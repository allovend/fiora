import React, { useEffect, useState } from 'react';
import { css } from 'linaria';
import Style from './Admin.less';
import Common from './Common.less';
import Dialog from '../../components/Dialog';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Message from '../../components/Message';
import {
    getSealList,
    resetUserPassword,
    deleteUser,
    sealUser,
    cancelSealUser,
    setUserTag,
    sealIp,
    cancelSealIp,
    toggleSendMessage,
    toggleNewUserSendMessage,
    toggleRegister,
    toggleCreateGroup,
    getSystemConfig,
    updateSystemConfig,
    banUsername,
    unbanUsername,
    getBannedUsernameList,
    getAllOnlineUsers,
} from '../../service';

const styles = {
    button: css`
        min-width: 100px;
        height: 36px;
        margin-right: 12px;
        margin-bottom: 12px;
        padding: 0 10px;
    `,
    sealItem: css`
        display: inline-block;
        padding: 4px 8px;
        margin: 4px;
        background: #eee;
        border-radius: 6px; // TODO: 使用 CSS 变量
        cursor: pointer;
        &:hover {
            background: #ffccc7;
            text-decoration: line-through;
        }
    `,
    select: css`
        margin-right: 10px;
        height: 34px;
        border-radius: 6px; // TODO: 使用 CSS 变量
        border: 1px solid #ddd;
    `
};

type SystemConfig = {
    disableSendMessage: boolean;
    disableNewUserSendMessage: boolean;
    disableRegister: boolean;
    disableCreateGroup: boolean;
    disableDeleteMessage: boolean;
};

interface AdminProps {
    visible: boolean;
    onClose: () => void;
}

function Admin(props: AdminProps) {
    const { visible, onClose } = props;

    const [tagUsername, setTagUsername] = useState('');
    const [tag, setTag] = useState('');
    const [resetPasswordUsername, setResetPasswordUsername] = useState('');
    const [deleteUsername, setDeleteUsername] = useState('');
    const [sealUsername, setSealUsername] = useState('');
    const [sealDuration, setSealDuration] = useState('0'); // 0 代表永久
    const [sealList, setSealList] = useState({ users: [], ips: [] });
    const [sealIpAddress, setSealIpAddress] = useState('');
    const [systemConfig, setSystemConfig] = useState<SystemConfig>();
    const [bannedUsername, setBannedUsername] = useState('');
    const [bannedUsernameList, setBannedUsernameList] = useState<string[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<
        Array<{
            userId: string;
            username: string;
            avatar: string;
            ip: string;
            os: string;
            browser: string;
        }>
    >([]);

    async function handleGetSealList() {
        const sealListRes = await getSealList();
        if (sealListRes) {
            setSealList(sealListRes);
        }
    }
    async function handleGetSystemConfig() {
        const systemConfigRes = await getSystemConfig();
        if (systemConfigRes) {
            setSystemConfig(systemConfigRes);
        }
    }
    async function handleGetBannedUsernameList() {
        const res = await getBannedUsernameList();
        if (res && res.usernames) {
            setBannedUsernameList(res.usernames);
        }
    }
    async function handleGetOnlineUsers() {
        const users = await getAllOnlineUsers();
        if (users) {
            setOnlineUsers(users);
        }
    }
    useEffect(() => {
        if (visible) {
            handleGetSystemConfig();
            handleGetSealList();
            handleGetBannedUsernameList();
            handleGetOnlineUsers();
            // 每 5 秒刷新一次在线用户列表
            const interval = setInterval(() => {
                handleGetOnlineUsers();
            }, 5000);
            return () => clearInterval(interval);
        }
    }, [visible]);

    async function handleUpdateConfig(key: keyof SystemConfig, value: boolean) {
        const isSuccess = await updateSystemConfig({ [key]: value });
        if (isSuccess) {
            Message.success('设置更新成功');
            handleGetSystemConfig();
        }
    }

    async function handleSeal(username?: string, isCancel = false) {
        const target = username || sealUsername;
        if (!target) {
            Message.error('请输入用户名');
            return;
        }
        
        let isSuccess = false;
        if (isCancel) {
            // 解禁用户
            console.log('[解禁用户] 用户名:', target);
            isSuccess = await cancelSealUser(target);
            console.log('[解禁用户] 结果:', isSuccess);
        } else {
            // 封禁用户
            isSuccess = await sealUser(target);
        }
        
        if (isSuccess) {
            Message.success(isCancel ? '已解禁' : '已封禁');
            if (!isCancel) setSealUsername('');
            // 立即刷新封禁列表
            setTimeout(() => {
                handleGetSealList();
            }, 200);
        } else {
            Message.error(isCancel ? '解禁失败，请重试' : '封禁失败，请重试');
        }
    }

    async function handleSealIp(ip?: string, isCancel = false) {
        const target = ip || sealIpAddress;
        if (!target) {
            Message.error('请输入IP地址');
            return;
        }
        
        let isSuccess = false;
        if (isCancel) {
            // 解禁IP
            isSuccess = await cancelSealIp(target);
        } else {
            // 封禁IP
            isSuccess = await sealIp(target);
        }
        
        if (isSuccess) {
            Message.success(isCancel ? 'IP已解禁' : 'IP已封禁');
            if (!isCancel) setSealIpAddress('');
            handleGetSealList();
        }
    }

    async function handleBanUsername() {
        if (!bannedUsername.trim()) {
            Message.error('请输入用户名');
            return;
        }
        const isSuccess = await banUsername(bannedUsername.trim());
        if (isSuccess) {
            Message.success('用户名已封禁');
            setBannedUsername('');
            handleGetBannedUsernameList();
        }
    }

    async function handleUnbanUsername(username: string) {
        const isSuccess = await unbanUsername(username);
        if (isSuccess) {
            Message.success('用户名已解禁');
            handleGetBannedUsernameList();
        }
    }

    /**
     * 处理切换注册功能
     */
    async function handleDisableRegister() {
        const isSuccess = await toggleRegister(false);
        if (isSuccess) {
            Message.success('已禁用注册功能');
            handleGetSystemConfig();
        }
    }

    async function handleEnableRegister() {
        const isSuccess = await toggleRegister(true);
        if (isSuccess) {
            Message.success('已启用注册功能');
            handleGetSystemConfig();
        }
    }

    /**
     * 处理切换创建群组功能
     */
    async function handleDisableCreateGroup() {
        const isSuccess = await toggleCreateGroup(false);
        if (isSuccess) {
            Message.success('已禁用创建群组功能');
            handleGetSystemConfig();
        }
    }

    async function handleEnableCreateGroup() {
        const isSuccess = await toggleCreateGroup(true);
        if (isSuccess) {
            Message.success('已启用创建群组功能');
            handleGetSystemConfig();
        }
    }

    /**
     * 处理设置用户铭牌
     */
    async function handleSetTag() {
        if (!tagUsername.trim()) {
            Message.error('请输入用户名');
            return;
        }
        if (!tag.trim()) {
            Message.error('请输入标签内容');
            return;
        }
        // 验证标签格式：允许5个汉字或者10个字母
        if (!/^([0-9a-zA-Z]{1,2}|[\u4e00-\u9eff]){1,5}$/.test(tag.trim())) {
            Message.error('标签不符合要求，允许5个汉字或者10个字母');
            return;
        }
        const isSuccess = await setUserTag(tagUsername.trim(), tag.trim());
        if (isSuccess) {
            Message.success('用户标签已更新');
            setTagUsername('');
            setTag('');
        } else {
            Message.error('更新标签失败，请重试');
        }
    }

    return (
        <Dialog
            /**
             * 额外添加稳定 class / wrapClassName：
             * - 用于“保护管理员控制台”不被自定义 CSS 隐藏
             * - 自定义 CSS 注入在 <head>，若用户写了过于激进的规则（如 .rc-dialog-wrap{display:none}）
             *   会导致管理员控制台“消失”
             */
            className={`${Style.admin} admin-console-dialog ${visible ? 'admin-console-visible' : ''}`}
            /**
             * rc-dialog 支持 wrapClassName，用于 rc-dialog-wrap 的 class
             * 关键点：用 `admin-console-visible` 标记“打开态”
             * - 不能依赖 aria-hidden（你截图里 aria-hidden 为空）
             * - 保护样式只对“打开态”生效，避免影响关闭按钮
             */
            wrapClassName={`admin-console-wrap ${visible ? 'admin-console-visible' : ''}`}
            visible={visible}
            title="管理员控制台"
            onClose={onClose}
        >
            <div className={Common.container}>
                <div className={Common.block}>
                    <p className={Common.title}>全局开关</p>
                    {/* 全局禁言按钮：显示当前状态，点击切换 */}
                    <Button 
                        className={styles.button} 
                        type={systemConfig?.disableSendMessage ? "danger" : "primary"} 
                        onClick={async () => {
                            if (systemConfig === undefined) return;
                            const currentValue = systemConfig.disableSendMessage;
                            const newValue = !currentValue;
                            const isSuccess = await updateSystemConfig({ disableSendMessage: newValue });
                            if (isSuccess) {
                                Message.success(newValue ? '已开启全局禁言' : '已关闭全局禁言');
                                setSystemConfig(prev => prev ? { ...prev, disableSendMessage: newValue } : prev);
                                setTimeout(() => {
                                    handleGetSystemConfig();
                                }, 100);
                            } else {
                                Message.error('操作失败，请重试');
                            }
                        }}
                    >
                        {systemConfig?.disableSendMessage ? '全局禁言 [已开启]' : '全局禁言 [已关闭]'}
                    </Button>
                    {/* 新用户发言按钮：显示当前状态，点击切换 */}
                    <Button 
                        className={styles.button} 
                        type={systemConfig?.disableNewUserSendMessage ? "danger" : "primary"} 
                        onClick={async () => {
                            if (systemConfig === undefined) return;
                            const currentValue = systemConfig.disableNewUserSendMessage;
                            const newValue = !currentValue;
                            const isSuccess = await updateSystemConfig({ disableNewUserSendMessage: newValue });
                            if (isSuccess) {
                                Message.success(newValue ? '已禁止新用户发言' : '已允许新用户发言');
                                setSystemConfig(prev => prev ? { ...prev, disableNewUserSendMessage: newValue } : prev);
                                setTimeout(() => {
                                    handleGetSystemConfig();
                                }, 100);
                            } else {
                                Message.error('操作失败，请重试');
                            }
                        }}
                    >
                        {systemConfig?.disableNewUserSendMessage ? '新用户发言 [已禁止]' : '新用户发言 [已允许]'}
                    </Button>
                    {/* 注册功能按钮：显示当前状态，点击切换 */}
                    <Button 
                        className={styles.button} 
                        type={systemConfig?.disableRegister ? "danger" : "primary"} 
                        onClick={async () => {
                            if (systemConfig === undefined) return;
                            const currentValue = systemConfig.disableRegister;
                            const newValue = !currentValue;
                            const isSuccess = await updateSystemConfig({ disableRegister: newValue });
                            if (isSuccess) {
                                Message.success(newValue ? '已禁止注册' : '已允许注册');
                                setSystemConfig(prev => prev ? { ...prev, disableRegister: newValue } : prev);
                                setTimeout(() => {
                                    handleGetSystemConfig();
                                }, 100);
                            } else {
                                Message.error('操作失败，请重试');
                            }
                        }}
                    >
                        {systemConfig?.disableRegister ? '用户注册 [已禁止]' : '用户注册 [已允许]'}
                    </Button>
                    {/* 建群功能按钮：显示当前状态，点击切换 */}
                    <Button 
                        className={styles.button} 
                        type={systemConfig?.disableCreateGroup ? "danger" : "primary"} 
                        onClick={async () => {
                            if (systemConfig === undefined) return;
                            const currentValue = systemConfig.disableCreateGroup;
                            const newValue = !currentValue;
                            const isSuccess = await updateSystemConfig({ disableCreateGroup: newValue });
                            if (isSuccess) {
                                Message.success(newValue ? '已禁止建群' : '已允许建群');
                                setSystemConfig(prev => prev ? { ...prev, disableCreateGroup: newValue } : prev);
                                setTimeout(() => {
                                    handleGetSystemConfig();
                                }, 100);
                            } else {
                                Message.error('操作失败，请重试');
                            }
                        }}
                    >
                        {systemConfig?.disableCreateGroup ? '创建群组 [已禁止]' : '创建群组 [已允许]'}
                    </Button>
                    {/* 撤回消息按钮：显示当前状态，点击切换 */}
                    <Button 
                        className={styles.button} 
                        type={systemConfig?.disableDeleteMessage ? "danger" : "primary"} 
                        onClick={async () => {
                            if (systemConfig === undefined) return;
                            const currentValue = systemConfig.disableDeleteMessage;
                            const newValue = !currentValue;
                            const isSuccess = await updateSystemConfig({ disableDeleteMessage: newValue });
                            if (isSuccess) {
                                Message.success(newValue ? '已禁止撤回消息' : '已允许撤回消息');
                                setSystemConfig(prev => prev ? { ...prev, disableDeleteMessage: newValue } : prev);
                                setTimeout(() => {
                                    handleGetSystemConfig();
                                }, 100);
                            } else {
                                Message.error('操作失败，请重试');
                            }
                        }}
                    >
                        {systemConfig?.disableDeleteMessage ? '撤回消息 [已禁止]' : '撤回消息 [已允许]'}
                    </Button>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>在线用户 ({onlineUsers.length})</p>
                    <div className={Style.sealList} style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {onlineUsers.length === 0 ? (
                            <span style={{ color: '#999' }}>暂无在线用户</span>
                        ) : (
                            onlineUsers.map((user) => (
                                <div
                                    key={user.userId}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '4px 0',
                                        borderBottom: '1px solid #eee',
                                    }}
                                >
                                    <img
                                        src={user.avatar}
                                        alt={user.username}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            marginRight: '8px',
                                        }}
                                    />
                                    <span style={{ flex: 1 }}>{user.username}</span>
                                    <span
                                        style={{
                                            fontSize: '12px',
                                            color: '#999',
                                            marginLeft: '8px',
                                        }}
                                        title={`IP: ${user.ip}, OS: ${user.os}, Browser: ${user.browser}`}
                                    >
                                        {user.ip}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>更新用户标签</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={`${Style.input} ${Style.tagUsernameInput}`}
                            value={tagUsername}
                            onChange={setTagUsername}
                            placeholder="要更新标签的用户名"
                        />
                        <Input
                            className={`${Style.input} ${Style.tagInput}`}
                            value={tag}
                            onChange={setTag}
                            placeholder="标签内容"
                        />
                        <Button className={Style.button} onClick={handleSetTag}>
                            确定
                        </Button>
                    </div>
                </div>
                <div className={Common.block}>
                    <p className={Common.title}>重置用户密码</p>
                    <div className={Style.inputBlock}>
                        <Input
                            className={Style.input}
                            value={resetPasswordUsername}
                            onChange={setResetPasswordUsername}
                            placeholder="要重置密码的用户名"
                        />
                        <Button
                            className={Style.button}
                            onClick={async () => {
                                const res = await resetUserPassword(resetPasswordUsername);
                                if (res) Message.success(`新密码:${res.newPassword}`);
                            }}
                        >
                            重置密码
                        </Button>
                    </div>
                </div>

                <div className={Common.block}>
                    <p className={Common.title}>封禁用户 (点击列表可解禁)</p>
                    <div className={Style.inputBlock}>
                        <Input className={Style.input} value={sealUsername} onChange={setSealUsername} placeholder="用户名" />
                        <select className={styles.select} value={sealDuration} onChange={(e) => setSealDuration(e.target.value)}>
                            <option value="0">永久</option>
                            <option value="10">10分钟</option>
                            <option value="60">1小时</option>
                            <option value="1440">1天</option>
                        </select>
                        <Button className={Style.button} onClick={() => handleSeal()}>确定</Button>
                    </div>
                    <div className={Style.sealList}>
                        {sealList.users.map((u) => (
                            <span className={styles.sealItem} key={u} onClick={() => handleSeal(u, true)} title="点击解禁">
                                {u} ✖
                            </span>
                        ))}
                    </div>
                </div>

                <div className={Common.block}>
                    <p className={Common.title}>封禁IP (点击列表可解禁)</p>
                    <div className={Style.inputBlock}>
                        <Input className={Style.input} value={sealIpAddress} onChange={setSealIpAddress} placeholder="IP地址" />
                        <Button className={Style.button} onClick={() => handleSealIp()}>确定</Button>
                    </div>
                    <div className={Style.sealList}>
                        {sealList.ips.map((ip) => (
                            <span className={styles.sealItem} key={ip} onClick={() => handleSealIp(ip, true)} title="点击解禁">
                                {ip} ✖
                            </span>
                        ))}
                    </div>
                </div>

                <div className={Common.block}>
                    <p className={Common.title}>封禁用户名列表 (点击列表可解禁)</p>
                    <p className={Style.tip}>封禁的用户名将无法用于注册新账号</p>
                    <div className={Style.inputBlock}>
                        <Input 
                            className={Style.input} 
                            value={bannedUsername} 
                            onChange={setBannedUsername} 
                            placeholder="要封禁的用户名" 
                        />
                        <Button className={Style.button} onClick={handleBanUsername}>封禁</Button>
                    </div>
                    <div className={Style.sealList}>
                        {bannedUsernameList.map((username) => (
                            <span 
                                className={styles.sealItem} 
                                key={username} 
                                onClick={() => handleUnbanUsername(username)} 
                                title="点击解禁"
                            >
                                {username} ✖
                            </span>
                        ))}
                    </div>
                </div>

                <div className={Common.block}>
                    <p className={Common.title}>用户管理</p>
                    <div className={Style.inputBlock}>
                        <Input className={Style.input} value={resetPasswordUsername} onChange={setResetPasswordUsername} placeholder="重置密码用户名" />
                        <Button className={Style.button} onClick={async () => {
                            const res = await resetUserPassword(resetPasswordUsername);
                            if (res) Message.success(`新密码:${res.newPassword}`);
                        }}>重置密码</Button>
                    </div>
                    <div className={Style.inputBlock} style={{ marginTop: '10px' }}>
                        <Input 
                            className={Style.input} 
                            value={deleteUsername} 
                            onChange={setDeleteUsername} 
                            placeholder="删除用户名（将删除用户所有数据并强制下线）" 
                        />
                        <Button 
                            className={Style.button} 
                            type="danger"
                            onClick={async () => {
                                if (!deleteUsername.trim()) {
                                    Message.error('请输入用户名');
                                    return;
                                }
                                // 确认删除
                                if (!window.confirm(`确定要删除用户 "${deleteUsername}" 吗？\n此操作将：\n1. 删除用户所有数据（消息、群组关系、好友关系等）\n2. 强制下线该用户\n3. 此操作不可恢复！`)) {
                                    return;
                                }
                                const isSuccess = await deleteUser(deleteUsername.trim());
                                if (isSuccess) {
                                    Message.success('用户已删除');
                                    setDeleteUsername('');
                                } else {
                                    Message.error('删除用户失败，请重试');
                                }
                            }}
                        >
                            删除用户
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}

export default Admin;
