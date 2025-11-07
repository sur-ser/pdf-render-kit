export type Source =
    | { url: string; html?: never; baseUrl?: string }
    | { html: string; url?: never; baseUrl?: string };

export type PdfSingleOptions = {
    /** Where to save the PDF; if not specified — will return a Buffer */
    outputPath?: string;
    /** Page parameters */
    format?: 'A4' | 'Letter' | 'Legal';
    width?: string;     // for example "800px" or "210mm"
    height?: string;    // for example "1200px" or "297mm"
    margin?: { top?: string; right?: string; bottom?: string; left?: string };
    printBackground?: boolean;
    scale?: number; // 0.1..2

    emulateMedia?: 'screen' | 'print';
    viewport?: { width: number; height: number; deviceScaleFactor?: number };

    /** Wait until: 'networkidle' is usually the best choice */
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
    /** Selectors to wait for on the page */
    waitForSelectors?: string[];
    /** Total timeout for rendering one source */
    timeoutMs?: number;

    /** Additional "quiet" pause to finish slow resources */
    settleMs?: number;

    /** Cookies, if authentication is needed */
    cookies?: Array<{
        name: string;
        value: string;
        domain?: string;
        path?: string;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: 'Lax' | 'Strict' | 'None';
        expires?: number;
    }>;
};

export type PdfJob = {
    id?: string;
    /** One or multiple sources; if >1 — will merge into one PDF */
    sources: Source[];
    options?: PdfSingleOptions;
    /** Retries inside the worker (without re-publishing the message) */
    retry?: { maxAttempts: number; backoffMs: number };
    /** Required for queue job: where to save the result */
    outputPath?: string;
    /** Arbitrary meta-object where you can put whatever you need */
    meta?: Record<string, any>;
};

export type OptimizerMethod = 'ghostscript' | 'qpdf' | 'mutool' | 'custom';

export type OptimizerConfig = {
    enabled: boolean;
    method?: OptimizerMethod;
    /** Command with placeholders {in} and {out} for custom */
    commandTemplate?: string;
    /** Preset for Ghostscript: /screen /ebook /printer /prepress */
    gsPreset?: '/screen' | '/ebook' | '/printer' | '/prepress';
};

export type LibraryConfig = {
    /** Navigation timeouts of the browser */
    navigationTimeoutMs?: number;
    /** Maximum allowed concurrency of pages */
    concurrency?: number;
    /** Default waiting behavior for resources */
    defaultPdfOptions?: PdfSingleOptions;
    /** Post-optimization of PDF */
    optimizer?: OptimizerConfig;
};