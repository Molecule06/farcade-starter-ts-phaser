export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// Memory formatting (input is already in MB from performance monitoring)
export function formatMemory(mb: number): string {
  // Values come in as MB already from the performance monitor
  if (mb < 1) {
    return mb.toFixed(2) + ' MB'
  }
  return mb.toFixed(1) + ' MB'
}

export function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return 'Never'
  
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  if (seconds > 0) return `${seconds}s ago`
  return 'Just now'
}

export function detectDeviceCapabilities() {
  // Detect Safari browser (specifically Safari, not Chrome or other WebKit browsers)
  const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor)
  
  // Detect mobile touch devices
  const isMobileDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || 
                        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  return { isSafari, isMobileDevice }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = text
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      document.body.removeChild(textArea)
      return true
    } catch (fallbackError) {
      document.body.removeChild(textArea)
      return false
    }
  }
}


export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor
}

// Game messaging utilities
/**
 * Send a command to the game iframe (equivalent to sendToGame in original system)
 */
export function sendToGame(
  type: string,
  data: any,
  targetIframeId?: string | string[]
): void {
  const payload = { type, data }
  const toIdArray = (target?: string | string[]) => {
    if (!target) return [] as string[]
    return Array.isArray(target)
      ? target.filter((id) => typeof id === 'string' && id.length > 0)
      : [target]
  }

  const iframeIds = toIdArray(targetIframeId)
  let delivered = false

  const postToIframe = (iframe: HTMLIFrameElement | null) => {
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(payload, '*')
      delivered = true
    }
  }

  if (iframeIds.length > 0) {
    iframeIds.forEach((iframeId) => {
      const iframe = document.getElementById(iframeId) as HTMLIFrameElement | null
      postToIframe(iframe)
    })
  } else {
    // Prefer the primary single-player iframe when available
    const primaryIframe = document.querySelector('#game-iframe') as HTMLIFrameElement | null
    postToIframe(primaryIframe)

    if (!delivered) {
      // Broadcast to any iframe that matches the game id pattern (covers multiplayer)
      const frameNodes = document.querySelectorAll('iframe[id^="game-iframe"]')
      frameNodes.forEach((node) => {
        postToIframe(node as HTMLIFrameElement)
      })
    }
  }

  if (!delivered) {
    console.warn('❌ Could not send to game: iframe not found or not ready')
  }
}

/**
 * Send a Remix development command to the game
 */
export function sendRemixCommand(
  command: string,
  commandData?: any,
  targetIframeId?: string | string[]
): void {
  sendToGame(
    'remix_dev_command',
    {
      command,
      data: commandData,
    },
    targetIframeId
  )
}
