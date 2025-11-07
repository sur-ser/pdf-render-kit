import { LibraryConfig } from './types';

export const defaultConfig: Required<LibraryConfig> = {
    navigationTimeoutMs: 45_000,
    concurrency: 2,
    defaultPdfOptions: {
        waitUntil: 'networkidle',
        printBackground: false,
        emulateMedia: 'screen',
        scale: 1,
        timeoutMs: 60_000,
        settleMs: 800,
        margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
    },
    optimizer: {
        enabled: false,
        method: 'ghostscript',
        gsPreset: '/ebook',
        commandTemplate: ''
    }
};

export function mergeConfig(user: LibraryConfig): Required<LibraryConfig> {
    return {
        ...defaultConfig,
        ...user,
        defaultPdfOptions: { ...defaultConfig.defaultPdfOptions, ...(user.defaultPdfOptions ?? {}) },
        optimizer: { ...defaultConfig.optimizer, ...(user.optimizer ?? {}) }
    };
}