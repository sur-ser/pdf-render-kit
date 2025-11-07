import { mergeConfig } from './config';
import type { LibraryConfig, PdfJob, Source } from './types';
import { BrowserManager } from './renderer/browser.manager';
import { PlaywrightRenderer } from './renderer/playwright.renderer';
import { mergePdf } from './utils/merge-pdf';
import { optimizePdfIfEnabled } from './optimizer/optimizer';
import { promises as fs } from 'fs';
import { ensureDir } from './utils/ensure-dir';
import { InMemoryStorage } from './storage/in-memory.storage';
import type { JobStatusStorage } from './storage/storage.interface';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { LocalQueue } from './queue/local.queue';

export class PdfRenderService {
    private cfg!: Required<LibraryConfig>;
    private bm!: BrowserManager;
    private renderer!: PlaywrightRenderer;
    private storage!: JobStatusStorage;
    private q!: LocalQueue<PdfJob, { id: string; outputPath: string }>;

    constructor(config: LibraryConfig, storage?: JobStatusStorage) {
        this.cfg = mergeConfig(config);
        this.bm = new BrowserManager();
        this.renderer = new PlaywrightRenderer(
            this.bm,
            this.cfg.defaultPdfOptions,
            this.cfg.navigationTimeoutMs
        );
        this.storage = storage ?? new InMemoryStorage();

        // Local queue with concurrency limit from config.concurrency
        this.q = new LocalQueue<PdfJob, { id: string; outputPath: string }>(
            this.cfg.concurrency,
            (job) => this.executeJob(job)
        );
    }

    async render(sources: Source[], options?: LibraryConfig['defaultPdfOptions']): Promise<Buffer> {
        const buffers: Buffer[] = [];
        for (const s of sources) {
            const buf = await this.renderer.renderOne(s, { ...(options ?? {}), outputPath: undefined });
            buffers.push(buf);
        }
        const base = buffers.length === 1 ? buffers[0] : await mergePdf(buffers);
        const optimized = await optimizePdfIfEnabled(base, this.cfg.optimizer);
        if (options?.outputPath) {
            await ensureDir(options.outputPath);
            await fs.writeFile(options.outputPath, optimized);
        }
        return optimized;
    }

    // Add job to local queue (FIFO) — without RabbitMQ
    enqueueLocal(job: Omit<PdfJob, 'id'> & { id?: string }): Promise<{ id: string; outputPath: string }> {
        return this.q.enqueue(job as PdfJob);
    }

    queueStats() {
        return this.q.stats;
    }

    setConcurrency(n: number) {
        this.q.setConcurrency(n);
    }

    // Job executor (used both by direct call and local queue)
    async executeJob(job: PdfJob): Promise<{ id: string; outputPath: string }> {
        const attempts = job.retry?.maxAttempts ?? 3;
        const backoff = job.retry?.backoffMs ?? 1500;
        const id = job.id || randomUUID();
        await this.storage.markStarted(id);

        let lastError: unknown;

        for (let i = 1; i <= attempts; i++) {
            try {
                const buffers: Buffer[] = [];
                for (const s of job.sources) {
                    const buf = await this.renderer.renderOne(s, { ...(job.options ?? {}), outputPath: undefined });
                    buffers.push(buf);
                }

                const base = buffers.length === 1 ? buffers[0] : await mergePdf(buffers);
                const optimized = await optimizePdfIfEnabled(base, this.cfg.optimizer);

                const outPath =
                    job.outputPath ??
                    job.options?.outputPath ??
                    path.resolve(process.cwd(), `out/${id}.pdf`);

                await ensureDir(outPath);
                await fs.writeFile(outPath, optimized);
                await this.storage.markSucceeded(id, { outputPath: outPath });
                return { id, outputPath: outPath };
            } catch (err) {
                lastError = err;
                if (i < attempts) {
                    await new Promise((res) => setTimeout(res, backoff * i));
                }
            }
        }

        await this.storage.markFailed(id, String((lastError as any)?.message ?? lastError));
        throw lastError instanceof Error ? lastError : new Error(String(lastError));
    }
}