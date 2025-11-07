import { Page } from 'playwright';

export async function autoScroll(page: Page) {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            const step = 400;
            const timer = setInterval(() => {
                const el = document.scrollingElement || document.documentElement;
                const { scrollTop, scrollHeight, clientHeight } = el;
                window.scrollBy(0, step);
                if (scrollTop + clientHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 60);
        });
    });
}

export async function waitForImagesAndFonts(page: Page) {
    await page.evaluate(async () => {
        const imgs = Array.from(document.images);
        await Promise.all(imgs.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>(res => {
                img.onload = () => res();
                img.onerror = () => res();
            });
        }));

        // @ts-ignore
        if (document.fonts && document.fonts.ready) {
            // @ts-ignore
            await document.fonts.ready;
        }
    });
}

export async function quiesce(page: Page, settleMs: number) {
    if (settleMs > 0) await page.waitForTimeout(settleMs);
}

export async function disableAnimations(page: Page) {
    await page.addStyleTag({
        content: `
      * { transition: none !important; animation: none !important; }
      html { scroll-behavior: auto !important; }
    `
    });
}