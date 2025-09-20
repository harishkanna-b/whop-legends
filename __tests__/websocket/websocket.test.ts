import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WebSocketService, WebSocketMessage } from '../../lib/websocket/websocket-service';

// Mock the Supabase client
jest.mock('../../lib/supabase-client', () => ({
  supabase: {
    realtime: {
      connect: jest.fn(),
      disconnect: jest.fn(),
      onOpen: jest.fn(),
      onClose: jest.fn(),
      onError: jest.fn(),
      channel: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(),
        unsubscribe: jest.fn(),
        send: jest.fn()
      })
    }
  }
}));

describe('WebSocket Service', () => {
  let webSocketService: WebSocketService;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  beforeEach(() => {
    // Clear all instances and mocks
    WebSocketService['instance'] = null;
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = WebSocketService.getInstance();
      const instance2 = WebSocketService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should create a new instance if none exists', () => {
      const instance = WebSocketService.getInstance();
      expect(instance).toBeInstanceOf(WebSocketService);
    });
  });

  describe('Connection Management', () => {
    it('should handle connection open', () => {
      const service = WebSocketService.getInstance();

      // Simulate connection open
      const onOpenCallback = (service as any).client.onOpen.mock.calls[0][0];
      onOpenCallback();

      expect((service as any).isConnected).toBe(true);
      expect((service as any).reconnectAttempts).toBe(0);
    });

    it('should handle connection close', () => {
      const service = WebSocketService.getInstance();

      // Simulate connection close
      const onCloseCallback = (service as any).client.onClose.mock.calls[0][0];
      onCloseCallback();

      expect((service as any).isConnected).toBe(false);
    });

    it('should handle connection errors', () => {
      const service = WebSocketService.getInstance();
      const mockError = new Error('Connection failed');

      // Simulate connection error
      const onErrorCallback = (service as any).client.onError.mock.calls[0][0];
      onErrorCallback(mockError);

      expect((service as any).isConnected).toBe(false);
      expect(mockConsoleError).toHaveBeenCalledWith('WebSocket error:', mockError);
    });
  });

  describe('Quest Updates Subscription', () => {
    it('should subscribe to quest updates', () => {
      const service = WebSocketService.getInstance();
      const userId = 'test-user-id';
      const callback = jest.fn();

      const subscriptionId = service.subscribeToQuestUpdates(userId, callback);

      expect(subscriptionId).toBe(`quest-updates-${userId}`);
      expect((service as any).subscriptions.has(subscriptionId)).toBe(true);
    });

    it('should return existing subscription if already subscribed', () => {
      const service = WebSocketService.getInstance();
      const userId = 'test-user-id';
      const callback = jest.fn();

      const subscriptionId1 = service.subscribeToQuestUpdates(userId, callback);
      const subscriptionId2 = service.subscribeToQuestUpdates(userId, callback);

      expect(subscriptionId1).toBe(subscriptionId2);
      expect((service as any).subscriptions.size).toBe(1);
    });

    it('should handle quest update messages', () => {
      const service = WebSocketService.getInstance();
      const userId = 'test-user-id';
      const callback = jest.fn();

      service.subscribeToQuestUpdates(userId, callback);

      // Simulate receiving a quest update
      const channel = (service as any).subscriptions.get(`quest-updates-${userId}`).channel;
      const onCallback = channel.on.mock.calls[0][2];

      const mockPayload = {
        eventType: 'INSERT',
        new: { user_id: userId, quest_id: 'test-quest', progress_value: 50 }
      };

      onCallback(mockPayload);

      expect(callback).toHaveBeenCalledWith({
        type: 'quest_update',
        payload: {
          eventType: 'INSERT',
          new: { user_id: userId, quest_id: 'test-quest', progress_value: 50 }
        },
        timestamp: expect.any(Date),
        userId
      });
    });
  });

  describe('Analytics Updates Subscription', () => {
    it('should subscribe to analytics updates', () => {
      const service = WebSocketService.getInstance();
      const companyId = 'test-company-id';
      const callback = jest.fn();

      const subscriptionId = service.subscribeToAnalyticsUpdates(companyId, callback);

      expect(subscriptionId).toBe(`analytics-updates-${companyId}`);
      expect((service as any).subscriptions.has(subscriptionId)).toBe(true);
    });

    it('should handle analytics update messages', () => {
      const service = WebSocketService.getInstance();
      const companyId = 'test-company-id';
      const callback = jest.fn();

      service.subscribeToAnalyticsUpdates(companyId, callback);

      // Simulate receiving an analytics update
      const channel = (service as any).subscriptions.get(`analytics-updates-${companyId}`).channel;
      const onCallback = channel.on.mock.calls[0][2];

      const mockPayload = {
        payload: { type: 'referral_created', amount: 100 }
      };

      onCallback(mockPayload);

      expect(callback).toHaveBeenCalledWith({
        type: 'referral_created',
        payload: { type: 'referral_created', amount: 100 },
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Leaderboard Updates Subscription', () => {
    it('should subscribe to leaderboard updates', () => {
      const service = WebSocketService.getInstance();
      const leaderboardId = 'test-leaderboard-id';
      const callback = jest.fn();

      const subscriptionId = service.subscribeToLeaderboardUpdates(leaderboardId, callback);

      expect(subscriptionId).toBe(`leaderboard-updates-${leaderboardId}`);
      expect((service as any).subscriptions.has(subscriptionId)).toBe(true);
    });

    it('should handle leaderboard update messages', () => {
      const service = WebSocketService.getInstance();
      const leaderboardId = 'test-leaderboard-id';
      const callback = jest.fn();

      service.subscribeToLeaderboardUpdates(leaderboardId, callback);

      // Simulate receiving a leaderboard update
      const channel = (service as any).subscriptions.get(`leaderboard-updates-${leaderboardId}`).channel;
      const onCallback = channel.on.mock.calls[0][2];

      const mockPayload = {
        payload: { userId: 'test-user', oldRank: 5, newRank: 3 }
      };

      onCallback(mockPayload);

      expect(callback).toHaveBeenCalledWith({
        type: 'rank_update',
        payload: { userId: 'test-user', oldRank: 5, newRank: 3 },
        timestamp: expect.any(Date)
      });
    });
  });

  describe('Message Broadcasting', () => {
    it('should broadcast messages successfully', async () => {
      const service = WebSocketService.getInstance();
      const channelName = 'test-channel';
      const event = 'test-event';
      const payload = { message: 'test data' };

      // Mock successful broadcast
      const mockChannel = {
        send: jest.fn().mockResolvedValue(undefined)
      };
      (service as any).client.channel.mockReturnValue(mockChannel);

      await expect(service.broadcastMessage(channelName, event, payload)).resolves.not.toThrow();

      expect(mockChannel.send).toHaveBeenCalledWith({
        type: 'broadcast',
        event,
        payload
      });
    });

    it('should handle broadcast errors', async () => {
      const service = WebSocketService.getInstance();
      const channelName = 'test-channel';
      const event = 'test-event';
      const payload = { message: 'test data' };

      // Mock failed broadcast
      const mockError = new Error('Broadcast failed');
      const mockChannel = {
        send: jest.fn().mockRejectedValue(mockError)
      };
      (service as any).client.channel.mockReturnValue(mockChannel);

      await expect(service.broadcastMessage(channelName, event, payload)).rejects.toThrow(mockError);
      expect(mockConsoleError).toHaveBeenCalledWith('Error broadcasting message:', mockError);
    });
  });

  describe('Unsubscription', () => {
    it('should unsubscribe from specific subscription', () => {
      const service = WebSocketService.getInstance();
      const userId = 'test-user-id';
      const callback = jest.fn();

      const subscriptionId = service.subscribeToQuestUpdates(userId, callback);
      expect((service as any).subscriptions.has(subscriptionId)).toBe(true);

      service.unsubscribe(subscriptionId);
      expect((service as any).subscriptions.has(subscriptionId)).toBe(false);
    });

    it('should handle unsubscribe from non-existent subscription', () => {
      const service = WebSocketService.getInstance();

      expect(() => {
        service.unsubscribe('non-existent-subscription');
      }).not.toThrow();
    });

    it('should unsubscribe from all subscriptions', () => {
      const service = WebSocketService.getInstance();

      // Subscribe to multiple channels
      service.subscribeToQuestUpdates('user1', jest.fn());
      service.subscribeToAnalyticsUpdates('company1', jest.fn());
      service.subscribeToLeaderboardUpdates('leaderboard1', jest.fn());

      expect((service as any).subscriptions.size).toBe(3);

      service.unsubscribeAll();
      expect((service as any).subscriptions.size).toBe(0);
    });
  });

  describe('Connection Status', () => {
    it('should return connection status', () => {
      const service = WebSocketService.getInstance();

      expect(service.getConnectionStatus()).toBe(false);

      // Simulate connection
      (service as any).isConnected = true;
      expect(service.getConnectionStatus()).toBe(true);
    });

    it('should return active subscriptions', () => {
      const service = WebSocketService.getInstance();

      service.subscribeToQuestUpdates('user1', jest.fn());
      service.subscribeToAnalyticsUpdates('company1', jest.fn());

      const activeSubscriptions = service.getActiveSubscriptions();
      expect(activeSubscriptions).toHaveLength(2);
      expect(activeSubscriptions).toContain('quest-updates-user1');
      expect(activeSubscriptions).toContain('analytics-updates-company1');
    });
  });

  describe('Manual Connection Control', () => {
    it('should connect manually', () => {
      const service = WebSocketService.getInstance();

      service.connect();
      expect((service as any).client.connect).toHaveBeenCalled();
    });

    it('should disconnect manually', () => {
      const service = WebSocketService.getInstance();

      service.disconnect();
      expect((service as any).client.disconnect).toHaveBeenCalled();
      expect((service as any).subscriptions.size).toBe(0);
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on disconnection', () => {
      jest.useFakeTimers();
      const mockSetTimeout = jest.fn();
      global.setTimeout = mockSetTimeout;

      const service = WebSocketService.getInstance();

      // Simulate disconnection
      const onCloseCallback = (service as any).client.onClose.mock.calls[0][0];
      onCloseCallback();

      expect((service as any).reconnectAttempts).toBe(1);
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);

      jest.useRealTimers();
    });

    it('should stop reconnecting after max attempts', () => {
      jest.useFakeTimers();
      const service = WebSocketService.getInstance();

      // Set max reconnect attempts to 1 for testing
      (service as any).maxReconnectAttempts = 1;

      // Simulate disconnection
      const onCloseCallback = (service as any).client.onClose.mock.calls[0][0];
      onCloseCallback();

      expect((service as any).reconnectAttempts).toBe(1);

      // Try to disconnect again (should not reconnect)
      onCloseCallback();
      expect((service as any).reconnectAttempts).toBe(1); // Should not increment

      jest.useRealTimers();
    });
  });
});