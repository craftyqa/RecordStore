import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import itemsRouter from './items/router'

const app = express()
const port = process.env.PORT ?? 3001

app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? 'http://localhost:3000' }))
app.use(express.json())
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/items', itemsRouter)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' })
})

app.listen(port, () => {
  console.log(`Backend running on port ${port}`)
})
