import React, { useState } from 'react';

import Style from './CreateGroup.less';
import Dialog from '../../components/Dialog';
import Input from '../../components/Input';
import Message from '../../components/Message';
import { createGroup } from '../../service';
import useAction from '../../hooks/useAction';

interface CreateGroupProps {
    visible: boolean;
    onClose: () => void;
}

function CreateGroup(props: CreateGroupProps) {
    const { visible, onClose } = props;
    const action = useAction();
    const [groupName, setGroupName] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [password, setPassword] = useState('');

    async function handleCreateGroup() {
        const group = await createGroup(groupName, isPrivate, password);
        if (group) {
            group.type = 'group';
            action.addLinkman(group, true);
            setGroupName('');
            setIsPrivate(false);
            setPassword('');
            onClose();
            Message.success('创建群组成功');
        }
    }

    return (
        <Dialog title="创建群组" visible={visible} onClose={onClose}>
            <div className={Style.container}>
                <h3 className={Style.text}>请输入群组名</h3>
                <Input
                    className={Style.input}
                    value={groupName}
                    onChange={setGroupName}
                />

                <div className={Style.privacyRow}>
                    <span className={Style.privacyLabel}>群组权限</span>
                    <button
                        type="button"
                        className={`${Style.privacySwitch} ${
                            isPrivate ? Style.privateOn : ''
                        }`}
                        onClick={() => setIsPrivate(!isPrivate)}
                        aria-pressed={isPrivate}
                    >
                        <span className={Style.switchTextLeft}>公开</span>
                        <span className={Style.switchThumb} />
                        <span className={Style.switchTextRight}>私密</span>
                    </button>
                </div>

                {isPrivate ? (
                    <Input
                        className={Style.passwordInput}
                        type="password"
                        value={password}
                        placeholder="请输入密码！"
                        onChange={setPassword}
                    />
                ) : null}
                <button
                    className={Style.button}
                    onClick={handleCreateGroup}
                    type="button"
                >
                    创建
                </button>
            </div>
        </Dialog>
    );
}

export default CreateGroup;
