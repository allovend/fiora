/**
 * 修复 aria-hidden 无障碍性问题
 * 当元素被设置为 aria-hidden="true" 时，使用 inert 属性来防止其内部元素获得焦点
 * 这样可以避免"Blocked aria-hidden on an element because its descendant retained focus"警告
 */

/**
 * 为元素设置 inert 属性（如果浏览器支持）
 * inert 属性会阻止元素及其子元素获得焦点
 */
function setInertAttribute(element: HTMLElement, inert: boolean) {
    if (inert) {
        // 使用 inert 属性（现代浏览器支持）
        if ('inert' in element) {
            (element as any).inert = true;
        } else {
            // 降级方案：移除所有可聚焦元素的 tabindex
            const focusableElements = (element as Element).querySelectorAll<HTMLElement>(
                'input, textarea, select, button, a, [tabindex], [role="button"], [role="link"]',
            );
            focusableElements.forEach((htmlEl: HTMLElement) => {
                if (htmlEl.hasAttribute('tabindex')) {
                    htmlEl.setAttribute('data-original-tabindex', htmlEl.getAttribute('tabindex') || '');
                    htmlEl.setAttribute('tabindex', '-1');
                } else if (htmlEl.tagName === 'INPUT' || htmlEl.tagName === 'TEXTAREA' || htmlEl.tagName === 'SELECT') {
                    htmlEl.setAttribute('tabindex', '-1');
                }
            });
        }
    } else {
        // 恢复 inert 属性
        if ('inert' in element) {
            (element as any).inert = false;
        } else {
            // 恢复 tabindex
            const focusableElements = (element as Element).querySelectorAll<HTMLElement>('[data-original-tabindex]');
            focusableElements.forEach((htmlEl: HTMLElement) => {
                const originalTabindex = htmlEl.getAttribute('data-original-tabindex');
                if (originalTabindex !== null) {
                    htmlEl.setAttribute('tabindex', originalTabindex);
                    htmlEl.removeAttribute('data-original-tabindex');
                } else {
                    htmlEl.removeAttribute('tabindex');
                }
            });
        }
    }
}

/**
 * 观察 aria-hidden 属性的变化并自动应用 inert
 */
export function observeAriaHidden() {
    if (!document.body) {
        // 如果 body 还未加载，等待一下
        setTimeout(observeAriaHidden, 100);
        return;
    }

    // 使用 MutationObserver 监听 aria-hidden 属性的变化
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'aria-hidden') {
                const target = mutation.target as HTMLElement;
                const isHidden = target.getAttribute('aria-hidden') === 'true';
                setInertAttribute(target, isHidden);
            } else if (mutation.type === 'childList') {
                // 检查新添加的节点
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const element = node as HTMLElement;
                        if (element.getAttribute('aria-hidden') === 'true') {
                            setInertAttribute(element, true);
                        }
                        // 观察新节点的属性变化
                        observer.observe(element, {
                            attributes: true,
                            attributeFilter: ['aria-hidden'],
                            subtree: true,
                        });
                    }
                });
            }
        });
    });

    // 初始观察所有带有 aria-hidden 的元素
    const initialElements = document.querySelectorAll('[aria-hidden="true"]');
    initialElements.forEach((element) => {
        setInertAttribute(element as HTMLElement, true);
        observer.observe(element, {
            attributes: true,
            attributeFilter: ['aria-hidden'],
            subtree: true,
        });
    });

    // 观察整个文档的变化
    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['aria-hidden'],
        subtree: true,
        childList: true,
    });

    // 定期检查（作为备用方案）
    setInterval(() => {
        const hiddenElements = document.querySelectorAll('[aria-hidden="true"]');
        hiddenElements.forEach((element) => {
            setInertAttribute(element as HTMLElement, true);
        });
    }, 1000);

    return observer;
}

