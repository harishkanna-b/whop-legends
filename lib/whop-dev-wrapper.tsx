'use client'

import { useEffect, useState } from 'react'

interface WhopDevWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function WhopDevWrapper({ children, fallback }: WhopDevWrapperProps) {
  const [isWhopContext, setIsWhopContext] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if we're running in Whop iframe context
    const checkWhopContext = () => {
      try {
        // Check if we have access to Whop SDK or parent frame
        if (window.parent !== window && window.location.ancestorOrigins?.length) {
          setIsWhopContext(true)
        }

        // Check for Whop-specific environment
        if (process.env.NODE_ENV === 'development') {
          console.log('Running in development mode - Whop context detection skipped')
        }
      } catch (err) {
        console.log('Not running in Whop iframe context')
        setIsWhopContext(false)
      }
    }

    checkWhopContext()

    // Listen for Whop SDK errors
    const handleWhopError = (event: ErrorEvent) => {
      if (event.message?.includes('App API Key') || event.message?.includes('user token')) {
        setError('Whop authentication required. This app needs to run within Whop.com iframe.')
        console.warn('Whop authentication error:', event.error)
      }
    }

    window.addEventListener('error', handleWhopError)
    return () => window.removeEventListener('error', handleWhopError)
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Whop Legends App</h1>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                {error}
              </p>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>📋 <strong>Development Mode:</strong> This app is designed to run within the Whop.com ecosystem.</p>
              <p>🔧 <strong>To test locally:</strong> You can view the static components, but full functionality requires Whop authentication.</p>
              <p>🌐 <strong>For full experience:</strong> Access this app through your Whop dashboard.</p>
            </div>
            {fallback && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                {fallback}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!isWhopContext && process.env.NODE_ENV === 'development') {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Development header */}
        <div className="bg-blue-600 text-white p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">🎮 Whop Legends - Development Mode</h1>
                <p className="text-blue-100 text-sm">Running outside Whop iframe - Limited functionality</p>
              </div>
              <div className="bg-blue-500 px-3 py-1 rounded text-sm">
                DEV MODE
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-7xl mx-auto p-4">
          {children}
        </div>
      </div>
    )
  }

  return <>{children}</>
}