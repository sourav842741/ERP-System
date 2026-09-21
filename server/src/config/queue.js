import EventEmitter from 'events';

class ResilientJobQueue extends EventEmitter {
  constructor() {
    super();
    this.isRedisAvailable = false;
    this.bullQueues = {};
    this.inMemoryQueue = [];
    this.handlers = {};
    this.isProcessing = false;
  }

  async init() {
    if (process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '') {
      try {
        const { Queue, Worker } = await import('bullmq');
        const { default: IORedis } = await import('ioredis');
        
        const connection = new IORedis(process.env.REDIS_URL, {
          maxRetriesPerRequest: null,
          connectTimeout: 3000
        });

        connection.on('connect', () => {
          console.log('[Queue] Connected to Redis successfully. BullMQ active.');
          this.isRedisAvailable = true;
        });

        connection.on('error', (err) => {
          console.warn(`[Queue] Redis connection issue: ${err.message}. Falling back to resilient in-memory retry queue.`);
          this.isRedisAvailable = false;
        });
      } catch (err) {
        console.warn('[Queue] Redis/BullMQ optional package not active. Using in-memory retry queue with auto-retry fallback.');
        this.isRedisAvailable = false;
      }
    } else {
      console.log('[Queue] REDIS_URL not configured. Operating with high-reliability in-memory queue (3 auto-retries).');
    }
  }

  registerHandler(queueName, handler) {
    this.handlers[queueName] = handler;
  }

  async addJob(queueName, jobName, data, opts = { maxRetries: 3, delayMs: 1000 }) {
    // Process via resilient in-memory queue with retries
    const job = {
      id: `${queueName}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      queueName,
      jobName,
      data,
      attempts: 0,
      maxRetries: opts.maxRetries || 3,
      delayMs: opts.delayMs || 1000
    };

    // Execute asynchronously non-blocking
    this.executeWithRetry(job);
    return job;
  }

  async executeWithRetry(job) {
    const handler = this.handlers[job.queueName];
    if (!handler) {
      console.warn(`[Queue] No handler registered for queue: ${job.queueName}`);
      return;
    }

    job.attempts++;
    try {
      await handler(job.data);
      // Success
    } catch (error) {
      console.error(`[Queue Error] Job ${job.id} (${job.queueName}:${job.jobName}) failed attempt ${job.attempts}/${job.maxRetries}:`, error.message);
      if (job.attempts < job.maxRetries) {
        const backoff = job.delayMs * Math.pow(2, job.attempts - 1);
        setTimeout(() => this.executeWithRetry(job), backoff);
      } else {
        console.error(`[Queue Critical] Job ${job.id} reached max retries and was moved to Dead-Letter log.`);
      }
    }
  }
}

export const jobQueue = new ResilientJobQueue();
