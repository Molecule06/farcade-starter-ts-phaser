import { useEffect, RefObject } from 'react'

/**
 * Custom hook to handle clicking outside an element and escape key press
 * @param ref - React ref to the element
 * @param callback - Function to call when clicking outside or pressing escape
 * @param enabled - Whether the hook is active (default: true)
 */
export function useOutsideClick(
  ref: RefObject<HTMLElement>,
  callback: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback()
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [ref, callback, enabled])
}