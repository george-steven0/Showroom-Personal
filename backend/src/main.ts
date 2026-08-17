import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)

  // Every DTO field must be declared and validated — an unexpected field
  // in the body is rejected outright, and primitive strings from JSON are
  // coerced to the types the DTOs declare.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  app.useGlobalFilters(new AllExceptionsFilter())

  // frontend/src/lib/constants.ts's API_BASE is a hardcoded '/api'. /health
  // sits outside the prefix so a process-monitoring script doesn't need to
  // know it either.
  app.setGlobalPrefix('api', { exclude: ['health'] })

  const origins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  // Only matters in development — production serves the built frontend
  // from this same process, so browser requests are same-origin.
  app.enableCors({ origin: origins.length > 0 ? origins : false, credentials: true })

  const port = config.get<number>('PORT') ?? 3000
  await app.listen(port)

  // eslint-disable-next-line no-console
  console.log(`Showroom API listening on http://localhost:${port}`)
}

void bootstrap()
