import { resetDb } from './db'

beforeEach(async () => {
  await resetDb()
})
