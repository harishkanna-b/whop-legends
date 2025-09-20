'use client';

import React, { useState, useEffect } from 'react';

interface QuestNotification {
  id: string;
  type: 'quest_completed' | 'reward_available' | 'new_quest' | 'quest_reminder';
  title: string;
  message: string;
  questId?: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
}

interface QuestNotificationsProps {
  userId: string;
  onQuestComplete?: (questId: string) => void;
  onRewardClaim?: (questId: string) => void;
}

export function QuestNotifications({ userId, onQuestComplete, onRewardClaim }: QuestNotificationsProps) {
  const [notifications, setNotifications] = useState<QuestNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    // Set up real-time subscription for new notifications
    const subscription = subscribeToNotifications();
    return () => subscription?.unsubscribe();
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/quests/notifications?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        updateUnreadCount(data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const subscribeToNotifications = () => {
    // This would set up a real-time subscription
    // For now, we'll simulate with polling
    const interval = setInterval(fetchNotifications, 30000); // 30 seconds
    return { unsubscribe: () => clearInterval(interval) };
  };

  const updateUnreadCount = (notifs: QuestNotification[]) => {
    const unread = notifs.filter(n => !n.read).length;
    setUnreadCount(unread);
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/quests/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      updateUnreadCount(notifications.map(n => n.id === notificationId ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/quests/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    const icons = {
      quest_completed: '🎉',
      reward_available: '💎',
      new_quest: '📝',
      quest_reminder: '⏰'
    };
    return icons[type as keyof typeof icons] || '📢';
  };

  const getNotificationColor = (type: string) => {
    const colors = {
      quest_completed: 'border-green-200 bg-green-50',
      reward_available: 'border-purple-200 bg-purple-50',
      new_quest: 'border-blue-200 bg-blue-50',
      quest_reminder: 'border-yellow-200 bg-yellow-50'
    };
    return colors[type as keyof typeof colors] || 'border-gray-200 bg-gray-50';
  };

  const handleAction = (notification: QuestNotification) => {
    if (notification.action) {
      notification.action.callback();
    }
    markAsRead(notification.id);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quest Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-gray-600">No notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-l-4 ${getNotificationColor(notification.type)} ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-xl">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">{notification.title}</h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {new Date(notification.timestamp).toLocaleString()}
                          </span>
                          {notification.action && (
                            <button
                              onClick={() => handleAction(notification)}
                              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors"
                            >
                              {notification.action.label}
                            </button>
                          )}
                        </div>
                      </div>
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <span className="text-sm">×</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}