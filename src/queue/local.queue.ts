export type WorkerFn<J, R> = (job: J) => Promise<R>;

export class LocalQueue<J, R> {
    private pending: Array<{ job: J; resolve: (r: R) => void; reject: (e: any) => void }> = [];
    private active = 0;

    constructor(private concurrency: number, private worker: WorkerFn<J, R>) {}

    enqueue(job: J): Promise<R> {
        return new Promise<R>((resolve, reject) => {
            this.pending.push({ job, resolve, reject });
            this.pump();
        });
    }

    private pump() {
        while (this.active < this.concurrency && this.pending.length > 0) {
            const item = this.pending.shift()!;
            this.active++;
            this.worker(item.job)
                .then((res) => item.resolve(res))
                .catch((err) => item.reject(err))
                .finally(() => {
                    this.active--;
                    this.pump();
                });
        }
    }

    get stats() {
        return { active: this.active, queued: this.pending.length, concurrency: this.concurrency };
    }

    setConcurrency(n: number) {
        const v = Math.max(1, n | 0);
        this.concurrency = v;
        this.pump();
    }
}