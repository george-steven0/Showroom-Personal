import type { TFunction } from 'i18next'

/**
 * Details a buying-bill car can be saved without (the papers may not be in yet) but should still get.
 * The backend stores a missing number as ''. Motor number is plainly optional, so it never counts as missing.
 */
export type MissingCarField = 'chassisNumber'

export function missingCarFields(car: { chassisNumber?: string | null }): MissingCarField[] {
  return (car.chassisNumber ?? '').trim() === '' ? ['chassisNumber'] : []
}

/** Human-readable list of what's missing on one car — feeds the "Missing info" tag tooltip. */
export function describeMissingForCar(car: { chassisNumber?: string | null }, t: TFunction): string[] {
  return missingCarFields(car).map((field) => t(`missingInfo.fields.${field}`))
}

/** What's missing across a bill's cars, e.g. "Car #2 (KYC V4): chassis number". */
export function describeMissingForBill(cars: { itemName: string; chassisNumber?: string | null }[], t: TFunction): string[] {
  return cars.flatMap((car, index) =>
    missingCarFields(car).map((field) => t('missingInfo.carField', { n: index + 1, item: car.itemName || '—', field: t(`missingInfo.fields.${field}`) })),
  )
}
