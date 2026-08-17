import { CreatePurchaseBillDto } from './create-purchase-bill.dto'

/** Full replace, not a partial patch — see `PurchaseBillsService#update`. */
export class UpdatePurchaseBillDto extends CreatePurchaseBillDto {}
