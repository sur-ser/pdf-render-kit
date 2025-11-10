import { BrowserManager } from './browser.manager';
import type { Source, PdfSingleOptions } from '../types';
import { autoScroll, disableAnimations, quiesce, waitForImagesAndFonts } from './wait-strategy';

export class PlaywrightRenderer {
    constructor(
        private readonly bm: BrowserManager,
        private readonly defaultOpts: PdfSingleOptions,
        private readonly navigationTimeoutMs: number
    ) {}

    async renderOne(source: Source, options?: PdfSingleOptions): Promise<Buffer> {
        const opts = { ...this.defaultOpts, ...(options ?? {}) };
        const browser = await this.bm.acquire();

        // Prepare context parameters to ensure deviceScaleFactor works correctly
        const contextOptions: Parameters<(typeof browser)['newContext']>[0] = {};
        if (opts.viewport?.width && opts.viewport?.height) {
            contextOptions.viewport = { width: opts.viewport.width, height: opts.viewport.height };
        }
        if (opts.viewport?.deviceScaleFactor) {
            // important: set on the context, not via setViewportSize
            (contextOptions as any).deviceScaleFactor = opts.viewport.deviceScaleFactor;
        }

        let context = await browser.newContext(contextOptions);
        try {
            const page = await context.newPage();

            page.setDefaultNavigationTimeout(this.navigationTimeoutMs);
            page.setDefaultTimeout(opts.timeoutMs ?? this.navigationTimeoutMs);

            // If viewport is set but without deviceScaleFactor — you can just change page size
            if (opts.viewport?.width && opts.viewport?.height) {
                await page.setViewportSize({
                    width: opts.viewport.width,
                    height: opts.viewport.height
                });
            }

            if (opts.cookies?.length) {
                await context.addCookies(opts.cookies);
            }

            await disableAnimations(page);

            if ('url' in source && source.url) {
                await page.goto(source.url, { waitUntil: opts.waitUntil ?? 'networkidle' });
            } else if ('html' in source && source.html) {
                // support for baseUrl via <base>
                let html = source.html;
                if (source.baseUrl) {
                    if (/<head[\s>]/i.test(html)) {
                        html = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}<base href="${source.baseUrl}">`);
                    } else {
                        html = `<!doctype html><head><base href="${source.baseUrl}"></head>${html}`;
                    }
                }
                await page.setContent(html, { waitUntil: opts.waitUntil ?? 'networkidle' });
            }

            // lazy loading
            await autoScroll(page);

            // wait for selectors
            if (opts.waitForSelectors?.length) {
                for (const sel of opts.waitForSelectors) {
                    await page.waitForSelector(sel, { state: 'visible' });
                }
            }

            // wait for images and fonts
            await waitForImagesAndFonts(page);

            // "quiet" pause
            await quiesce(page, opts.settleMs ?? 0);

            if (opts.emulateMedia) {
                await page.emulateMedia({ media: opts.emulateMedia });
            }

            const enableHF = !!opts.displayHeaderFooter
            const headerTpl = enableHF ? ((opts.headerTemplate ?? '').trim() || '<div></div>') : undefined;
            const footerTpl = enableHF ? ((opts.footerTemplate ?? '').trim() || '<div></div>') : undefined;

            // buffer only, no writing to disk
            const pdfBuffer = await page.pdf({
                printBackground: !!opts.printBackground,
                scale: opts.scale ?? 1,
                format: opts.format,
                width: opts.width,
                height: opts.height,
                margin: opts.margin,
                preferCSSPageSize: true,
                displayHeaderFooter: !!opts.displayHeaderFooter,
                headerTemplate: headerTpl,
                footerTemplate: footerTpl,
            });

            return pdfBuffer;
        } finally {
            // always close context, even in case of error
            try { await context.close(); } catch {}
            await this.bm.release();
        }
    }
}