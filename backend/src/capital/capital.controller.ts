import { Body, Controller, Post } from '@nestjs/common'
import { CapitalService } from './capital.service'
import { InjectCapitalDto } from './dto/inject-capital.dto'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'

@Controller('capital')
export class CapitalController {
  constructor(private readonly capital: CapitalService) {}

  @Post('inject')
  inject(@Body() dto: InjectCapitalDto, @CurrentUser() user: RequestUser) {
    return this.capital.inject(dto, user)
  }
}
