import { useSyncExternalStore } from 'react'

/** Subscribes to a CSS media query — used where a breakpoint must change behaviour, not just appearance. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined') return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches),
    () => false,
  )
}
