import { Router, Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import * as repo from './repository'
import { createItemSchema, updateItemSchema, bulkPriceSchema } from './schema'
import { syncItemToDiscogs } from '../discogs/sync'

const router = Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
    const items = await repo.list(page, limit)
    res.json({ data: items, page, limit })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await repo.getById(req.params.id)
    if (!item) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Item not found' })
      return
    }
    res.json({ data: item })
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createItemSchema.parse(req.body)
    const item = await repo.insert(body)
    res.status(201).json({ data: item })
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      })
      return
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ code: 'CONFLICT', message: 'An item with that discogs_id already exists' })
      return
    }
    next(err)
  }
})

router.patch('/prices/bulk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ids, price } = bulkPriceSchema.parse(req.body)
    const result = await repo.bulkUpdatePrice(ids, price)
    res.json({ count: result.count })
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      })
      return
    }
    next(err)
  }
})

router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await repo.getById(req.params.id)
    if (!existing) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Item not found' })
      return
    }
    const body = updateItemSchema.parse(req.body)
    const item = await repo.update(req.params.id, body)
    res.json({ data: item })
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      })
      return
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ code: 'CONFLICT', message: 'An item with that discogs_id already exists' })
      return
    }
    next(err)
  }
})

router.post('/:id/sync/discogs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await syncItemToDiscogs(req.params.id)
    const item = await repo.getById(req.params.id)
    res.json({ data: item })
  } catch (err) {
    // Sync errors are persisted to the item — return the updated item so the UI can show the error state
    const item = await repo.getById(req.params.id).catch(() => null)
    if (item?.discogs_sync_status === 'error') {
      res.status(422).json({
        code: 'SYNC_ERROR',
        message: item.discogs_sync_error ?? 'Sync failed',
        data: item,
      })
      return
    }
    next(err)
  }
})

export default router
