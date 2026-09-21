import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { PurchaseBillsService } from './purchase-bills.service'
import { SettlePaymentDto } from './dto/settle-payment.dto'
import { SetConsignmentDto } from '../common/dto/set-consignment.dto'
import { CurrentUser, type RequestUser } from '../common/decorators/current-user.decorator'

/** `status=in_stock` is the only case this app needs — the selling-bill form's car picker. */
@Controller('purchase-bill-lines')
export class PurchaseLinesController {
  constructor(private readonly purchaseBills: PurchaseBillsService) {}

  @Get()
  listAvailable() {
    return this.purchaseBills.listAvailableLines()
  }

  @Patch(':id/consignment')
  setConsignment(@Param('id') id: string, @Body() dto: SetConsignmentDto) {
    return this.purchaseBills.setLineConsignment(id, dto)
  }

  @Post(':id/settle-payment')
  settlePayment(@Param('id') id: string, @Body() dto: SettlePaymentDto, @CurrentUser() user: RequestUser) {
    return this.purchaseBills.settlePayment(id, dto, user)
  }
}
