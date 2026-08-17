import { createParamDecorator, type ExecutionContext } from '@nestjs/common'

/** Set by `JwtStrategy.validate()` — a fresh DB read, not raw JWT claims. */
export interface RequestUser {
  id: string
  username: string
  fullName: string
}

/** Pulls the authenticated user out of the request — every write stamps `createdBy`/`updatedBy` from this. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser => {
  const request = ctx.switchToHttp().getRequest()
  return request.user as RequestUser
})
