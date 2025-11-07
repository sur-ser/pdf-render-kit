import { Browser, chromium } from 'playwright';

export class BrowserManager {
    private browser?: Browser;
    private refCount = 0;

    async acquire(): Promise<Browser> {
        if (!this.browser) {
            this.browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
        }
        this.refCount++;
        return this.browser;
    }

    async release() {
        this.refCount = Math.max(0, this.refCount - 1);
        if (this.refCount === 0 && this.browser) {
            await this.browser.close();
            this.browser = undefined;
        }
    }
}