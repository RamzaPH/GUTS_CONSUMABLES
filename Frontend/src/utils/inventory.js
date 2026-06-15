const DEFAULT_LOW_STOCK_THRESHOLD = 10

const getThreshold = (item) =>
  Number.isFinite(Number(item?.reorderLevel))
    ? Number(item.reorderLevel)
    : DEFAULT_LOW_STOCK_THRESHOLD

export const getStockStatus = (quantity, reorderLevel = DEFAULT_LOW_STOCK_THRESHOLD) =>
  quantity <= reorderLevel ? "Low Stock" : "In Stock"

export const normalizeItems = (items = []) =>
  items.map((item) => {
    const unit = String(item.unit || '').toLowerCase()
    const isLength = /ft|in/.test(unit)

    const formatLength = (inches) => {
      const n = Number.isFinite(Number(inches)) ? Number(inches) : 0
      if (n <= 0) return '0'
      if (n < 12) return `${n} in`
      const ft = Math.floor(n / 12)
      const rem = n % 12
      return rem === 0 ? `${ft} ft` : `${ft} ft ${rem} in`
    }

    return {
      ...item,
      status: getStockStatus(item.quantity, getThreshold(item)),
      quantityFormatted: isLength ? formatLength(item.quantity) : String(item.quantity),
    }
  })

export const summarizeInventory = (inventoryMap) => {
  const tracks = Object.keys(inventoryMap)

  const totalsByTrack = tracks.map((track) => {
    const total = inventoryMap[track].reduce((sum, item) => sum + item.quantity, 0)
    return {
      track: track.toUpperCase(),
      total
    }
  })

  const grandTotal = totalsByTrack.reduce((sum, track) => sum + track.total, 0)

  return {
    totalsByTrack,
    grandTotal
  }
}

export const getLowStockItems = (inventoryMap) =>
  Object.entries(inventoryMap).flatMap(([track, items]) =>
    items
      .filter((item) => item.quantity <= getThreshold(item))
      .map((item) => ({
        ...item,
        track: track.toUpperCase(),
        status: "Low Stock"
      }))
  )
