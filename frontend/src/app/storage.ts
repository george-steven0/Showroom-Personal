import type { WebStorage } from 'redux-persist'

/**
 * Storage adapter for redux-persist. Not `redux-persist/lib/storage`: that
 * module is CommonJS, and under Vite's ESM interop its default export
 * arrives wrapped as `{ default: … }`, so redux-persist calls
 * `storage.getItem` on an object with no such method.
 */
function createWebStorage(): WebStorage {
  const available = (() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return false
      const probe = '__sr_probe__'
      window.localStorage.setItem(probe, probe)
      window.localStorage.removeItem(probe)
      return true
    } catch {
      return false
    }
  })()

  if (!available) {
    return {
      getItem: () => Promise.resolve(null),
      setItem: () => Promise.resolve(),
      removeItem: () => Promise.resolve(),
    }
  }

  return {
    getItem: (key) => {
      try {
        return Promise.resolve(window.localStorage.getItem(key))
      } catch {
        return Promise.resolve(null)
      }
    },
    setItem: (key, value) => {
      try {
        window.localStorage.setItem(key, value)
      } catch {
        // Quota exceeded — the session keeps working, it just will not persist.
      }
      return Promise.resolve()
    },
    removeItem: (key) => {
      try {
        window.localStorage.removeItem(key)
      } catch {
        // Nothing to clean up.
      }
      return Promise.resolve()
    },
  }
}

export const storage = createWebStorage()
