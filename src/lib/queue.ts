import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let connection: IORedis | null = null;

function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

// Queue Names
export const QUEUE_NAMES = {
  OCR: 'ocr-processing',
  VIRUS_SCAN: 'virus-scan',
  THUMBNAIL: 'thumbnail-generation',
  INDEX: 'search-indexing',
  EMAIL: 'email-notification',
  WEBHOOK: 'webhook-dispatch',
  CLEANUP: 'file-cleanup',
} as const;

// Queue instances
const queues: Map<string, Queue> = new Map();

export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    queues.set(
      name,
      new Queue(name, {
        connection: getRedisConnection(),
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            count: 100,
            age: 24 * 3600, // 24 hours
          },
          removeOnFail: {
            count: 500,
          },
        },
      })
    );
  }
  return queues.get(name)!;
}

// Job Interfaces
export interface OcrJobData {
  documentId: string;
  filePath: string;
  mimeType: string;
  language?: string;
}

export interface VirusScanJobData {
  documentId: string;
  filePath: string;
}

export interface ThumbnailJobData {
  documentId: string;
  filePath: string;
  mimeType: string;
}

export interface IndexJobData {
  documentId: string;
  action: 'add' | 'update' | 'remove';
}

export interface EmailJobData {
  to: string | string[];
  subject: string;
  template: string;
  data: Record<string, unknown>;
}

export interface WebhookJobData {
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
}

// Add jobs to queues
export async function addOcrJob(data: OcrJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.OCR);
  return queue.add('ocr', data, {
    priority: 2,
  });
}

export async function addVirusScanJob(data: VirusScanJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.VIRUS_SCAN);
  return queue.add('scan', data, {
    priority: 1, // High priority
  });
}

export async function addThumbnailJob(data: ThumbnailJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.THUMBNAIL);
  return queue.add('thumbnail', data, {
    priority: 3,
  });
}

export async function addIndexJob(data: IndexJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.INDEX);
  return queue.add('index', data, {
    priority: 2,
  });
}

export async function addEmailJob(data: EmailJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.EMAIL);
  return queue.add('email', data, {
    priority: 2,
  });
}

export async function addWebhookJob(data: WebhookJobData): Promise<Job> {
  const queue = getQueue(QUEUE_NAMES.WEBHOOK);
  return queue.add('webhook', data, {
    priority: 3,
  });
}

// Worker creation utilities
export function createWorker<T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<unknown>,
  concurrency: number = 5
): Worker {
  return new Worker(queueName, processor, {
    connection: getRedisConnection(),
    concurrency,
  });
}

// Queue statistics
export async function getQueueStats(queueName: string): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const queue = getQueue(queueName);

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

export async function getAllQueuesStats(): Promise<
  Record<
    string,
    {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }
  >
> {
  const stats: Record<
    string,
    {
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }
  > = {};

  for (const queueName of Object.values(QUEUE_NAMES)) {
    stats[queueName] = await getQueueStats(queueName);
  }

  return stats;
}

// Clean up old jobs
export async function cleanOldJobs(queueName: string, age: number = 24 * 3600 * 1000): Promise<void> {
  const queue = getQueue(queueName);
  await queue.clean(age, 1000, 'completed');
  await queue.clean(age, 1000, 'failed');
}

// Pause/Resume queues
export async function pauseQueue(queueName: string): Promise<void> {
  const queue = getQueue(queueName);
  await queue.pause();
}

export async function resumeQueue(queueName: string): Promise<void> {
  const queue = getQueue(queueName);
  await queue.resume();
}

// Close connections
export async function closeQueues(): Promise<void> {
  for (const queue of queues.values()) {
    await queue.close();
  }
  queues.clear();

  if (connection) {
    await connection.quit();
    connection = null;
  }
}
