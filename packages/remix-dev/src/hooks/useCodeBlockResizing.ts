import { useCallback, useEffect, useRef } from 'react'

export function useCodeBlockResizing(
  buildPanelRef: React.RefObject<HTMLElement>,
  buildOutputCodeRef: React.RefObject<HTMLElement>,
  isOutputVisible: boolean
) {
  const mutationObserverRef = useRef<MutationObserver | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  const calculateCodeBlockHeight = useCallback(() => {
    if (!buildPanelRef.current || !buildOutputCodeRef.current || !isOutputVisible) return

    const buildPanel = buildPanelRef.current
    const buildOutputCode = buildOutputCodeRef.current

    // Get the build panel dimensions
    const panelRect = buildPanel.getBoundingClientRect()
    const buildPanelContent = buildPanel.querySelector('.build-panel-content') as HTMLElement
    const panelContentRect = buildPanelContent?.getBoundingClientRect()

    if (panelRect.height === 0 || !panelContentRect || panelContentRect.height === 0) return

    // Calculate space taken by other elements
    let usedHeight = 0

    // Measure build controls section
    const buildControls = buildPanel.querySelector('.build-controls') as HTMLElement
    if (buildControls && buildControls.offsetHeight) {
      usedHeight += buildControls.offsetHeight
    }

    // Measure build output header
    const buildOutputHeader = buildPanel.querySelector('.build-output-header') as HTMLElement
    if (buildOutputHeader && buildOutputHeader.offsetHeight) {
      usedHeight += buildOutputHeader.offsetHeight
    }

    // Account for gaps and padding
    const buildControlsStyle = buildControls ? getComputedStyle(buildControls) : null
    const gapSize = buildControlsStyle ? parseInt(buildControlsStyle.gap) || 16 : 16
    const numGaps = 5 // Approximate number of gaps between elements
    usedHeight += gapSize * numGaps

    // Account for panel content padding
    const panelContentStyle = getComputedStyle(buildPanelContent)
    const paddingTop = parseInt(panelContentStyle.paddingTop) || 0
    const paddingBottom = parseInt(panelContentStyle.paddingBottom) || 0
    usedHeight += paddingTop + paddingBottom

    // Calculate available height for code block
    const availableHeight = panelContentRect.height - usedHeight
    const minHeight = 200 // Minimum height for usability
    const maxHeight = Math.max(availableHeight, minHeight)

    // Apply the calculated height
    buildOutputCode.style.maxHeight = `${maxHeight}px`
  }, [buildPanelRef, buildOutputCodeRef, isOutputVisible])

  const setupCodeBlockResizing = useCallback(() => {
    if (!buildPanelRef.current) return

    const buildPanel = buildPanelRef.current

    // Setup MutationObserver to watch for content changes
    if (mutationObserverRef.current) {
      mutationObserverRef.current.disconnect()
    }
    
    mutationObserverRef.current = new MutationObserver(calculateCodeBlockHeight)
    mutationObserverRef.current.observe(buildPanel, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    })

    // Setup ResizeObserver to watch for window/panel size changes
    if (window.ResizeObserver) {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
      
      resizeObserverRef.current = new ResizeObserver(calculateCodeBlockHeight)
      resizeObserverRef.current.observe(buildPanel)
      resizeObserverRef.current.observe(document.body)
    }

    // Also listen for window resize as fallback
    window.addEventListener('resize', calculateCodeBlockHeight)

    // Initial calculation
    calculateCodeBlockHeight()

    return () => {
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect()
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
      window.removeEventListener('resize', calculateCodeBlockHeight)
    }
  }, [buildPanelRef, calculateCodeBlockHeight])

  // Setup resizing when component mounts or output becomes visible
  useEffect(() => {
    if (isOutputVisible) {
      // Delay setup to ensure DOM is ready
      const timeoutId = setTimeout(setupCodeBlockResizing, 100)
      return () => {
        clearTimeout(timeoutId)
        if (mutationObserverRef.current) {
          mutationObserverRef.current.disconnect()
        }
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect()
        }
        window.removeEventListener('resize', calculateCodeBlockHeight)
      }
    }
  }, [isOutputVisible, setupCodeBlockResizing, calculateCodeBlockHeight])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mutationObserverRef.current) {
        mutationObserverRef.current.disconnect()
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
      window.removeEventListener('resize', calculateCodeBlockHeight)
    }
  }, [calculateCodeBlockHeight])

  return {
    calculateCodeBlockHeight,
    setupCodeBlockResizing
  }
}