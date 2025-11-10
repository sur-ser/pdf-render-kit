import { PdfRenderService, type Source } from '../src';

(async () => {
    const service = new PdfRenderService({
        concurrency: 2,
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

    // the first task arrived
    // service.enqueueLocal({
    //     sources: [{ url: 'https://freetownow-device-router.sursersur.workers.dev/' }],
    //     outputPath: './out/1.pdf',
    //     retry: { maxAttempts: 3, backoffMs: 1500 }
    // });
    //
    // // the next one arrived — just add it
    // service.enqueueLocal({
    //     sources: [{ url: 'https://exanak.am' }],
    //     outputPath: './out/2.pdf'
    // });

    service.enqueueLocal({
        sources: [{ url: 'https://example.com' }],
        outputPath: './out/3.pdf'
    });

    console.log(service.queueStats());
    setInterval(() => {
        console.log(service.queueStats());
    }, 3000)
})();