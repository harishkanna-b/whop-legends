'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { referralManager } from '@/lib/referral-tracking'

interface ReferralLandingPageProps {
  params: { code: string }
}

export default function ReferralLandingPage({ params }: ReferralLandingPageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [referrerInfo, setReferrerInfo] = useState<{
    username?: string
    avatar?: string
    message?: string
  } | null>(null)

  useEffect(() => {
    const handleReferral = async () => {
      try {
        // Track the click
        const clickData = {
          ip: '', // Will be filled by server
          userAgent: navigator.userAgent,
          referer: document.referrer,
          utmSource: new URLSearchParams(window.location.search).get('utm_source') || undefined,
          utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || undefined,
          utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || undefined
        }

        // Track click (this will be handled by the API)
        await fetch('/api/referral/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: params.code, clickData })
        })

        // Get referrer info
        const response = await fetch(`/api/referrals?userId=${params.code}&action=referrer-info`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setReferrerInfo(data.data)
          }
        }

        setLoading(false)

        // Store referral code in localStorage for later use
        localStorage.setItem('referralCode', params.code)

        // Redirect to main page after a short delay
        setTimeout(() => {
          router.push('/')
        }, 3000)

      } catch (error) {
        console.error('Error handling referral:', error)
        setError('Invalid or expired referral link')
        setLoading(false)

        // Redirect to main page after error
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    }

    handleReferral()
  }, [params.code, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing referral...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Referral Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Redirecting to main page...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome! {referrerInfo?.username ? `Invited by ${referrerInfo.username}` : ''}
        </h1>
        <p className="text-gray-600 mb-4">
          You've been invited to join our platform!
        </p>
        {referrerInfo?.message && (
          <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
            <p className="text-sm text-gray-700 italic">"{referrerInfo.message}"</p>
          </div>
        )}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <p className="text-sm text-gray-600">Redirecting to main page...</p>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  )
}