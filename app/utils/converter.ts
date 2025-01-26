export function byteToMB(byte: number): number {
  return byte / 1024 / 1024
}

export function mbToByte(MB: number): number {
  return MB * 1024 * 1024
}

export function prettifyBytes(bytes: number, decimalPlaces = 2): string {
  if (bytes === 0) {
    return "0 Bytes"
  }

  const units = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  const size = Number.parseFloat((bytes / k ** i).toFixed(decimalPlaces))
  return `${size} ${units[i]}`
}
