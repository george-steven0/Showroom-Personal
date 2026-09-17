import { OmitType } from '@nestjs/mapped-types'
import { CreateSellingBillDto } from './create-selling-bill.dto'

/** Everything except which car was sold — that's fixed at creation, see SellingBillsService#update. */
export class UpdateSellingBillDto extends OmitType(CreateSellingBillDto, ['purchaseLineId'] as const) {}
