import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthUser, LoginResponse } from '@/types'

interface AuthState {
  token: string | null
  user: AuthUser | null
  /** Set when a request came back 401 so the login page can explain why. */
  expired: boolean
}

const initialState: AuthState = {
  token: null,
  user: null,
  expired: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    credentialsReceived(state, action: PayloadAction<LoginResponse>) {
      state.token = action.payload.token
      state.user = action.payload.user
      state.expired = false
    },
    signedOut(state) {
      state.token = null
      state.user = null
      state.expired = false
    },
    sessionExpired(state) {
      if (!state.token) return
      state.token = null
      state.user = null
      state.expired = true
    },
    expiryAcknowledged(state) {
      state.expired = false
    },
  },
})

export const { credentialsReceived, signedOut, sessionExpired, expiryAcknowledged } = authSlice.actions

export default authSlice.reducer
