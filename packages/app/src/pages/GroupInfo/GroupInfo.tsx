import React, { useState } from 'react';
import { Button, Text, View } from 'native-base';
import { StyleSheet } from 'react-native';
import { Actions } from 'react-native-router-flux';
import Dialog from 'react-native-dialog';
import PageContainer from '../../components/PageContainer';
import Avatar from '../../components/Avatar';
import { useFocusLinkman, useLinkmans, useIsAdmin } from '../../hooks/useStore';
import { Linkman } from '../../types/redux';
import action from '../../state/action';
import { getLinkmanHistoryMessages, joinGroup } from '../../service';

type Props = {
    group: {
        _id: string;
        avatar: string;
        name: string;
        members: number;
        isPrivate?: boolean;
    };
};

function GroupInfo({ group }: Props) {
    const { _id, avatar, name, members } = group;
    const linkmans = useLinkmans();
    const linkman = linkmans.find(
        (x) => x._id === _id && x.type === 'group',
    ) as Linkman;
    const isJoined = !!linkman;
    const currentLinkman = useFocusLinkman() as Linkman;
    const isAdmin = useIsAdmin();
    const [passwordDialogVisible, setPasswordDialogVisible] = useState(false);
    const [joinPassword, setJoinPassword] = useState('');

    function handleSendMessage() {
        action.setFocus(group._id);
        if (currentLinkman._id === group._id) {
            Actions.popTo('chat');
        } else {
            Actions.popTo('_chatlist');
            Actions.push('chat', { title: group.name });
        }
    }

    async function doJoin(password = '') {
        const newLinkman = await joinGroup(_id, password);
        if (newLinkman) {
            action.addLinkman({
                ...newLinkman,
                type: 'group',
                unread: 0,
                messages: [],
            });
            const messages = await getLinkmanHistoryMessages(_id, 0);
            action.addLinkmanHistoryMessages(_id, messages);
            action.setFocus(_id);

            Actions.popTo('_chatlist');
            Actions.push('chat', { title: newLinkman.name });
        }
    }

    async function handleJoinGroup() {
        // 私密群：非管理员需要输入密码
        if (group.isPrivate && !isAdmin) {
            setJoinPassword('');
            setPasswordDialogVisible(true);
            return;
        }
        await doJoin('');
    }

    async function handleConfirmPassword() {
        setPasswordDialogVisible(false);
        await doJoin(joinPassword);
        setJoinPassword('');
    }

    return (
        <PageContainer>
            <View style={styles.container}>
                <View style={styles.userContainer}>
                    <Avatar src={avatar} size={88} />
                    <Text style={styles.nick}>{name}</Text>
                </View>
                <View style={styles.infoContainer}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>人数:</Text>
                        <Text style={styles.infoValue}>{members}</Text>
                    </View>
                </View>
                <View style={styles.buttonContainer}>
                    {isJoined ? (
                        <Button
                            primary
                            block
                            style={styles.button}
                            onPress={handleSendMessage}
                        >
                            <Text>发送消息</Text>
                        </Button>
                    ) : (
                        <Button
                            primary
                            block
                            style={styles.button}
                            onPress={handleJoinGroup}
                        >
                            <Text>加入群组</Text>
                        </Button>
                    )}
                </View>
            </View>

            <Dialog.Container visible={passwordDialogVisible}>
                <Dialog.Title>加入私密群组</Dialog.Title>
                <Dialog.Description>请输入密码</Dialog.Description>
                <Dialog.Input
                    value={joinPassword}
                    onChangeText={setJoinPassword}
                    placeholder="请输入密码！"
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <Dialog.Button
                    label="取消"
                    onPress={() => {
                        setPasswordDialogVisible(false);
                        setJoinPassword('');
                    }}
                />
                <Dialog.Button label="确定" onPress={handleConfirmPassword} />
            </Dialog.Container>
        </PageContainer>
    );
}

export default GroupInfo;

const styles = StyleSheet.create({
    container: {
        paddingTop: 20,
        paddingLeft: 16,
        paddingRight: 16,
    },
    userContainer: {
        alignItems: 'center',
    },
    infoContainer: {
        marginTop: 20,
    },
    infoRow: {
        flexDirection: 'row',
    },
    infoLabel: {
        color: '#666',
    },
    infoValue: {
        color: '#333',
        marginLeft: 12,
    },
    nick: {
        color: '#333',
        marginTop: 6,
    },
    buttonContainer: {
        marginTop: 20,
    },
    button: {
        marginBottom: 12,
    },
});
