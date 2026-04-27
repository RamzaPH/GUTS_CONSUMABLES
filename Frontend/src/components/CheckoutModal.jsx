import React, { useState } from "react"
import Button from "./Button"

const CheckoutModal = ({
  isOpen,
  item,
  onClose,
  onSubmit
}) => {
  const [form, setForm] = useState({
    quantity: 1,
    destination: "",
    notes: ""
  })

  if (!isOpen || !item) return null

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...form,
      quantity: Number(form.quantity)
    })
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
              <div className="rounded bg-slate-100 px-3 py-2 text-sm">{item.quantity}</div>
            </div>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</span>
              <input required min="1" max={item.quantity} type="number" value={form.quantity} onChange={e => handleChange("quantity", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-primary)]" />
            </label>
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
