import { combineReducers, configureStore } from '@reduxjs/toolkit'
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from 'redux-persist'
import { baseApi } from '@/api/baseApi'
import { AUTH_STORAGE_KEY, UI_STORAGE_KEY } from '@/lib/constants'
import authReducer from '@/features/auth/authSlice'
import { storage } from './storage'
import uiReducer from './uiSlice'

/** Only the session and UI preferences are persisted — domain data lives behind RTK Query. */
const persistedAuth = persistReducer({ key: AUTH_STORAGE_KEY, storage, whitelist: ['token', 'user'] }, authReducer)

const persistedUi = persistReducer(
  { key: UI_STORAGE_KEY, storage, whitelist: ['theme', 'language', 'sidebarCollapsed'] },
  uiReducer,
)

const rootReducer = combineReducers({
  auth: persistedAuth,
  ui: persistedUi,
  [baseApi.reducerPath]: baseApi.reducer,
})

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] },
    }).concat(baseApi.middleware),
  devTools: import.meta.env.DEV,
})

export const persistor = persistStore(store)

export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch
