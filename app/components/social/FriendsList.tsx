'use client'

import { useState, useEffect } from 'react'
import { Friend, FriendRequest } from '@/lib/social'

interface FriendsListProps {
  userId: string
}

export default function FriendsList({ userId }: FriendsListProps) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends')

  useEffect(() => {
    loadFriends()
    loadRequests()
  }, [userId])

  const loadFriends = async () => {
    try {
      const response = await fetch(`/api/social/friends?userId=${userId}&action=list`)
      const result = await response.json()
      if (result.success) {
        setFriends(result.data)
      }
    } catch (error) {
      console.error('Error loading friends:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRequests = async () => {
    try {
      const response = await fetch(`/api/social/friends?userId=${userId}&action=requests`)
      const result = await response.json()
      if (result.success) {
        setRequests(result.data)
      }
    } catch (error) {
      console.error('Error loading requests:', error)
    }
  }

  const sendFriendRequest = async (recipientId: string) => {
    try {
      const response = await fetch('/api/social/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: userId, recipientId })
      })
      const result = await response.json()
      if (result.success) {
        // Refresh data
        await loadRequests()
      }
      return result
    } catch (error) {
      console.error('Error sending friend request:', error)
      return { success: false, error: 'Failed to send friend request' }
    }
  }

  const respondToRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch('/api/social/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, userId, action })
      })
      const result = await response.json()
      if (result.success) {
        // Refresh data
        await loadFriends()
        await loadRequests()
      }
      return result
    } catch (error) {
      console.error('Error responding to request:', error)
      return { success: false, error: 'Failed to respond to request' }
    }
  }

  const removeFriend = async (friendId: string) => {
    try {
      const response = await fetch(`/api/social/friends/remove?userId=${userId}&friendId=${friendId}`, {
        method: 'DELETE'
      })
      const result = await response.json()
      if (result.success) {
        await loadFriends()
      }
      return result
    } catch (error) {
      console.error('Error removing friend:', error)
      return { success: false, error: 'Failed to remove friend' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Friends</h2>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'friends'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          onClick={() => setActiveTab('friends')}
        >
          Friends ({friends.length})
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'requests'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          onClick={() => setActiveTab('requests')}
        >
          Requests ({requests.length})
        </button>
      </div>

      {/* Friends List */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {friends.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No friends yet. Send some friend requests!</p>
          ) : (
            friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {friend.friend?.username?.[0] || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold">{friend.friend?.username || 'Unknown User'}</h3>
                    <p className="text-sm text-gray-500">
                      {friend.friend?.socialProfile?.bio || 'No bio available'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Friends since {new Date(friend.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => removeFriend(friend.friendId)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Remove
                  </button>
                  <button
                    onClick={() => window.location.href = `/profile/${friend.friendId}`}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Friend Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending friend requests.</p>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {request.requester?.username?.[0] || '?'}
                  </div>
                  <div>
                    <h3 className="font-semibold">{request.requester?.username || 'Unknown User'}</h3>
                    <p className="text-sm text-gray-500">{request.message || 'No message'}</p>
                    <p className="text-xs text-gray-400">
                      Requested {new Date(request.requestedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => respondToRequest(request.id, 'accept')}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respondToRequest(request.id, 'reject')}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}