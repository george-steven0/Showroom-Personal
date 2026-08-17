import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { Public } from '../common/decorators/public.decorator'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Get('me')
  me(@CurrentUser() user: RequestUser) {
    return this.authService.me(user.id)
  }
}
