import React, { SyntheticEvent, useState, useMemo } from 'react';
import { getOSSFileUrl } from '../utils/uploadFile';

export const avatarFailback = '/avatar/0.jpg';

type Props = {
    /** 头像链接 */
    src: string;
    /** 展示大小 */
    size?: number;
    /** 额外类名 */
    className?: string;
    /** 点击事件 */
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
} & Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    // 这些属性由组件内部控制（避免被外部覆盖导致异常）
    'src' | 'style' | 'className' | 'onError' | 'onClick' | 'onMouseEnter' | 'onMouseLeave'
>;

function Avatar({
    src,
    size = 60,
    className = '',
    onClick,
    onMouseEnter,
    onMouseLeave,
    // 允许透传 data-* / aria-* 等属性，便于用户自定义 CSS（稳定选择器）
    ...rest
}: Props) {
    const [failTimes, updateFailTimes] = useState(0);

    /**
     * Handle avatar load fail event. Use faillback avatar instead
     * If still fail then ignore error event
     */
    function handleError(e: SyntheticEvent<HTMLImageElement>) {
        if (failTimes >= 2) {
            return;
        }
        e.currentTarget.src = avatarFailback;
        updateFailTimes(failTimes + 1);
    }

    const url = useMemo(() => {
        if (/^(blob|data):/.test(src)) {
            return src;
        }
        return getOSSFileUrl(
            src,
            `image/resize,w_${size * 2},h_${size * 2}/quality,q_90`,
        );
    }, [src]);

    return (
        <img
            // 先透传“无害属性”（如 data-fiora、aria-label），再写入组件内部控制字段
            {...rest}
            className={className}
            style={{ width: size, height: size, borderRadius: size / 2 }}
            src={url}
            alt=""
            onClick={onClick}
            onError={handleError}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        />
    );
}

export default Avatar;
