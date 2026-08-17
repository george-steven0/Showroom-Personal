import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Language } from '@/i18n/i18nConfig'

export type ThemeMode = 'light' | 'dark' | 'system'

interface UiState {
  theme: ThemeMode
  language: Language
  sidebarCollapsed: boolean
}

const initialState: UiState = {
  theme: 'light',
  language: 'en',
  sidebarCollapsed: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.theme = action.payload
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
    },
    setLanguage(state, action: PayloadAction<Language>) {
      state.language = action.payload
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload
    },
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
  },
})

export const { setTheme, toggleTheme, setLanguage, setSidebarCollapsed, toggleSidebar } = uiSlice.actions

export default uiSlice.reducer
