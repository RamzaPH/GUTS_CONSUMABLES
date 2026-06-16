import React, { useState } from "react"
import Button from "./Button"
import { formatLengthDisplay } from "../utils/inventory"

const CheckoutModal = ({
  isOpen,
  item,
  onClose,
  onSubmit
}) => {
  const [form, setForm] = useState({
    quantity: 1,
    unit: item?.unit || 'pcs/m',
    destination: "",
    notes: ""
  })

  const [lengthLabel, setLengthLabel] = useState("");
  const [lengthLabelCustom, setLengthLabelCustom] = useState("");
  const [pieces, setPieces] = useState("");

  if (!isOpen || !item) return null

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleLengthLabelChange = (value) => {
    setLengthLabel(value);
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = { ...form, lengthLabel, lengthLabelCustom, pieces, quantity: Number(form.quantity), unit: form.unit }
    if (payload.lengthLabel === '__other') payload.lengthLabel = payload.lengthLabelCustom || ''
    onSubmit(payload)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-3 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--brand-secondary-soft)] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--brand-secondary-soft)] px-4 py-4 sm:px-5">
          <h3 className="font-title text-lg font-bold text-[var(--brand-primary)]">Checkout Item</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100" aria-label="Close modal">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Item Name</span>
              <div className="rounded bg-slate-100 px-3 py-2 text-sm">{item.itemName}</div>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unit</span>
              <div className="rounded bg-slate-100 px-3 py-2 text-sm">{item.unit}</div>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</span>
              <div className="rounded bg-slate-100 px-3 py-2 text-sm">{item.status}</div>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Available</span>
              <div className="rounded bg-slate-100 px-3 py-2 text-sm">{formatLengthDisplay(item.quantity, item.unit)}</div>
            </div>
              <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</span>
              <div className="flex items-center gap-2">
                <input required min="1" max={item.quantity} type="number" value={form.quantity} onChange={e => handleChange("quantity", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-primary)]" />
                <select value={form.unit} onChange={e => handleChange('unit', e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                  <option value="pcs/m">pcs/m</option>
                  <option value="ft">ft</option>
                  <option value="in">in</option>
                </select>
              </div>
            </label>
            {Array.isArray(item?.stocks) && item.stocks.length > 0 && (
              <div className="mt-3 sm:col-span-2">
                <label className="block text-sm font-semibold text-slate-700">Length / Batch (optional)</label>
                <div className="mt-1 flex items-center gap-2">
                  <select value={lengthLabel} onChange={e => handleLengthLabelChange(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">-- Select length (or leave blank) --</option>
                    {item.stocks.map(s => (
                      <option key={s.id} value={s.lengthLabel}>{s.lengthLabel} — {s.quantity} pcs</option>
                    ))}
                    <option value="__other">Other (specify)</option>
                  </select>
                  {lengthLabel === '__other' && (
                    <input placeholder="e.g. 10ft" value={lengthLabelCustom} onChange={e => setLengthLabelCustom(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-48" />
                  )}
                </div>
                {lengthLabel && (
                  <div className="mt-2">
                    <label className="block text-sm font-semibold text-slate-700">Pieces *</label>
                    <input type="number" min="1" value={pieces} onChange={e => setPieces(e.target.value)} className="mt-1 w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  </div>
                )}
              </div>
            )}
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Destination</span>
              <input required value={form.destination} onChange={e => handleChange("destination", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-primary)]" placeholder="Where will this go?" />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes</span>
              <textarea value={form.notes} onChange={e => handleChange("notes", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-primary)]" placeholder="Optional notes..." />
            </label>
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--brand-secondary-soft)] pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">Checkout</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CheckoutModal
