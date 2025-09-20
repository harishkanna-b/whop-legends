import { useEffect, useState, useCallback, useRef } from 'react';
import { webSocketService, WebSocketMessage } from './websocket-service';

// Story 1.4 - Quest System Hook
export const useQuestUpdates = (userId: string) => {
  const [questUpdates, setQuestUpdates] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<string | null>(null);

  const handleQuestUpdate = useCallback((message: WebSocketMessage) => {
    setQuestUpdates(prev => [...prev.slice(-49), message]); // Keep last 50 updates
  }, []);

  useEffect(() => {
    if (userId) {
      subscriptionRef.current = webSocketService.subscribeToQuestUpdates(userId, handleQuestUpdate);
      setIsConnected(webSocketService.getConnectionStatus());

      return () => {
        if (subscriptionRef.current) {
          webSocketService.unsubscribe(subscriptionRef.current);
        }
      };
    }
  }, [userId, handleQuestUpdate]);

  const clearUpdates = useCallback(() => {
    setQuestUpdates([]);
  }, []);

  return {
    questUpdates,
    isConnected,
    clearUpdates
  };
};

// Story 1.5 - Analytics Dashboard Hook
export const useAnalyticsUpdates = (companyId: string) => {
  const [analyticsData, setAnalyticsData] = useState<{
    totalReferrals: number;
    totalCommission: number;
    activeUsers: number;
    recentActivity: WebSocketMessage[];
  }>({
    totalReferrals: 0,
    totalCommission: 0,
    activeUsers: 0,
    recentActivity: []
  });
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<string | null>(null);

  const handleAnalyticsUpdate = useCallback((message: WebSocketMessage) => {
    setAnalyticsData(prev => {
      const newActivity = [...prev.recentActivity.slice(-19), message]; // Keep last 20 activities

      switch (message.type) {
        case 'referral_created':
          return {
            ...prev,
            totalReferrals: prev.totalReferrals + 1,
            recentActivity: newActivity
          };
        case 'commission_earned':
          return {
            ...prev,
            totalCommission: prev.totalCommission + (message.payload.amount || 0),
            recentActivity: newActivity
          };
        case 'user_level_up':
          return {
            ...prev,
            activeUsers: prev.activeUsers + 1,
            recentActivity: newActivity
          };
        case 'analytics_updated':
          return {
            ...prev,
            ...message.payload,
            recentActivity: newActivity
          };
        default:
          return {
            ...prev,
            recentActivity: newActivity
          };
      }
    });
  }, []);

  useEffect(() => {
    if (companyId) {
      subscriptionRef.current = webSocketService.subscribeToAnalyticsUpdates(companyId, handleAnalyticsUpdate);
      setIsConnected(webSocketService.getConnectionStatus());

      return () => {
        if (subscriptionRef.current) {
          webSocketService.unsubscribe(subscriptionRef.current);
        }
      };
    }
  }, [companyId, handleAnalyticsUpdate]);

  return {
    analyticsData,
    isConnected
  };
};

// Story 1.6 - Leaderboards Hook
export const useLeaderboardUpdates = (leaderboardId: string) => {
  const [leaderboardData, setLeaderboardData] = useState<{
    entries: any[];
    lastUpdated: Date | null;
    rankUpdates: WebSocketMessage[];
  }>({
    entries: [],
    lastUpdated: null,
    rankUpdates: []
  });
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<string | null>(null);

  const handleLeaderboardUpdate = useCallback((message: WebSocketMessage) => {
    setLeaderboardData(prev => {
      const newRankUpdates = [...prev.rankUpdates.slice(-9), message]; // Keep last 10 rank updates

      switch (message.type) {
        case 'rank_update':
          return {
            ...prev,
            entries: message.payload.entries || prev.entries,
            lastUpdated: new Date(),
            rankUpdates: newRankUpdates
          };
        case 'score_update':
          return {
            ...prev,
            entries: message.payload.entries || prev.entries,
            lastUpdated: new Date(),
            rankUpdates: newRankUpdates
          };
        case 'leaderboard_refreshed':
          return {
            ...prev,
            entries: message.payload.entries || [],
            lastUpdated: new Date(),
            rankUpdates: newRankUpdates
          };
        case 'new_leader':
          return {
            ...prev,
            entries: message.payload.entries || prev.entries,
            lastUpdated: new Date(),
            rankUpdates: newRankUpdates
          };
        default:
          return {
            ...prev,
            lastUpdated: new Date(),
            rankUpdates: newRankUpdates
          };
      }
    });
  }, []);

  useEffect(() => {
    if (leaderboardId) {
      subscriptionRef.current = webSocketService.subscribeToLeaderboardUpdates(leaderboardId, handleLeaderboardUpdate);
      setIsConnected(webSocketService.getConnectionStatus());

      return () => {
        if (subscriptionRef.current) {
          webSocketService.unsubscribe(subscriptionRef.current);
        }
      };
    }
  }, [leaderboardId, handleLeaderboardUpdate]);

  return {
    leaderboardData,
    isConnected
  };
};

