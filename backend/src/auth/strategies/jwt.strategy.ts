import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../../prisma/prisma.service'
import type { RequestUser } from '../../common/decorators/current-user.decorator'

interface JwtPayload {
  sub: string
  username: string
}

/** Re-reads the user from the database on every request rather than trusting the token's own claims. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    })
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) {
      throw new UnauthorizedException('Session is no longer valid')
    }
    return { id: user.id, username: user.username, fullName: user.fullName }
  }
}
