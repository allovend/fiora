import React from 'react';

import Style from './IconButton.less';

type Props = {
    width: number;
    height: number;
    icon: string;
    iconSize: number;
    className?: string;
    /**
     * 可选 id：
     * - 用于提供稳定选择器（例如“管理员入口”需要被保护，避免被自定义 CSS 隐藏）
     */
    id?: string;
    style?: Object;
    onClick?: () => void;
};

function IconButton({
    width,
    height,
    icon,
    iconSize,
    onClick = () => {},
    className = '',
    id,
    style = {},
}: Props) {
    return (
        <div
            id={id}
            className={`${Style.iconButton} ${className}`}
            style={{ width, height, ...style }}
            onClick={onClick}
            role="button"
        >
            <i
                className={`iconfont icon-${icon}`}
                style={{ fontSize: iconSize, lineHeight: `${height}px` }}
            />
        </div>
    );
}

export default IconButton;
