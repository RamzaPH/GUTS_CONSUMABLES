import { useState } from "react"
import { X, Package, ShoppingCart, TrendingUp, TrendingDown, Lock } from "lucide-react"
import Button from "./Button"
import { useAuth } from "../context/AuthContext"
import { useInventoryLocation } from "../context/InventoryLocationContext"

const ItemDetailsModal = ({
  isOpen,
  item,
  onClose,
  onPurchaseHistory,
  onConsumptionHistory
}) => {
  const { user } = useAuth()
  const { selectedInventory } = useInventoryLocation()
  const [activeAction, setActiveAction] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    quantity: 1,
    performedBy: "",
    destination: "",
    notes: ""
  })

  if (!isOpen || !item) return null

  // Check if staff user trying to access main inventory
  const isStaffAccessingMain = user?.role === 'staff' && selectedInventory === 'main'

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleReset = () => {
    setActiveAction(null)
    setFormData({
      quantity: 1,
      performedBy: "",
      destination: "",
      notes: ""
    })
  }

  const handleSubmit = (type) => {
    if (isSubmitting) return

    setIsSubmitting(true)
    const submitPromise = Promise.resolve().then(() => {
      if (type === "purchase") {
        return onPurchaseHistory({
          ...formData,
          quantity: Number(formData.quantity)
        })
      }

      return onConsumptionHistory({
        ...formData,
        quantity: Number(formData.quantity)
      })
    })

    submitPromise.finally(() => {
      handleReset()
      setIsSubmitting(false)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--brand-secondary-soft)] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--brand-secondary-soft)] px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <h3 className="font-title text-lg font-bold text-[var(--brand-primary)] sm:text-xl">{item.itemName}</h3>
            <p className="mt-1 text-sm text-slate-500">Manage stock and track inventory movements</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-72px)] overflow-y-auto p-4 sm:p-6">
          {/* Item Details Card */}
          <div className="mb-6 rounded-xl border border-[var(--brand-secondary-soft)] bg-gradient-to-r from-[#f8eef0] to-slate-50 p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Stock</p>
                <p className="mt-2 font-title text-xl font-bold text-slate-800 sm:text-2xl">{item.quantity}</p>
                <p className="text-xs text-slate-600 mt-1">{item.unit}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                <div className="mt-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    item.status === "In Stock" 
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-[#fbe9ed] text-[#800000]"
                  }`}>
                    {item.status}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reorder Level</p>
                <p className="mt-2 font-title text-xl font-bold text-slate-800">{item.reorderLevel}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</p>
                <p className="mt-2 font-semibold text-slate-700 inline-block px-3 py-1 rounded-full bg-slate-100">
                  {item.category}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons or Read-Only Message */}
          {!activeAction && (
            <>
              {isStaffAccessingMain ? (
                <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 p-4 mb-6 flex items-center gap-3">
                  <Lock className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-semibold text-yellow-800">Read-Only Access</p>
                    <p className="text-sm text-yellow-700">Staff members can only modify training inventory. Contact an administrator to manage main inventory.</p>
                  </div>
                </div>
              ) : (
                <div className="mb-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setActiveAction("purchase")}
                    className="group flex min-h-20 items-center justify-center gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-4 transition hover:border-emerald-400 hover:bg-emerald-100 sm:px-5"
                  >
                    <TrendingUp className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition" />
                    <div className="text-left">
                      <p className="font-semibold text-emerald-700">Add Stock</p>
                      <p className="text-xs text-emerald-600">Increase quantity (Restock)</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveAction("consumption")}
                    className="group flex min-h-20 items-center justify-center gap-3 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-4 transition hover:border-red-400 hover:bg-red-100 sm:px-5"
                  >
                    <TrendingDown className="h-5 w-5 text-red-600 group-hover:scale-110 transition" />
                    <div className="text-left">
                      <p className="font-semibold text-red-700">Deduct Stock</p>
                      <p className="text-xs text-red-600">Decrease quantity (Usage)</p>
                    </div>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Form Section */}
          {activeAction && (
            <form onSubmit={(e) => {
              e.preventDefault()
              handleSubmit(activeAction)
            }} className="space-y-4 border-t border-slate-200 pt-6">
              <div className={`flex items-center gap-2 rounded-lg px-4 py-3 ${
                activeAction === "purchase"
                  ? "bg-emerald-50 border border-emerald-200"
                  : "bg-red-50 border border-red-200"
              }`}>
                {activeAction === "purchase" ? (
                  <>
                    <ShoppingCart className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-medium text-emerald-700">Adding Stock to Inventory</p>
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 text-red-600" />
                    <p className="text-sm font-medium text-red-700">Deducting Stock from Inventory</p>
                  </>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity to {activeAction === "purchase" ? "Add" : "Deduct"}</span>
                  <input
                    required
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => handleChange("quantity", e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                    placeholder="Enter quantity"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Performed By</span>
                  <input
                    required
                    type="text"
                    value={formData.performedBy}
                    onChange={(e) => handleChange("performedBy", e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                    placeholder="Your name"
                  />
                </label>

                {activeAction === "consumption" && (
                  <label className="space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Usage/Destination</span>
                    <input
                      required
                      type="text"
                      value={formData.destination}
                      onChange={(e) => handleChange("destination", e.target.value)}
                      disabled={isSubmitting}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                      placeholder="Where/how used"
                    />
                  </label>
                )}

                <label className="space-y-1 sm:col-span-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notes (Optional)</span>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    disabled={isSubmitting}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-[var(--brand-primary)]"
                    placeholder="Optional notes..."
                    rows="2"
                  />
                </label>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveAction(null)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={activeAction === "purchase" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}
                >
                  {isSubmitting ? "Submitting..." : (activeAction === "purchase" ? "Confirm Add Stock" : "Confirm Deduct Stock")}
                </Button>
              </div>
            </form>
          )}

          {/* Close Button */}
          {!activeAction && (
            <div className="flex justify-end border-t border-slate-200 pt-4">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ItemDetailsModal
