export interface JobStatusStorage {
    markStarted(jobId: string): Promise<void>;
    markSucceeded(jobId: string, payload?: Record<string, any>): Promise<void>;
    markFailed(jobId: string, errorMessage: string): Promise<void>;
}