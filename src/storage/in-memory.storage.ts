import { JobStatusStorage } from './storage.interface';

export class InMemoryStorage implements JobStatusStorage {
    private map = new Map<string, { status: 'started'|'ok'|'fail'; payload?: any; error?: string }>();

    async markStarted(jobId: string): Promise<void> {
        this.map.set(jobId, { status: 'started' });
    }
    async markSucceeded(jobId: string, payload?: Record<string, any>): Promise<void> {
        this.map.set(jobId, { status: 'ok', payload });
    }
    async markFailed(jobId: string, errorMessage: string): Promise<void> {
        this.map.set(jobId, { status: 'fail', error: errorMessage });
    }
}