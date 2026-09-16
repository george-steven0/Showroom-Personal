import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { FollowUpService } from './follow-up.service'
import { CreateFollowUpClientDto } from './dto/create-follow-up-client.dto'
import { UpdateFollowUpClientDto } from './dto/update-follow-up-client.dto'
import { ListFollowUpClientsQueryDto } from './dto/list-follow-up-clients-query.dto'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'

@Controller('follow-up')
export class FollowUpController {
  constructor(private readonly followUp: FollowUpService) {}

  @Get()
  list(@Query() query: ListFollowUpClientsQueryDto) {
    return this.followUp.list(query)
  }

  @Post()
  create(@Body() dto: CreateFollowUpClientDto, @CurrentUser() user: RequestUser) {
    return this.followUp.create(dto, user)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFollowUpClientDto, @CurrentUser() user: RequestUser) {
    return this.followUp.update(id, dto, user)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.followUp.remove(id)
  }
}
