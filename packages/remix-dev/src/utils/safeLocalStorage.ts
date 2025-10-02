/**
 * Safe localStorage wrapper that handles availability checks,
 * permissions, and error handling gracefully.
 */

class SafeLocalStorage {
  private isAvailable: boolean | null = null

  /**
   * Checks if localStorage is available and accessible
   */
  private checkAvailability(): boolean {
    if (this.isAvailable !== null) {
      return this.isAvailable
    }

    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined' || !window.localStorage) {
        this.isAvailable = false
        return false
      }

      // Test if localStorage is accessible (may throw in private browsing)
      const testKey = '__localStorage_test__'
      window.localStorage.setItem(testKey, 'test')
      window.localStorage.removeItem(testKey)
      
      this.isAvailable = true
      return true
    } catch (error) {
      // localStorage is not available or blocked
      console.warn('localStorage is not available:', error)
      this.isAvailable = false
      return false
    }
  }

  /**
   * Gets an item from localStorage with fallback
   */
  getItem(key: string): string | null {
    if (!this.checkAvailability()) {
      return null
    }

    try {
      return window.localStorage.getItem(key)
    } catch (error) {
      console.error(`Error reading from localStorage (key: ${key}):`, error)
      return null
    }
  }

  /**
   * Sets an item in localStorage with error handling
   */
  setItem(key: string, value: string): boolean {
    if (!this.checkAvailability()) {
      return false
    }

    try {
      window.localStorage.setItem(key, value)
      return true
    } catch (error) {
      // Handle quota exceeded or other errors
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('localStorage quota exceeded')
      } else {
        console.error(`Error writing to localStorage (key: ${key}):`, error)
      }
      return false
    }
  }

  /**
   * Removes an item from localStorage
   */
  removeItem(key: string): boolean {
    if (!this.checkAvailability()) {
      return false
    }

    try {
      window.localStorage.removeItem(key)
      return true
    } catch (error) {
      console.error(`Error removing from localStorage (key: ${key}):`, error)
      return false
    }
  }

  /**
   * Clears all localStorage data
   */
  clear(): boolean {
    if (!this.checkAvailability()) {
      return false
    }

    try {
      window.localStorage.clear()
      return true
    } catch (error) {
      console.error('Error clearing localStorage:', error)
      return false
    }
  }

  /**
   * Gets all keys from localStorage
   */
  keys(): string[] {
    if (!this.checkAvailability()) {
      return []
    }

    try {
      const keys: string[] = []
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i)
        if (key !== null) {
          keys.push(key)
        }
      }
      return keys
    } catch (error) {
      console.error('Error getting localStorage keys:', error)
      return []
    }
  }

  /**
   * Gets all keys matching a filter function
   */
  getFilteredKeys(filter: (key: string) => boolean): string[] {
    return this.keys().filter(filter)
  }

  /**
   * Removes multiple keys from localStorage
   */
  removeItems(keys: string[]): void {
    keys.forEach(key => this.removeItem(key))
  }

  /**
   * Gets the number of items in localStorage
   */
  get length(): number {
    if (!this.checkAvailability()) {
      return 0
    }

    try {
      return window.localStorage.length
    } catch (error) {
      console.error('Error getting localStorage length:', error)
      return 0
    }
  }

  /**
   * Helper to get and parse JSON data
   */
  getJSON<T>(key: string, defaultValue: T | null = null): T | null {
    const value = this.getItem(key)
    if (!value) {
      return defaultValue
    }

    try {
      return JSON.parse(value) as T
    } catch (error) {
      console.error(`Error parsing JSON from localStorage (key: ${key}):`, error)
      return defaultValue
    }
  }

  /**
   * Helper to set JSON data
   */
  setJSON(key: string, value: any): boolean {
    try {
      return this.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Error stringifying JSON for localStorage (key: ${key}):`, error)
      return false
    }
  }
}

// Create singleton instance
const storageInstance = new SafeLocalStorage()

// Export as a function that returns the storage instance
export const safeLocalStorage = () => storageInstance