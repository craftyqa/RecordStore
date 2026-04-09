import { Prisma } from '@prisma/client'
import db from '../db'

export function list(page = 1, limit = 20) {
  const skip = (page - 1) * limit
  return db.item.findMany({
    skip,
    take: limit,
    orderBy: { created_at: 'desc' },
  })
}

export function getById(id: string) {
  return db.item.findUnique({ where: { id } })
}

export function insert(data: Prisma.ItemCreateInput) {
  return db.item.create({ data })
}

export function update(id: string, data: Prisma.ItemUpdateInput) {
  return db.item.update({ where: { id }, data })
}

export async function updateWithVersion(
  id: string,
  version: number,
  data: Prisma.ItemUpdateInput,
) {
  const result = await db.item.updateMany({
    where: { id, version },
    data: { ...data, version: { increment: 1 } },
  })
  return result.count // 0 = version mismatch or not found
}

export function bulkUpdatePrice(ids: string[], price: number) {
  return db.item.updateMany({
    where: { id: { in: ids } },
    data: { price, version: { increment: 1 } },
  })
}
