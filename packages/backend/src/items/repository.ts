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

export function bulkUpdatePrice(ids: string[], price: number) {
  return db.item.updateMany({
    where: { id: { in: ids } },
    data: { price },
  })
}
