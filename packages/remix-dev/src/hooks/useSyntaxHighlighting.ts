import { useCallback, useRef, useEffect } from 'react'

declare global {
  interface Window {
    hljs?: {
      highlightElement: (element: HTMLElement) => void
      configure: (options: any) => void
    }
  }
}

export function useSyntaxHighlighting() {
  const isLoadingRef = useRef(false)
  const isLoadedRef = useRef(false)

  const loadHighlightJS = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Skip if already loaded
      if (window.hljs || isLoadedRef.current) {
        resolve()
        return
      }

      // Skip if already loading
      if (isLoadingRef.current) {
        // Wait for existing load to complete
        const checkLoaded = () => {
          if (window.hljs) {
            resolve()
          } else {
            setTimeout(checkLoaded, 100)
          }
        }
        checkLoaded()
        return
      }

      isLoadingRef.current = true

      // Load CSS
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css'
      document.head.appendChild(link)

      // Load JS
      const script = document.createElement('script')
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js'
      script.onload = () => {
        // Initialize highlight.js
        if (window.hljs) {
          window.hljs.configure({
            languages: ['html', 'xml']
          })
          isLoadedRef.current = true
          isLoadingRef.current = false
          resolve()
        } else {
          isLoadingRef.current = false
          reject(new Error('Failed to load highlight.js'))
        }
      }
      script.onerror = () => {
        isLoadingRef.current = false
        reject(new Error('Failed to load highlight.js script'))
      }
      document.head.appendChild(script)
    })
  }, [])

  const highlightHTML = useCallback(async (element: HTMLPreElement, htmlContent: string): Promise<void> => {
    try {
      // Load highlight.js if not already loaded
      if (!window.hljs) {
        await loadHighlightJS()
      }

      // Clear previous highlighting to allow re-highlighting
      element.removeAttribute('data-highlighted')
      
      // Preserve the styled-component className and add highlight.js classes
      const originalClasses = element.className.split(' ').filter(c => !c.startsWith('language-') && c !== 'code-display')
      element.className = [...originalClasses, 'code-display', 'language-html'].join(' ')

      // Set the raw HTML content
      element.textContent = htmlContent

      // Apply syntax highlighting
      if (window.hljs) {
        window.hljs.highlightElement(element)
      }
    } catch (error) {
      console.warn('Failed to apply syntax highlighting:', error)
      // Fallback to plain text
      element.textContent = htmlContent
      // Preserve styled-component className
      const originalClasses = element.className.split(' ').filter(c => !c.startsWith('language-') && c !== 'code-display')
      element.className = [...originalClasses, 'code-display'].join(' ')
    }
  }, [loadHighlightJS])

  return {
    highlightHTML
  }
}