import { IsOptional, IsString } from 'class-validator'

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  systemName?: string

  @IsOptional()
  @IsString()
  systemNameAr?: string

  /** A base64 data URL (or null to clear it) — the frontend compresses and encodes the image client-side, never uploads a file. */
  @IsOptional()
  @IsString()
  logo?: string | null
}