// General User Updates Hook
export const useUserUpdates = (userId: string) => {
  const [userUpdates, setUserUpdates] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<string | null>(null);

  const handleUserUpdate = useCallback((message: WebSocketMessage) => {
    setUserUpdates(prev => [...prev.slice(-19), message]); // Keep last 20 updates
  }, []);

  useEffect(() => {
    if (userId) {
      subscriptionRef.current = webSocketService.subscribeToUserUpdates(userId, handleUserUpdate);
      setIsConnected(webSocketService.getConnectionStatus());

      return () => {
        if (subscriptionRef.current) {
          webSocketService.unsubscribe(subscriptionRef.current);
        }
      };
    }
  }, [userId, handleUserUpdate]);

  return {
    userUpdates,
    isConnected
  };
};

// Referral Updates Hook
export const useReferralUpdates = (userId: string) => {
  const [referralUpdates, setReferralUpdates] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<string | null>(null);

  const handleReferralUpdate = useCallback((message: WebSocketMessage) => {
    setReferralUpdates(prev => [...prev.slice(-19), message]); // Keep last 20 updates
  }, []);

  useEffect(() => {
    if (userId) {
      subscriptionRef.current = webSocketService.subscribeToReferralUpdates(userId, handleReferralUpdate);
      setIsConnected(webSocketService.getConnectionStatus());

      return () => {
        if (subscriptionRef.current) {
          webSocketService.unsubscribe(subscriptionRef.current);
        }
      };
    }
  }, [userId, handleReferralUpdate]);

  return {
    referralUpdates,
    isConnected
  };
};

// Guild Updates Hook
export const useGuildUpdates = (guildId: string) => {
  const [guildUpdates, setGuildUpdates] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const subscriptionRef = useRef<string | null>(null);

  const handleGuildUpdate = useCallback((message: WebSocketMessage) => {
    setGuildUpdates(prev => [...prev.slice(-19), message]); // Keep last 20 updates
  }, []);

  useEffect(() => {
    if (guildId) {
      subscriptionRef.current = webSocketService.subscribeToGuildUpdates(guildId, handleGuildUpdate);
      setIsConnected(webSocketService.getConnectionStatus());

      return () => {
        if (subscriptionRef.current) {
          webSocketService.unsubscribe(subscriptionRef.current);
        }
      };
    }
  }, [guildId, handleGuildUpdate]);

  return {
    guildUpdates,
    isConnected
  };
};

// Connection Status Hook
export const useConnectionStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeSubscriptions, setActiveSubscriptions] = useState<string[]>([]);

  useEffect(() => {
    const updateConnectionStatus = () => {
      setIsConnected(webSocketService.getConnectionStatus());
      setActiveSubscriptions(webSocketService.getActiveSubscriptions());
    };

    // Update status immediately
    updateConnectionStatus();

    // Set up interval to check connection status
    const interval = setInterval(updateConnectionStatus, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const connect = useCallback(() => {
    webSocketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    webSocketService.disconnect();
  }, []);

  return {
    isConnected,
    activeSubscriptions,
    connect,
    disconnect
  };
};

// Message Broadcasting Hook
export const useMessageBroadcast = () => {
  const broadcastMessage = useCallback(async (channelName: string, event: string, payload: any) => {
    try {
      await webSocketService.broadcastMessage(channelName, event, payload);
      return { success: true };
    } catch (error) {
      console.error('Error broadcasting message:', error);
      return { success: false, error };
    }
  }, []);

  return {
    broadcastMessage
  };
};