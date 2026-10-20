import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { InternalAccountsService } from './internal-accounts.service'
import { CreateInternalEntryDto } from './dto/create-internal-entry.dto'
import { UpdateInternalEntryDto } from './dto/update-internal-entry.dto'
import { InternalEntriesSummaryQueryDto, ListInternalEntriesQueryDto } from './dto/list-internal-entries-query.dto'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'

@Controller('internal-accounts')
export class InternalAccountsController {
  constructor(private readonly internalAccounts: InternalAccountsService) {}

  @Get('summary')
  summary(@Query() query: InternalEntriesSummaryQueryDto) {
    return this.internalAccounts.summary(query)
  }

  @Get()
  list(@Query() query: ListInternalEntriesQueryDto) {
    return this.internalAccounts.list(query)
  }

  @Post()
  create(@Body() dto: CreateInternalEntryDto, @CurrentUser() user: RequestUser) {
    return this.internalAccounts.create(dto, user)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInternalEntryDto, @CurrentUser() user: RequestUser) {
    return this.internalAccounts.update(id, dto, user)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.internalAccounts.remove(id)
  }
}
