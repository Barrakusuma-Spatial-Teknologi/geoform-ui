function isValidXYZ(url: string): boolean {
  const xyzPattern = /\{z\}.*\{x\}.*\{y\}/i
  return xyzPattern.test(url)
}

function isValidQuadkey(url: string): boolean {
  const quadkeyPattern = /\{quadkey\}/i
  return quadkeyPattern.test(url)
}

function isValidWMS(url: string): boolean {
  const wmsPattern = /SERVICE=WMS.*REQUEST=GetMap/i
  const hasValidParams = url.includes("LAYERS") && url.includes("STYLES") && url.includes("BBOX")
  return wmsPattern.test(url) && hasValidParams
}

export function isValidMaplibreTileUrl(url: string): boolean {
  return isValidXYZ(url) || isValidQuadkey(url) || isValidWMS(url)
}
