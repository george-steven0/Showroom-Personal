import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/**
 * Opts a route out of the global `JwtAuthGuard`. Auth is deny-by-default across this API
 * so a new route added later is locked down unless deliberately marked open.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
