import { PdfRenderService, type Source } from '../src';

(async () => {
    const service = new PdfRenderService({
        defaultPdfOptions: {
            format: 'A4',
            printBackground: false,
            emulateMedia: 'screen',
            waitUntil: 'networkidle',
            settleMs: 800,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
            outputPath: './out/basic.pdf'
        },
        optimizer: { enabled: true, method: 'ghostscript', gsPreset: '/ebook' }
    });

    const sources: Source[] = [
        { url: 'https://freetownow-device-router.sursersur.workers.dev/' },
        { url: 'https://exanak.am' },
    ];

    // // Option 1: simple render
    // await service.render(sources, { outputPath: './out/merged.pdf' });

    // Option 2: "job" without any built-in queue
    const result = await service.executeJob({
        sources,
        options: { format: 'A4', printBackground: true },
        outputPath: './out/job.pdf',
        retry: { maxAttempts: 3, backoffMs: 1500 }
    });

    console.log('OK:', result);
})();