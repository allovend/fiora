import React, { useEffect, useMemo, useRef, useState } from 'react';
import Loading from 'react-loading';

import expressions from '@fiora/utils/expressions';
import { addParam } from '@fiora/utils/url';
import BaiduImage from '@fiora/assets/images/baidu.png';
import Style from './Expression.less';
import {
    Tabs,
    TabPane,
    TabContent,
    ScrollableInkTabBar,
} from '../../components/Tabs';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { addUserSticker, deleteUserSticker, getUserStickers, searchExpression } from '../../service';
import Message from '../../components/Message';
import readDiskFile from '../../utils/readDiskFile';
import uploadFileWithProgress from '../../utils/uploadFileWithProgress';
import { loadLocalStickers, saveLocalStickers, StickerItem, validateStickerMeta } from '../../utils/stickers';
import { useSelector } from 'react-redux';
import { State } from '../../state/reducer';

interface ExpressionProps {
    onSelectText: (expression: string) => void;
    onSelectImage: (expression: string) => void;
}

function Expression(props: ExpressionProps) {
    const { onSelectText, onSelectImage } = props;

    const selfId = useSelector((state: State) => state.user?._id);

    const [keywords, setKeywords] = useState('');
    const [searchLoading, toggleSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    const [stickersLoading, setStickersLoading] = useState(false);
    const [stickers, setStickers] = useState<StickerItem[]>([]);

    // 长按删除：按下后启动计时器，松开/移出取消
    const longPressTimerRef = useRef<number | null>(null);

    const storageUserId = useMemo(() => selfId || '', [selfId]);

    async function handleSearchExpression() {
        if (keywords) {
            toggleSearchLoading(true);
            setSearchResults([]);
            try {
                const result = await searchExpression(keywords);
                if (result) {
                    if (result.length !== 0) {
                        setSearchResults(result);
                    } else {
                        Message.info('没有相关表情, 换个关键字试试吧');
                    }
                }
            } catch (err: any) {
                // 错误信息已经在 service.ts 中通过 Message.error 显示
                // 这里只需要确保 loading 状态被重置
                console.error('[Expression] 搜索表情包失败:', err);
            } finally {
                toggleSearchLoading(false);
            }
        }
    }

    const renderDefaultExpression = (
        <div className={Style.defaultExpression}>
            {expressions.default.map((e, index) => (
                <div
                    className={Style.defaultExpressionBlock}
                    key={e}
                    data-name={e}
                    onClick={(event) =>
                        onSelectText(event.currentTarget.dataset.name as string)
                    }
                    role="button"
                >
                    <div
                        className={Style.defaultExpressionItem}
                        style={{
                            backgroundPosition: `left ${-30 * index}px`,
                            backgroundImage: `url(${BaiduImage})`,
                        }}
                    />
                </div>
            ))}
        </div>
    );

    function handleClickExpression(e: any) {
        const $target = e.target;
        const url = addParam($target.src, {
            width: $target.naturalWidth,
            height: $target.naturalHeight,
        });
        onSelectImage(url);
    }

    /**
     * 拉取“我的表情包”
     * - 优先服务端
     * - 服务端失败时使用本地缓存兜底（stickers:{userId}）
     */
    async function refreshMyStickers() {
        if (!storageUserId) {
            setStickers([]);
            return;
        }

        // 先用本地缓存秒开（体验更好），随后再用服务端结果覆盖
        const local = loadLocalStickers(storageUserId);
        if (local.length > 0) {
            setStickers(local);
        }

        setStickersLoading(true);
        try {
            const result = await getUserStickers();
            const serverList: StickerItem[] = (result?.stickers || []).filter(
                validateStickerMeta,
            );
            setStickers(serverList);
            saveLocalStickers(storageUserId, serverList);
        } catch (e: any) {
            // 失败时不报错弹窗（避免打扰），但保留本地兜底数据
            // 如需排查可打开控制台
            // eslint-disable-next-line no-console
            console.warn('[Sticker] getUserStickers failed:', e?.message || e);
        } finally {
            setStickersLoading(false);
        }
    }

    useEffect(() => {
        refreshMyStickers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storageUserId]);

    /**
     * 添加表情包：
     * 1) 选择图片/GIF
     * 2) 上传文件拿到 url（复用 uploadFileWithProgress → /api/upload）
     * 3) 调用 addUserSticker 落库
     * 4) 本地列表更新 + localStorage 持久化（兜底）
     */
    async function handleAddSticker() {
        if (!storageUserId) {
            Message.warning('请先登录', 3);
            return;
        }

        // 选择文件：限制类型（这里先用 accept 做“体验限制”，安全由服务端再校验）
        const file = await readDiskFile('blob', 'image/png,image/jpeg,image/webp,image/gif');
        if (!file) {
            return;
        }

        const mime = (file.type || '').toLowerCase();
        const size = file.length || 0;
        const isGif = mime === 'image/gif';
        // 与服务端 stickers 配置保持一致（体验提示用，安全校验以服务端为准）
        const maxStatic = 18 * 1024 * 1024;
        const maxGif = 20 * 1024 * 1024;
        const maxSize = isGif ? maxGif : maxStatic;

        if (!mime.startsWith('image/')) {
            Message.error('只能上传图片或 GIF');
            return;
        }
        if (size > maxSize) {
            Message.warning(isGif ? 'GIF 不能超过 20MB' : '图片不能超过 18MB', 3);
            return;
        }

        // 读取图片尺寸（GIF/静态图都可用 <img> 获取宽高）
        const blobUrl = URL.createObjectURL(file.result as Blob);
        const img = new Image();

        const widthHeight = await new Promise<{ width: number; height: number }>((resolve) => {
            img.onload = () => resolve({ width: img.width || 0, height: img.height || 0 });
            img.onerror = () => resolve({ width: 0, height: 0 });
            img.src = blobUrl;
        });
        URL.revokeObjectURL(blobUrl);

        try {
            // ext：尽量从 mime 推断；兼容 jpeg/jpg
            let ext = (file.ext || '').toLowerCase();
            if (!ext) {
                ext = mime.split('/').pop() || 'png';
            }
            if (ext === 'jpeg') {
                ext = 'jpg';
            }

            const fileName = `Sticker/${storageUserId}_${Date.now()}.${ext}`;

            // 上传文件（有进度时可以后续增强 UI，这里先不展示百分比，避免改动过大）
            const url = await uploadFileWithProgress(file.result as Blob, fileName);

            const res = await addUserSticker({
                url,
                mime,
                width: widthHeight.width,
                height: widthHeight.height,
                size,
            });

            /**
             * 兼容服务端返回格式：
             * - 新版：{ sticker: StickerItem }
             * - 旧版/自定义分支：直接返回 StickerItem
             *
             * 用户反馈“服务端返回异常”通常就是这里取不到 sticker 导致的，
             * 做兼容可以减少前后端版本不一致带来的问题。
             */
            const created: StickerItem | undefined = (res?.sticker || res) as any;
            if (!created || !validateStickerMeta(created)) {
                Message.error('添加表情包失败（服务端返回异常）');
                return;
            }

            const next = [created, ...stickers].slice(0, 200);
            setStickers(next);
            saveLocalStickers(storageUserId, next);
            Message.success('添加成功');
        } catch (e: any) {
            // addUserSticker 的错误会由 fetch.ts toast；这里避免重复弹窗
            // eslint-disable-next-line no-console
            console.error('[Sticker] add failed:', e?.message || e);
        }
    }

    /**
     * 点击发送表情包：本质就是发送一条 image 消息
     * 这里沿用现有“图片消息”格式：url?width=..&height=..
     */
    function handleSendSticker(sticker: StickerItem) {
        const url = addParam(sticker.url, {
            width: sticker.width || 0,
            height: sticker.height || 0,
        });
        onSelectImage(url);
    }

    async function handleDeleteSticker(sticker: StickerItem) {
        if (!storageUserId) {
            return;
        }
        if (!sticker._id) {
            // 本地兜底数据没有 _id：只能本地删除
            const next = stickers.filter((s) => s.url !== sticker.url);
            setStickers(next);
            saveLocalStickers(storageUserId, next);
            return;
        }

        const ok = window.confirm('删除这个表情包？');
        if (!ok) {
            return;
        }

        try {
            await deleteUserSticker(sticker._id);
            const next = stickers.filter((s) => s._id !== sticker._id);
            setStickers(next);
            saveLocalStickers(storageUserId, next);
            Message.success('已删除');
        } catch (e: any) {
            // eslint-disable-next-line no-console
            console.error('[Sticker] delete failed:', e?.message || e);
        }
    }

    function startLongPressDelete(sticker: StickerItem) {
        // 600ms 视为“长按”
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
        }
        longPressTimerRef.current = window.setTimeout(() => {
            handleDeleteSticker(sticker);
        }, 600);
    }

    function cancelLongPressDelete() {
        if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }

    const renderSearchExpression = (
        <div className={Style.searchExpression}>
            <div className={Style.searchExpressionInputBlock}>
                <Input
                    className={Style.searchExpressionInput}
                    value={keywords}
                    onChange={setKeywords}
                    onEnter={handleSearchExpression}
                />
                <Button
                    className={Style.searchExpressionButton}
                    onClick={handleSearchExpression}
                >
                    搜索
                </Button>
            </div>
            <div
                className={`${Style.loading} ${
                    searchLoading ? 'show' : 'hide'
                }`}
            >
                <Loading
                    type="spinningBubbles"
                    color="#4A90E2"
                    height={100}
                    width={100}
                />
            </div>
            <div className={Style.searchResult}>
                {searchResults.map(({ image }) => (
                    <div className={Style.searchImage}>
                        <img
                            src={image}
                            alt="表情"
                            key={image}
                            onClick={handleClickExpression}
                        />
                    </div>
                ))}
            </div>
        </div>
    );

    const renderMyStickers = (
        <div className={Style.myStickers}>
            <div className={Style.stickerGrid}>
                <div
                    className={Style.stickerAdd}
                    role="button"
                    onClick={handleAddSticker}
                    title="添加表情包"
                >
                    <span className={Style.stickerAddPlus}>+</span>
                </div>
                {stickers.map((s) => (
                    <div
                        className={Style.stickerItem}
                        key={s._id || s.url}
                        role="button"
                        onClick={() => handleSendSticker(s)}
                        onMouseDown={() => startLongPressDelete(s)}
                        onMouseUp={cancelLongPressDelete}
                        onMouseLeave={cancelLongPressDelete}
                        onTouchStart={() => startLongPressDelete(s)}
                        onTouchEnd={cancelLongPressDelete}
                        // 右键也提供删除入口（更贴合桌面端）
                        onContextMenu={(e) => {
                            e.preventDefault();
                            handleDeleteSticker(s);
                        }}
                        title="点击发送；长按删除"
                    >
                        <img className={Style.stickerImg} src={s.url} alt="表情包" />
                    </div>
                ))}
            </div>
            {stickersLoading && (
                <div className={Style.stickersLoading}>
                    <Loading
                        type="spinningBubbles"
                        color="#4A90E2"
                        height={40}
                        width={40}
                    />
                </div>
            )}
        </div>
    );

    return (
        <div className={Style.expression}>
            <Tabs
                defaultActiveKey="default"
                renderTabBar={() => <ScrollableInkTabBar />}
                renderTabContent={() => <TabContent />}
            >
                <TabPane tab="默认表情" key="default">
                    {renderDefaultExpression}
                </TabPane>
                <TabPane tab="搜索表情包" key="search">
                    {renderSearchExpression}
                </TabPane>
                <TabPane tab="我的表情包" key="my">
                    {renderMyStickers}
                </TabPane>
            </Tabs>
        </div>
    );
}

export default Expression;
