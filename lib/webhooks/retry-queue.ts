import { supabaseService } from '@/lib/supabase-client';
import { retryWebhookProcessing } from '@/lib/retry-handler';

export interface WebhookRetryJob {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  priority: 'high' | 'medium' | 'low';
  scheduled_at: string;
  attempt_count: number;
  max_attempts: number;
  created_at: string;
}

export class WebhookRetryQueue {
  private isProcessing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly pollInterval: number = 5000, // 5 seconds
    private readonly batchSize: number = 10
  ) {}

  // Start processing the retry queue
  start() {
    if (this.processingInterval) {
      console.log('Retry queue already running');
      return;
    }

    console.log('Starting webhook retry queue processor');
    this.processingInterval = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processBatch();
      }
    }, this.pollInterval);
  }

  // Stop processing the retry queue
  stop() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('Stopped webhook retry queue processor');
    }
  }

  // Add a webhook to the retry queue
  static async add(
    webhookId: string,
    eventType: string,
    payload: any,
    options: {
      priority?: 'high' | 'medium' | 'low';
      maxAttempts?: number;
      delay?: number;
    } = {}
  ): Promise<void> {
    const {
      priority = 'medium',
      maxAttempts = 5,
      delay = 0,
    } = options;

    const scheduledAt = new Date(Date.now() + delay).toISOString();

    try {
      await supabaseService
        .from('webhook_retry_queue')
        .insert({
          webhook_id: webhookId,
          event_type: eventType,
          payload,
          priority,
          scheduled_at: scheduledAt,
          attempt_count: 0,
          max_attempts: maxAttempts,
          created_at: new Date().toISOString(),
        });

      console.log(`Added webhook ${webhookId} to retry queue (priority: ${priority})`);
    } catch (error) {
      console.error('Failed to add webhook to retry queue:', error);
      throw error;
    }
  }

  // Process a batch of webhooks from the retry queue
  private async processBatch(): Promise<void> {
    this.isProcessing = true;

    try {
      // Get the next batch of webhooks to process
      const { data: jobs, error } = await supabaseService
        .from('webhook_retry_queue')
        .select('*')
        .lte('scheduled_at', new Date().toISOString())
        .order('priority', { ascending: false }) // High priority first
        .order('scheduled_at', { ascending: true }) // Then by scheduled time
        .limit(this.batchSize);

      if (error) {
        console.error('Error fetching retry jobs:', error);
        return;
      }

      if (!jobs || jobs.length === 0) {
        return; // No jobs to process
      }

      console.log(`Processing ${jobs.length} webhook retry jobs`);

      // Process jobs in parallel
      const processingPromises = jobs.map(job => this.processJob(job));
      await Promise.allSettled(processingPromises);

    } catch (error) {
      console.error('Error processing retry batch:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Process a single retry job
  private async processJob(job: WebhookRetryJob): Promise<void> {
    try {
      // Remove from queue first to prevent reprocessing
      await supabaseService
        .from('webhook_retry_queue')
        .delete()
        .eq('id', job.id);

      // Get the appropriate handler based on event type
      const { handleWebhookEvent } = await import('@/lib/webhooks/handlers');

      // Process the webhook with retry logic
      const result = await retryWebhookProcessing(
        job.webhook_id,
        job.event_type,
        job.payload,
        () => handleWebhookEvent(job.payload)
      );

      if (result.success) {
        console.log(`Successfully retried webhook ${job.webhook_id}`);
      } else {
        console.error(`Failed to retry webhook ${job.webhook_id}:`, result.error);

        // Check if we should requeue for later
        if (job.attempt_count < job.max_attempts) {
          const delay = Math.pow(2, job.attempt_count) * 1000; // Exponential backoff
          await WebhookRetryQueue.add(
            job.webhook_id,
            job.event_type,
            job.payload,
            {
              priority: job.priority,
              maxAttempts: job.max_attempts,
              delay,
            }
          );
        }
      }
    } catch (error) {
      console.error(`Error processing retry job ${job.id}:`, error);

      // Requeue for later if we haven't exceeded max attempts
      if (job.attempt_count < job.max_attempts) {
        const delay = Math.pow(2, job.attempt_count) * 1000;
        await WebhookRetryQueue.add(
          job.webhook_id,
          job.event_type,
          job.payload,
          {
            priority: job.priority,
            maxAttempts: job.max_attempts,
            delay,
          }
        );
      }
    }
  }

  // Get queue statistics
  static async getStats(): Promise<{
    pending: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    overdue: number;
  }> {
    const { data: pending, error } = await supabaseService
      .from('webhook_retry_queue')
      .select('*', { count: 'exact', head: true });

    const { data: highPriority, error: highError } = await supabaseService
      .from('webhook_retry_queue')
      .select('*', { count: 'exact', head: true })
      .eq('priority', 'high');

    const { data: mediumPriority, error: mediumError } = await supabaseService
      .from('webhook_retry_queue')
      .select('*', { count: 'exact', head: true })
      .eq('priority', 'medium');

    const { data: lowPriority, error: lowError } = await supabaseService
      .from('webhook_retry_queue')
      .select('*', { count: 'exact', head: true })
      .eq('priority', 'low');

    const { data: overdue, error: overdueError } = await supabaseService
      .from('webhook_retry_queue')
      .select('*', { count: 'exact', head: true })
      .lte('scheduled_at', new Date().toISOString());

    if (error || highError || mediumError || lowError || overdueError) {
      console.error('Error getting queue stats:', error || highError || mediumError || lowError || overdueError);
      return {
        pending: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
        overdue: 0,
      };
    }

    return {
      pending: pending?.length || 0,
      highPriority: highPriority?.length || 0,
      mediumPriority: mediumPriority?.length || 0,
      lowPriority: lowPriority?.length || 0,
      overdue: overdue?.length || 0,
    };
  }

  // Clear the retry queue (for testing/maintenance)
  static async clear(): Promise<void> {
    try {
      await supabaseService
        .from('webhook_retry_queue')
        .delete()
        .neq('id', ''); // Delete all records

      console.log('Cleared webhook retry queue');
    } catch (error) {
      console.error('Error clearing retry queue:', error);
      throw error;
    }
  }
}

// Global instance of the retry queue
export const webhookRetryQueue = new WebhookRetryQueue();