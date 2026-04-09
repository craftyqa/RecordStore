import { Router, Request, Response, NextFunction } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import * as repo from './repository'
import { createItemSchema, updateItemSchema, bulkPriceSchema } from './schema'
import { syncItemToDiscogs } from '../discogs/sync'

function isDuplicateKeyError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002'
}

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
    if (isDuplicateKeyError(err)) {
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
    const { version, ...fields } = updateItemSchema.parse(req.body)
    const count = await repo.updateWithVersion(req.params.id, version, fields)
    if (count === 0) {
      console.warn(`[concurrency] version conflict on item ${req.params.id}: client=${version} db=${existing.version}`)
      res.status(409).json({
        code: 'VERSION_CONFLICT',
        message: 'Item was modified by another request. Reload and try again.',
      })
      return
    }
    const item = await repo.getById(req.params.id)
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
    if (isDuplicateKeyError(err)) {
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
    // Sync errors are persisted to the item — return the updated item so the UI can show the error state.
    // Preserve the original error message in case the DB fetch also fails.
    const originalMessage = err instanceof Error ? err.message : 'Sync failed'
    const item = await repo.getById(req.params.id).catch(() => null)
    if (item?.discogs_sync_status === 'error') {
      res.status(422).json({
        code: 'SYNC_ERROR',
        message: item.discogs_sync_error ?? originalMessage,
        data: item,
      })
      return
    }
    next(err)
  }
})

export default router
