import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { ExpressAdapter } from '@nestjs/platform-express'
import * as express from 'express'

const server = express()
let isInitialized = false

export async function bootstrapNest() {
  if (isInitialized) return server

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server))

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  const checkCorsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true)
    const allowed = process.env.FRONTEND_URL
    if (
      origin === allowed ||
      origin.endsWith('.vercel.app') ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      return callback(null, true)
    }
    return callback(null, true)
  }

  app.enableCors({
    origin: checkCorsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Requested-With', 'Accept'],
    credentials: true,
  })

  await app.init()
  isInitialized = true
  return server
}

// Khởi chạy local ở môi trường dev hoặc chạy standalone trên Render
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  const port = process.env.PORT || 3001
  NestFactory.create(AppModule).then(async (app) => {
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    app.enableCors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return callback(null, true)
        if (
          origin === process.env.FRONTEND_URL ||
          origin.endsWith('.vercel.app') ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:')
        ) {
          return callback(null, true)
        }
        return callback(null, true)
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'X-Requested-With', 'Accept'],
      credentials: true,
    })
    await app.listen(port)
    console.log(`API đang chạy tại cổng ${port}`)
  })
}

// Export default handler phục vụ Vercel Serverless
export default async (req: any, res: any) => {
  await bootstrapNest()
  server(req, res)
}
