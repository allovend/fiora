import React from 'react';
import { useSelector } from 'react-redux';

import useIsLogin from '../../hooks/useIsLogin';
import useAction from '../../hooks/useAction';
import FunctionBar from './FunctionBar';
import LinkmanList from './LinkmanList';

import Style from './FunctionBarAndLinkmanList.less';
import { State } from '../../state/reducer';
import useAero from '../../hooks/useAero';

function FunctionBarAndLinkmanList() {
    const isLogin = useIsLogin();
    const action = useAction();
    const functionBarAndLinkmanListVisible = useSelector(
        (state: State) => state.status.functionBarAndLinkmanListVisible,
    );
    const aero = useAero();

    if (!functionBarAndLinkmanListVisible) {
        return null;
    }

    function handleClick(e: any) {
        if (e.target === e.currentTarget) {
            action.setStatus('functionBarAndLinkmanListVisible', false);
        }
    }

    return (
        <div
            className={`${Style.functionBarAndLinkmanList} functionBarAndLinkmanList`}
            onClick={handleClick}
            role="button"
            // 稳定选择器：联系人区（功能栏 + 联系人列表）
            data-fiora="linkman-area"
        >
            <div className={`${Style.container} container`} {...aero}>
                {isLogin && <FunctionBar />}
                <LinkmanList />
            </div>
        </div>
    );
}

export default FunctionBarAndLinkmanList;
