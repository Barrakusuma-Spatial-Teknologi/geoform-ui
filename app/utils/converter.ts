export function byteToMB(byte: number): number {
  return byte / 1024 / 1024
}

export function mbToByte(MB: number): number {
  return MB * 1024 * 1024
}
