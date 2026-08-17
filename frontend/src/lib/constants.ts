export const API_BASE = '/api'

export const AUTH_STORAGE_KEY = 'sr-auth'
export const UI_STORAGE_KEY = 'sr-ui'

export const DEFAULT_CURRENCY = 'EGP'

export const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100']
export const DEFAULT_PAGE_SIZE = 20

/** Pre-compression size guard on a logo upload. */
export const MAX_LOGO_UPLOAD_BYTES = 5 * 1024 * 1024

/** Must match backend/src/settings/dto/reset-database.dto.ts's RESET_CONFIRMATION_PHRASE — no shared package between the two, kept in sync by hand. */
export const RESET_CONFIRMATION_PHRASE = 'DELETE ALL DATA'
