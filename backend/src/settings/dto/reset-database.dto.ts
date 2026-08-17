import { Equals, IsString } from 'class-validator'

export const RESET_CONFIRMATION_PHRASE = 'DELETE ALL DATA'

export class ResetDatabaseDto {
  @IsString()
  @Equals(RESET_CONFIRMATION_PHRASE, { message: `Type "${RESET_CONFIRMATION_PHRASE}" exactly to confirm.` })
  confirmation!: string
}
