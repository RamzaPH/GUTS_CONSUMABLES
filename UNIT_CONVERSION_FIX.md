# Unit Conversion Fix - Double-Conversion Bug Resolution

## Problem
When user inputs "10 feet", the system was displaying "120 ft" instead of "10 ft" (or "120 in").

**Root Cause**: Double-conversion happening:
1. **Frontend** converted: 10 ft → 120 inches ✓
2. **Frontend sent** to API: `amount: 120, unit: 'ft'` ← Problem starts here
3. **Backend converted again**: 120 ft → 1440 inches ✗ (doubled!)

## Solution
Establish a **single conversion point** at the frontend:
- Frontend receives user input in their chosen unit (ft/in)
- Frontend **converts to inches** and sends only the `amount` field
- Backend **never converts** - it just stores the amount as-is
- Display functions **convert back** to human-readable format (inches → "X ft Y in")

---

## Fixed Code Blocks

### 1. Frontend: ItemDetailPage.jsx - handleAddStock

**Location**: [Frontend/src/pages/ItemDetailPage.jsx](Frontend/src/pages/ItemDetailPage.jsx#L71-L94)

```javascript
if (formData.lengthLabel) {
  // pieces * length-in-inches
  const { parseLengthLabelToInches } = await import('../utils/inventory')
  const pieceInches = parseLengthLabelToInches(formData.lengthLabel === '__other' ? formData.lengthLabelCustom || '' : formData.lengthLabel)
  const pieces = parseInt(formData.pieces, 10)
  if (Number.isNaN(pieces) || pieces <= 0 || !pieceInches) throw new Error('Invalid pieces or length label')
  finalAmount = pieces * pieceInches
  payload.lengthLabel = formData.lengthLabel === '__other' ? formData.lengthLabelCustom || '' : formData.lengthLabel
  payload.pieces = pieces
} else {
  const userUnit = String(formData.unit || item.unit || '').toLowerCase()
  const raw = Number.parseFloat(formData.quantity)
  finalAmount = userUnit === 'ft' ? Math.round(raw * 12) : Math.round(raw)
  // ✓ FIXED: Don't send unit field; amount is already converted to base unit (inches for length items)
}

await updateStock(item.id, { type: 'in', amount: finalAmount, ...payload })
```

**Key Change**: Removed `payload.unit = formData.unit` line. Amount is now the single source of truth.

---

### 2. Frontend: ItemDetailPage.jsx - handleDeductStock

**Location**: [Frontend/src/pages/ItemDetailPage.jsx](Frontend/src/pages/ItemDetailPage.jsx#L128-L146)

```javascript
if (formData.lengthLabel) {
  const { parseLengthLabelToInches } = await import('../utils/inventory')
  const pieceInches = parseLengthLabelToInches(formData.lengthLabel === '__other' ? formData.lengthLabelCustom || '' : formData.lengthLabel)
  const pieces = parseInt(formData.pieces, 10)
  if (Number.isNaN(pieces) || pieces <= 0 || !pieceInches) throw new Error('Invalid pieces or length label')
  finalAmount = pieces * pieceInches
  payload.lengthLabel = formData.lengthLabel === '__other' ? formData.lengthLabelCustom || '' : formData.lengthLabel
  payload.pieces = pieces
} else {
  const userUnit = String(formData.unit || item.unit || '').toLowerCase()
  const raw = Number.parseFloat(formData.quantity)
  finalAmount = userUnit === 'ft' ? Math.round(raw * 12) : Math.round(raw)
  // ✓ FIXED: Don't send unit field; amount is already converted to base unit (inches for length items)
}

await updateStock(item.id, { type: 'out', amount: finalAmount, ...payload })
```

**Key Change**: Same as above - removed `payload.unit = formData.unit`.

---

### 3. Backend: inventoryController.js - updateStock (non-length-labeled case)

**Location**: [Backend/controllers/inventoryController.js](Backend/controllers/inventoryController.js#L462-L473)

```javascript
} else {
  // ✓ FIXED: Amount is already converted by frontend to base unit (inches for length items).
  // No further conversion needed.
  const rawAmount = Number.parseFloat(amount)
  if (Number.isNaN(rawAmount) || rawAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number.' });
  }
  parsedAmount = rawAmount;
}
```

**Key Change**: 
- Removed: `const userUnit = String(unit || '').toLowerCase()`
- Removed: `parsedAmount = userUnit === 'ft' ? Math.round(rawAmount * 12) : Math.round(rawAmount)`
- Now just: `parsedAmount = rawAmount;` (trusts frontend's conversion)

---

### 4. Frontend: inventory.js - Display Functions (Already Correct)

**Location**: [Frontend/src/utils/inventory.js](Frontend/src/utils/inventory.js#L17-L24)

```javascript
const formatLength = (inches) => {
  const n = Number.isFinite(Number(inches)) ? Number(inches) : 0
  if (n <= 0) return '0'
  if (n < 12) return `${n} in`
  const ft = Math.floor(n / 12)
  const rem = n % 12
  return rem === 0 ? `${ft} ft` : `${ft} ft ${rem} in`
}

export const formatLengthDisplay = (quantity, unit) => {
  const normalizedUnit = String(unit || '').toLowerCase()
  if (!/ft|in/.test(normalizedUnit)) return String(quantity)
  const formatted = formatLength(quantity)
  return `${formatted} (${quantity} in)` // e.g., "10 ft (120 in)"
}
```

**How it works**:
- Input: `quantity = 120, unit = 'ft'`
- `formatLength(120)` → "10 ft" (since 120 ÷ 12 = 10)
- Output: **"10 ft (120 in)"** ✓

---

## Data Flow Example (Now Correct)

```
User Input: "10 ft"
    ↓
Frontend handleAddStock:
  userUnit = 'ft'
  raw = 10
  finalAmount = 10 * 12 = 120 (inches) ✓
  Send to API: { amount: 120, ... } (no unit field)
    ↓
Backend updateStock:
  amount = 120
  parsedAmount = 120 (NO conversion) ✓
  Store in DB: Consumable.quantityAnnex += 120
    ↓
Display in Modal:
  item.quantity = 120 (inches)
  item.unit = 'ft'
  formatLengthDisplay(120, 'ft')
    ↓ formatLength(120)
  = "10 ft"
  Final: "10 ft (120 in)" ✓
```

---

## Verification Checklist

- [x] Frontend converts user input (ft/in) to inches before sending
- [x] Frontend does NOT send `unit` field after converting
- [x] Backend receives `amount` in inches and does NOT convert again
- [x] Backend stores amount directly in `quantityAnnex` (for annex/training items)
- [x] Display functions convert inches back to human-readable (e.g., "10 ft")
- [x] Modal shows formatted display: "10 ft (120 in)"
- [x] Table shows formatted display using `quantityFormatted`

---

## Files Modified

1. **[Frontend/src/pages/ItemDetailPage.jsx](Frontend/src/pages/ItemDetailPage.jsx)** - Removed `payload.unit` assignment in both `handleAddStock` and `handleDeductStock`
2. **[Backend/controllers/inventoryController.js](Backend/controllers/inventoryController.js)** - Removed backend unit conversion logic
3. **[Frontend/src/utils/inventory.js](Frontend/src/utils/inventory.js)** - Already correct (no changes needed)
4. **Modal components** ([CheckoutModal.jsx](Frontend/src/components/CheckoutModal.jsx), [ComprehensiveItemModal.jsx](Frontend/src/components/ComprehensiveItemModal.jsx), [RequestStockModal.jsx](Frontend/src/components/RequestStockModal.jsx)) - Already using `formatLengthDisplay()` correctly
