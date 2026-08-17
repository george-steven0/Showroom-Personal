import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import type { LoginDto } from './dto/login.dto'
import type { RequestUser } from '../common/decorators/current-user.decorator'

export interface LoginResult {
  token: string
  user: RequestUser
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({ where: { username: dto.username.trim() } })

    // Same message whether the username doesn't exist or the password is wrong.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Incorrect username or password')
    }

    return {
      token: await this.jwt.signAsync({ sub: user.id, username: user.username }),
      user: { id: user.id, username: user.username, fullName: user.fullName },
    }
  }

  async me(userId: string): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new UnauthorizedException('Session is no longer valid')
    }
    return { id: user.id, username: user.username, fullName: user.fullName }
  }
}
