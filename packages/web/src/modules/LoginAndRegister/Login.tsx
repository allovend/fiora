import React, { useState } from 'react';
import platform from 'platform';
import { useDispatch } from 'react-redux';

import getFriendId from '@fiora/utils/getFriendId';
import convertMessage from '@fiora/utils/convertMessage';
import Input from '../../components/Input';
import useAction from '../../hooks/useAction';

import Style from './LoginRegister.less';
import {
    login,
    loginByEmailCode,
    requestEmailLoginCode,
    getLinkmansLastMessagesV2,
} from '../../service';
import { Message } from '../../state/reducer';
import { ActionTypes } from '../../state/action';

/** 登录框 */
function Login() {
    const action = useAction();
    const dispatch = useDispatch();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [mode, setMode] = useState<'password' | 'emailCode'>('password');
    const [emailCode, setEmailCode] = useState('');

    async function handleLogin() {
        const user = mode === 'emailCode'
            ? await loginByEmailCode(
                  username,
                  emailCode,
                  platform.os?.family,
                  platform.name,
                  platform.description,
              )
            : await login(
                  username,
                  password,
                  platform.os?.family,
                  platform.name,
                  platform.description,
              );
        if (user) {
            action.setUser(user);
            action.toggleLoginRegisterDialog(false);
            window.localStorage.setItem('token', user.token);

            const linkmanIds = [
                ...user.groups.map((group: any) => group._id),
                ...user.friends.map((friend: any) =>
                    getFriendId(friend.from, friend.to._id),
                ),
            ];
            const linkmanMessages = await getLinkmansLastMessagesV2(linkmanIds);
            Object.values(linkmanMessages).forEach(
                // @ts-ignore
                ({ messages }: { messages: Message[] }) => {
                    messages.forEach(convertMessage);
                },
            );
            dispatch({
                type: ActionTypes.SetLinkmansLastMessages,
                payload: linkmanMessages,
            });
        }
    }

    async function handleSendEmailCode() {
        if (!username.trim()) {
            return;
        }
        await requestEmailLoginCode(username.trim());
    }

    return (
        <div className={Style.loginRegister}>
            <h3 className={Style.title}>用户名或邮箱</h3>
            <Input
                className={Style.input}
                value={username}
                onChange={setUsername}
                onEnter={handleLogin}
                id="login-username"
                name="username"
            />
            <div style={{ display: 'flex', gap: 8, margin: '6px 0 10px 0' }}>
                <button
                    className={Style.button}
                    style={{ height: 30, padding: '0 10px' }}
                    onClick={() => setMode('password')}
                    type="button"
                >
                    密码登录
                </button>
                <button
                    className={Style.button}
                    style={{ height: 30, padding: '0 10px' }}
                    onClick={() => setMode('emailCode')}
                    type="button"
                >
                    邮箱验证码登录
                </button>
            </div>

            {mode === 'password' ? (
                <>
                    <h3 className={Style.title}>密码</h3>
                    <Input
                        className={Style.input}
                        type="password"
                        value={password}
                        onChange={setPassword}
                        onEnter={handleLogin}
                        id="login-password"
                        name="password"
                    />
                </>
            ) : (
                <>
                    <h3 className={Style.title}>邮箱验证码（6位数字）</h3>
                    <Input
                        className={Style.input}
                        value={emailCode}
                        onChange={(v: string) => setEmailCode(v.replace(/\D/g, '').slice(0, 6))}
                        onEnter={handleLogin}
                        id="login-email-code"
                        name="emailCode"
                        placeholder="请输入 6 位数字验证码"
                    />
                    <button
                        className={Style.button}
                        onClick={handleSendEmailCode}
                        type="button"
                    >
                        发送邮箱验证码
                    </button>
                </>
            )}
            <button
                className={Style.button}
                onClick={handleLogin}
                type="button"
            >
                登录
            </button>
        </div>
    );
}

export default Login;
