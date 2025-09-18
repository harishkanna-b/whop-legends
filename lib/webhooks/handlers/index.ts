import { WhopWebhookEvent } from '@/types/whop';
import { handleReferralCreated } from './referral-created';
import { handleReferralCompleted } from './referral-completed';
import { handleReferralCancelled } from './referral-cancelled';
import { WebhookProcessingResult } from '@/types/whop';

export const webhookHandlers = {
  'referral.created': handleReferralCreated,
  'referral.completed': handleReferralCompleted,
  'referral.cancelled': handleReferralCancelled,
} as const;

export const handleWebhookEvent = async (
  event: WhopWebhookEvent
): Promise<WebhookProcessingResult> => {
  const handler = webhookHandlers[event.type];

  if (!handler) {
    return {
      success: false,
      processed: false,
      error: `No handler found for event type: ${event.type}`,
      shouldRetry: false,
    };
  }

  try {
    const result = await handler(event);
    return result;
  } catch (error) {
    console.error(`Error handling webhook event ${event.type}:`, error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Determine if this is a retryable error
    const shouldRetry = !(
      errorMessage.includes('invalid') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('unauthorized')
    );

    return {
      success: false,
      processed: false,
      error: errorMessage,
      shouldRetry,
      retryCount: 0,
    };
  }
};

export const getSupportedEventTypes = () => {
  return Object.keys(webhookHandlers);
};