import { customAlphabet } from "nanoid"

import { uuidv7 } from "uuidv7"

export function generateId(prefix?: string): string {
  const id = uuidv7()
  if (prefix == null) {
    return id
  }

  return `${prefix}__${id}`
}

// Define a character set safe for SQL column names (letters, numbers, and underscores)
const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_"
export const generateLighterId = customAlphabet(alphabet, 10) // Generate IDs with a length of 10
