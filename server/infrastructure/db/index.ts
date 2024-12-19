import type { LibSQLDatabase } from "drizzle-orm/libsql"
import type * as schema from "./schema"

const config = useRuntimeConfig()

export function createDb(url: string) {
  // consola.info(`connecting to ${url}`)
  // const db = drizzle(url, {
  //   schema,
  // })
  // consola.info("connected")
  //
  // return {
  //   db,
  //   // client,
  // }
}

const db = createDb(config.databaseUrl)
export const useDb = () => db.db

export type AppDatabase = LibSQLDatabase<typeof schema>
