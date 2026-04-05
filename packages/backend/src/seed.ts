import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const items = [
  {
    title: 'Miles Davis - Kind of Blue',
    quantity: 1,
    price: 24.99,
    media_condition: 'Very Good Plus (VG+)',
    sleeve_condition: 'Very Good (VG)',
    comments: 'Original pressing, plays perfectly',
    discogs_id: 'r388',
  },
  {
    title: 'John Coltrane - Blue Train',
    quantity: 1,
    price: 34.99,
    media_condition: 'Near Mint (NM or M-)',
    sleeve_condition: 'Very Good Plus (VG+)',
    comments: 'Blue Note repress, minimal surface noise',
    discogs_id: 'r249504',
  },
  {
    title: 'Fleetwood Mac - Rumours',
    quantity: 3,
    price: 18.99,
    media_condition: 'Very Good (VG)',
    sleeve_condition: 'Very Good (VG)',
    comments: 'Some light scratches, plays through',
    discogs_id: 'r529074',
  },
  {
    title: 'Michael Jackson - Thriller',
    quantity: 1,
    price: 29.99,
    media_condition: 'Very Good Plus (VG+)',
    sleeve_condition: 'Near Mint (NM or M-)',
    comments: 'Epic pressing, gatefold',
    discogs_id: 'r375403',
  },
  {
    title: 'Nirvana - Nevermind',
    quantity: 2,
    price: 22.99,
    media_condition: 'Very Good Plus (VG+)',
    sleeve_condition: 'Very Good Plus (VG+)',
    comments: '1991 DGC pressing',
    discogs_id: 'r26365',
  },
]

async function main() {
  console.log('Seeding...')

  await db.item.deleteMany()

  for (const item of items) {
    await db.item.create({ data: item })
  }

  console.log(`Seeded ${items.length} items.`)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
