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

  // Chỉ cho phép domain frontend thật — không dùng '*' trên production
  const allowedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000'
  app.enableCors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-api-key'],
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
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'x-api-key'],
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
