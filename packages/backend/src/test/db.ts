import db from '../db'

export async function resetDb() {
  await db.item.deleteMany()
}
