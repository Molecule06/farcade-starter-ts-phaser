import { useCallback, useEffect, useState } from 'react'
import { useDashboard } from '../contexts'

interface SDKIntegrationStatus {
  isComplete: boolean
  passedChecks: number
  totalChecks: number
  missingHandlers: string[]
}

export function useSDKIntegration() {
  const { state } = useDashboard()
  const [sdkStatus, setSDKStatus] = useState<SDKIntegrationStatus>({
    isComplete: false,
    passedChecks: 0,
    totalChecks: 4,
    missingHandlers: []
  })

  const checkSDKIntegration = useCallback(() => {
    const flags = state.sdk.flags
    const checks = [
      { flag: flags.ready, name: 'ready' },
      { flag: flags.gameOver, name: 'game_over' },
      { flag: flags.playAgain, name: 'play_again' },
      { flag: flags.toggleMute, name: 'toggle_mute' }
    ]
    
    const passedChecks = checks.filter(check => check.flag).length
    const missingHandlers = checks.filter(check => !check.flag).map(check => check.name)
    const isComplete = passedChecks === 4
    
    setSDKStatus({
      isComplete,
      passedChecks,
      totalChecks: 4,
      missingHandlers
    })
  }, [state.sdk.flags])

  // Check SDK integration whenever flags change
  useEffect(() => {
    checkSDKIntegration()
  }, [checkSDKIntegration])

  return {
    sdkStatus,
    checkSDKIntegration
  }
}