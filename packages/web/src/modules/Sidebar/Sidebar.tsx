import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import loadable from '@loadable/component';

import { isMobile } from '@fiora/utils/ua';
import { State } from '../../state/reducer';
import useIsLogin from '../../hooks/useIsLogin';
import Avatar from '../../components/Avatar';
import Tooltip from '../../components/Tooltip';
import IconButton from '../../components/IconButton';
import OnlineStatus from './OnlineStatus';
import useAction from '../../hooks/useAction';
import socket from '../../socket';
import Message from '../../components/Message';

import Admin from './Admin';
import Download from './Download';
import About from './About';

import Style from './Sidebar.less';
import useAero from '../../hooks/useAero';

const SelfInfoAsync = loadable(
    () =>
        // @ts-ignore
        import(/* webpackChunkName: "self-info" */ './SelfInfo'),
);
const SettingAsync = loadable(
    // @ts-ignore
    () => import(/* webpackChunkName: "setting" */ './Setting'),
);

function Sidebar() {
    const sidebarVisible = useSelector(
        (state: State) => state.status.sidebarVisible,
    );
    const action = useAction();
    const isLogin = useIsLogin();
    const isConnect = useSelector((state: State) => state.connect);
    const isAdmin = useSelector(
        (state: State) => state.user && state.user.isAdmin,
    );
    const avatar = useSelector(
        (state: State) => state.user && state.user.avatar,
    );

    const [selfInfoDialogVisible, toggleSelfInfoDialogVisible] =
        useState(false);
    const [adminDialogVisible, toggleAdminDialogVisible] = useState(false);
    const [downloadDialogVisible, toggleDownloadDialogVisible] =
        useState(false);
    const [aboutDialogVisible, toggleAboutDialogVisible] = useState(false);
    const [settingDialogVisible, toggleSettingDialogVisible] = useState(false);
    const aero = useAero();

    if (!sidebarVisible) {
        return null;
    }

    function logout() {
        action.logout();
        window.localStorage.removeItem('token');
        Message.success('您已经退出登录');
        socket.disconnect();
        socket.connect();
    }

    function renderTooltip(text: string, component: JSX.Element) {
        const children = <div>{component}</div>;
        if (isMobile) {
            return children;
        }
        return (
            <Tooltip
                placement="right"
                mouseEnterDelay={0.3}
                overlay={<span>{text}</span>}
            >
                {children}
            </Tooltip>
        );
    }

    return (
        <>
            <div
                id="sidebar-root"
                className={`${Style.sidebar} sidebar`}
                // 稳定选择器：用于用户自定义 CSS（不走 CSS Modules hash）
                data-fiora="sidebar"
                {...aero}
            >
                {isLogin && avatar && (
                    <Avatar
                        className={`${Style.avatar} avatar`}
                        src={avatar}
                        onClick={() => toggleSelfInfoDialogVisible(true)}
                        // 头像也给一个稳定的 data-fiora（需要 Avatar 组件透传属性）
                        data-fiora="sidebar-avatar"
                    />
                )}
                {isLogin && (
                    <OnlineStatus
                        className={`${Style.status} status`}
                        status={isConnect ? 'online' : 'offline'}
                    />
                )}
                <div id="sidebar-buttons" className={`${Style.buttons} buttons`}>
                    {isLogin &&
                        isAdmin &&
                        renderTooltip(
                            '管理员',
                            <IconButton
                                width={40}
                                height={40}
                                icon="administrator"
                                iconSize={28}
                                // 稳定 id：用于“保护管理员入口”不被自定义 CSS 隐藏
                                id="admin-entry"
                                onClick={() => toggleAdminDialogVisible(true)}
                            />,
                        )}
                    <Tooltip
                        placement="right"
                        mouseEnterDelay={0.3}
                        overlay={<span>源码</span>}
                    >
                        <a
                            className={Style.linkButton}
                            href="https://github.com/jonas-pi/fiora"
                            target="_black"
                            rel="noopener noreferrer"
                        >
                            <IconButton
                                width={40}
                                height={40}
                                icon="github"
                                iconSize={26}
                            />
                        </a>
                    </Tooltip>
                    {renderTooltip(
                        '下载APP',
                        <IconButton
                            width={40}
                            height={40}
                            icon="app"
                            iconSize={28}
                            onClick={() => toggleDownloadDialogVisible(true)}
                        />,
                    )}
                    {renderTooltip(
                        '关于',
                        <IconButton
                            width={40}
                            height={40}
                            icon="about"
                            iconSize={26}
                            onClick={() => toggleAboutDialogVisible(true)}
                        />,
                    )}
                    {isLogin &&
                        renderTooltip(
                            '设置',
                            <IconButton
                                width={40}
                                height={40}
                                icon="setting"
                                iconSize={26}
                                onClick={() => toggleSettingDialogVisible(true)}
                            />,
                        )}
                    {isLogin &&
                        renderTooltip(
                            '退出登录',
                            <IconButton
                                width={40}
                                height={40}
                                icon="logout"
                                iconSize={26}
                                onClick={logout}
                            />,
                        )}
                </div>

                {/* 弹窗 */}
                {isLogin && selfInfoDialogVisible && (
                    <SelfInfoAsync
                        visible={selfInfoDialogVisible}
                        onClose={() => toggleSelfInfoDialogVisible(false)}
                    />
                )}
                {isLogin && isAdmin && (
                    <Admin
                        visible={adminDialogVisible}
                        onClose={() => toggleAdminDialogVisible(false)}
                    />
                )}
                <Download
                    visible={downloadDialogVisible}
                    onClose={() => toggleDownloadDialogVisible(false)}
                />
                <About
                    visible={aboutDialogVisible}
                    onClose={() => toggleAboutDialogVisible(false)}
                />
                {isLogin && settingDialogVisible && (
                    <SettingAsync
                        visible={settingDialogVisible}
                        onClose={() => toggleSettingDialogVisible(false)}
                    />
                )}
            </div>
        </>
    );
}

export default Sidebar;
