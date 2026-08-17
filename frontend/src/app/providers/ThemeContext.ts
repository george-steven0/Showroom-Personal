import { createContext, useContext } from 'react'

/** Resolved dark/light state, shared so charts can restyle with the theme. */
export const DarkModeContext = createContext(false)

export function useIsDark(): boolean {
  return useContext(DarkModeContext)
}
