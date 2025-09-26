/**
 * Background Job Processing System for ARUS
 * Handles computationally intensive operations asynchronously
 * Supports horizontal scaling and prevents blocking the main thread
 */

import EventEmitter from 'events';

export interface JobData {
  id: string;
  type: string;
  payload: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  delay?: number;
  retryBackoff?: number;
}

export interface JobResult {
  id: string;
  status: 'completed' | 'failed' | 'retrying';
  result?: any;
  error?: string;
  completedAt: Date;
  processingTime: number;
}

export interface JobProcessor {
  (data: any): Promise<any>;
}

export class BackgroundJobQueue extends EventEmitter {
  private jobs: Map<string, JobData> = new Map();
  private processors: Map<string, JobProcessor> = new Map();
  private processing: Set<string> = new Set();
  private completedJobs: Map<string, JobResult> = new Map();
  private isRunning = false;
  private processingInterval?: NodeJS.Timeout;
  private maxConcurrentJobs = 3;
  private jobHistory: JobResult[] = [];
  private maxHistorySize = 1000;

  constructor(options: { maxConcurrentJobs?: number; maxHistorySize?: number } = {}) {
    super();
    this.maxConcurrentJobs = options.maxConcurrentJobs || 3;
    this.maxHistorySize = options.maxHistorySize || 1000;
  }

  /**
   * Register a job processor for a specific job type
   */
  registerProcessor(type: string, processor: JobProcessor): void {
    this.processors.set(type, processor);
  }

  /**
   * Add a job to the queue
   */
  async addJob(
    type: string,
    payload: any,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'critical';
      delay?: number;
      maxAttempts?: number;
      retryBackoff?: number;
    } = {}
  ): Promise<string> {
    const id = `job-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    const job: JobData = {
      id,
      type,
      payload,
      priority: options.priority || 'medium',
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      delay: options.delay || 0,
      retryBackoff: options.retryBackoff || 1000
    };

    this.jobs.set(id, job);
    this.emit('job:added', job);
    
    // If delayed, schedule for later
    if (job.delay && job.delay > 0) {
      setTimeout(() => this.processNextJob(), job.delay);
    } else {
      // Process immediately if not at capacity
      this.processNextJob();
    }

    return id;
  }

  /**
   * Start the job queue processor
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.processingInterval = setInterval(() => {
      this.processNextJob();
    }, 1000);
    
    this.emit('queue:started');
  }

  /**
   * Stop the job queue processor
   */
  stop(): void {
    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.emit('queue:stopped');
  }

  /**
   * Get job status
   */
  getJobStatus(id: string): JobResult | JobData | null {
    const completed = this.completedJobs.get(id);
    if (completed) return completed;
    
    const pending = this.jobs.get(id);
    if (pending) {
      return {
        id: pending.id,
        status: this.processing.has(id) ? 'processing' : 'pending',
        attempts: pending.attempts,
        maxAttempts: pending.maxAttempts,
        createdAt: pending.createdAt
      } as any;
    }
    
    // Check recent history
    return this.jobHistory.find(j => j.id === id) || null;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    totalProcessed: number;
  } {
    const completed = Array.from(this.completedJobs.values()).filter(j => j.status === 'completed').length;
    const failed = Array.from(this.completedJobs.values()).filter(j => j.status === 'failed').length;
    
    return {
      pending: this.jobs.size,
      processing: this.processing.size,
      completed,
      failed,
      totalProcessed: this.jobHistory.length
    };
  }

  /**
   * Process the next job in queue
   */
  private async processNextJob(): Promise<void> {
    if (!this.isRunning || this.processing.size >= this.maxConcurrentJobs) {
      return;
    }

    // Find highest priority job that's ready to process
    const sortedJobs = Array.from(this.jobs.values())
      .filter(job => !this.processing.has(job.id))
      .sort((a, b) => {
        // Priority order: critical > high > medium > low
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Secondary sort by creation time (oldest first)
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    const job = sortedJobs[0];
    if (!job) return;

    const processor = this.processors.get(job.type);
    if (!processor) {
      this.failJob(job, `No processor registered for job type: ${job.type}`);
      return;
    }

    this.processing.add(job.id);
    job.attempts++;
    
    const startTime = Date.now();
    this.emit('job:started', job);

    try {
      const result = await processor(job.payload);
      const processingTime = Date.now() - startTime;
      
      this.completeJob(job, result, processingTime);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.handleJobError(job, error as Error, processingTime);
    }
  }

  /**
   * Complete a job successfully
   */
  private completeJob(job: JobData, result: any, processingTime: number): void {
    this.jobs.delete(job.id);
    this.processing.delete(job.id);
    
    const jobResult: JobResult = {
      id: job.id,
      status: 'completed',
      result,
      completedAt: new Date(),
      processingTime
    };
    
    this.completedJobs.set(job.id, jobResult);
    this.addToHistory(jobResult);
    this.emit('job:completed', jobResult);
  }

  /**
   * Handle job error with retry logic
   */
  private handleJobError(job: JobData, error: Error, processingTime: number): void {
    this.processing.delete(job.id);
    
    if (job.attempts < job.maxAttempts) {
      // Retry with exponential backoff
      const delay = job.retryBackoff! * Math.pow(2, job.attempts - 1);
      
      setTimeout(() => {
        if (this.jobs.has(job.id)) {
          this.processNextJob();
        }
      }, delay);
      
      this.emit('job:retrying', { job, error: error.message, nextAttempt: Date.now() + delay });
    } else {
      this.failJob(job, error.message, processingTime);
    }
  }

  /**
   * Fail a job permanently
   */
  private failJob(job: JobData, errorMessage: string, processingTime: number = 0): void {
    this.jobs.delete(job.id);
    this.processing.delete(job.id);
    
    const jobResult: JobResult = {
      id: job.id,
      status: 'failed',
      error: errorMessage,
      completedAt: new Date(),
      processingTime
    };
    
    this.completedJobs.set(job.id, jobResult);
    this.addToHistory(jobResult);
    this.emit('job:failed', jobResult);
  }

  /**
   * Add job result to history with size management
   */
  private addToHistory(result: JobResult): void {
    this.jobHistory.unshift(result);
    if (this.jobHistory.length > this.maxHistorySize) {
      this.jobHistory = this.jobHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * Clear completed jobs to prevent memory leaks
   */
  clearCompleted(): void {
    this.completedJobs.clear();
  }

  /**
   * Get recent job history
   */
  getRecentJobs(limit: number = 50): JobResult[] {
    return this.jobHistory.slice(0, limit);
  }
}

// Global job queue instance
export const jobQueue = new BackgroundJobQueue({
  maxConcurrentJobs: 3,
  maxHistorySize: 1000
});

// Job type constants
export const JOB_TYPES = {
  AI_EQUIPMENT_ANALYSIS: 'ai:equipment:analysis',
  AI_FLEET_ANALYSIS: 'ai:fleet:analysis',
  REPORT_GENERATION_PDF: 'report:pdf:generate',
  REPORT_GENERATION_CSV: 'report:csv:generate',
  REPORT_GENERATION_HTML: 'report:html:generate',
  CREW_SCHEDULING: 'crew:scheduling',
  TELEMETRY_PROCESSING: 'telemetry:processing',
  MAINTENANCE_SCHEDULING: 'maintenance:scheduling'
} as const;

export type JobType = typeof JOB_TYPES[keyof typeof JOB_TYPES];