import { BadRequestException } from '@nestjs/common'

export interface ConsignmentInput {
  isConsignment?: boolean
  consignmentTraderName?: string
  consignmentDate?: string
  consignmentAddress?: string
  consignmentPaidAmount?: number
  consignmentNotes?: string
}

/**
 * The consignment marker and its details always move together: turning it off wipes them, turning it on
 * requires a trader name. `isConsignment === undefined` means "leave it alone" (e.g. a plain item edit).
 */
export function consignmentData(input: ConsignmentInput) {
  if (input.isConsignment === undefined) return {}

  if (!input.isConsignment) {
    return {
      isConsignment: false,
      consignmentTraderName: null,
      consignmentDate: null,
      consignmentAddress: null,
      consignmentPaidAmount: null,
      consignmentNotes: null,
    }
  }

  const trader = input.consignmentTraderName?.trim()
  if (!trader) throw new BadRequestException('Trader name is required for a consignment car')

  return {
    isConsignment: true,
    consignmentTraderName: trader,
    consignmentDate: input.consignmentDate ? new Date(input.consignmentDate) : new Date(),
    consignmentAddress: input.consignmentAddress?.trim() || null,
    consignmentPaidAmount: input.consignmentPaidAmount ?? null,
    consignmentNotes: input.consignmentNotes?.trim() || null,
  }
}

/** Splits a DTO into its non-consignment fields and the Prisma-ready consignment columns. */
export function splitConsignment<T extends ConsignmentInput>(dto: T) {
  const { isConsignment, consignmentTraderName, consignmentDate, consignmentAddress, consignmentPaidAmount, consignmentNotes, ...rest } = dto
  return {
    rest,
    consignment: consignmentData({ isConsignment, consignmentTraderName, consignmentDate, consignmentAddress, consignmentPaidAmount, consignmentNotes }),
  }
}
