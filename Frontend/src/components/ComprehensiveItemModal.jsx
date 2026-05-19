import { useState, useEffect } from "react"
import { X, TrendingUp, TrendingDown, Lock } from "lucide-react"
import Button from "./Button"
import { useToast } from "../context/ToastContext"
import { useAuth } from "../context/AuthContext"
import { useInventoryLocation } from "../context/InventoryLocationContext"
import { getTrainers } from "../api/authApi"

const ComprehensiveItemModal = ({
  isOpen,
  item,
  onClose,
  onAddStock,
  onDeductStock,
  action, // "add" or "deduct"
}) => {
  const { warning } = useToast()
  const { user } = useAuth()
  const { selectedInventory } = useInventoryLocation()
  
  // Check if staff is accessing main inventory (read-only)
  const isStaffAccessingMain = user?.role === 'staff' && selectedInventory === 'main'
  
  const [activeAction, setActiveAction] = useState(action || null)
  const [formData, setFormData] = useState({
    quantity: "",
    trainer: "",
    course: "",
    batch: "",
    notes: "",
    purpose: "Training",
    startDate: "",
    endDate: "",
  })
  const [trainers, setTrainers] = useState([])
  const [loadingTrainers, setLoadingTrainers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Static list of GUTS courses
  const courses = [
    { id: "eim-ncii", name: "EIM NCII" },
    { id: "smaw-nci", name: "SMAW NCI" },
    { id: "smaw-ncii", name: "SMAW NCII" },
    { id: "css-ncii", name: "CSS NCII" },
    { id: "driving-ncii", name: "DRIVING NCII" },
  ]

  // Fetch trainers on component mount
  useEffect(() => {
    const fetchTrainers = async () => {
      setLoadingTrainers(true)
      try {
        const data = await getTrainers()
        setTrainers(data.trainers || [])
      } catch (error) {
        console.error("Failed to fetch trainers:", error)
        setTrainers([])
      } finally {
        setLoadingTrainers(false)
      }
    }
    fetchTrainers()
  }, [])

  // Reset form when modal opens and set dates to today
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toISOString().split('T')[0]
      setActiveAction(action || null)
      setFormData({
        quantity: "",
        trainer: "",
        course: "",
        batch: "",
        notes: "",
        purpose: "Training",
        startDate: today,
        endDate: today,
      })
    }
  }, [isOpen, action])

  if (!isOpen || !item) return null

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleReset = () => {
    const today = new Date().toISOString().split('T')[0]
    setActiveAction(null)
    setFormData({
      quantity: "",
      trainer: "",
      course: "",
      batch: "",
      notes: "",
      purpose: "Training",
      startDate: today,
      endDate: today,
    })
  }

  const handleSubmit = (type) => {
    if (isSubmitting) return

    if (!formData.quantity) {
      warning('Please fill in Quantity field')
      return
    }

    setIsSubmitting(true)

    Promise.resolve().then(() => (
      type === "add"
        ? onAddStock({
            ...formData,
            quantity: parseInt(formData.quantity, 10),
          })
        : onDeductStock({
            ...formData,
            quantity: parseInt(formData.quantity, 10),
          })
    )).finally(() => {
      handleReset()
      setIsSubmitting(false)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--brand-secondary-soft)] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--brand-secondary-soft)] px-4 py-4 sm:px-6">
          <h2 className="font-title text-xl font-bold text-[var(--brand-primary)] sm:text-2xl">
            {item.itemName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
            {/* Item Info Card */}
            <div className="rounded-xl border border-[var(--brand-secondary-soft)] bg-gradient-to-r from-[#f8eef0] to-slate-50 p-4 sm:p-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Current Stock
                  </p>
                  <p className="mt-2 font-title text-xl font-bold text-slate-800 sm:text-2xl">
                    {item.quantity}
                  </p>
                  <p className="text-xs text-slate-600">{item.unit}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </p>
                  <div className="mt-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        item.status === "In Stock"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-[#fbe9ed] text-[#800000]"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Reorder Level
                  </p>
                  <p className="mt-2 font-title text-xl font-bold text-slate-800">
                    {item.reorderLevel}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Category
                  </p>
                  <p className="mt-2 inline-block rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
                    {item.category}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Section (When not showing form) */}
            {!activeAction && (
              <div className="rounded-xl border border-slate-200 p-4 sm:p-5">
                <h3 className="mb-4 font-title text-lg font-bold text-slate-800">
                  Stock Management
                </h3>
                {isStaffAccessingMain ? (
                  <div className="flex items-start gap-3 rounded-xl border-2 border-yellow-300 bg-yellow-50 p-4">
                    <Lock className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-semibold text-yellow-800">Read-Only Access</p>
                      <p className="text-sm text-yellow-700">Staff members can only modify training inventory. Contact an administrator to manage main inventory.</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setActiveAction("add")}
                      className="group flex min-h-20 items-center justify-center gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-4 transition hover:border-emerald-400 hover:bg-emerald-100 sm:px-5"
                    >
                      <TrendingUp className="h-5 w-5 text-emerald-600 transition group-hover:scale-110" />
                      <div className="text-left">
                        <p className="font-semibold text-emerald-700">Add Stock</p>
                        <p className="text-xs text-emerald-600">Increase quantity (Restock)</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveAction("deduct")}
                      className="group flex min-h-20 items-center justify-center gap-3 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-4 transition hover:border-red-400 hover:bg-red-100 sm:px-5"
                    >
                      <TrendingDown className="h-5 w-5 text-red-600 transition group-hover:scale-110" />
                      <div className="text-left">
                        <p className="font-semibold text-red-700">Deduct Stock</p>
                        <p className="text-xs text-red-600">Decrease quantity (Usage)</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Form Section */}
            {activeAction && (
              <div className={`rounded-xl border-2 p-4 sm:p-5 ${
                activeAction === "add"
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h3 className="font-title text-lg font-bold text-slate-800">
                    {activeAction === "add" ? "Add Stock" : "Deduct Stock"}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveAction(null)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    handleSubmit(activeAction)
                  }}
                  className="space-y-4"
                >
                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => handleChange("quantity", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Enter quantity"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                      required
                    />
                  </div>



                  {/* Purpose (For) - Training/Assessment for Deduct, Replenishment for Add */}
                  {activeAction === "add" && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        Purpose
                      </label>
                      <select
                        value={formData.purpose}
                        onChange={(e) => handleChange("purpose", e.target.value)}
                        disabled={isSubmitting}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                      >
                        <option value="Replenishment">Replenishment</option>
                      </select>
                    </div>
                  )}

                  {activeAction === "deduct" && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700">
                        Purpose
                      </label>
                      <select
                        value={formData.purpose}
                        onChange={(e) => handleChange("purpose", e.target.value)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                      >
                        <option value="Training">Training</option>
                        <option value="Assessment">Assessment</option>
                      </select>
                    </div>
                  )}

                  {/* Trainer */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Trainer
                    </label>
                    <select
                      value={formData.trainer}
                      onChange={(e) => handleChange("trainer", e.target.value)}
                      disabled={loadingTrainers || isSubmitting}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {loadingTrainers ? "Loading trainers..." : "Select a trainer"}
                      </option>
                      {trainers.map((trainer) => (
                        <option key={trainer.id} value={trainer.name}>
                          {trainer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Course */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Course
                    </label>
                    <select
                      value={formData.course}
                      onChange={(e) => handleChange("course", e.target.value)}
                      disabled={isSubmitting}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                    >
                      <option value="">Select a course</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Batch */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Batch
                    </label>
                    <input
                      type="text"
                      value={formData.batch}
                      onChange={(e) => handleChange("batch", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Enter batch (optional)"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                    />
                  </div>



                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleChange("notes", e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Enter any additional notes"
                      rows="3"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:gap-3">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className={`w-full sm:flex-1 ${
                        activeAction === "add"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-red-600 hover:bg-red-700"
                      }`}
                    >
                      {isSubmitting ? "Submitting..." : (activeAction === "add" ? "Add Stock" : "Deduct Stock")}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleReset}
                      variant="secondary"
                      className="w-full sm:flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-4 py-4 sm:px-6">
          <Button onClick={onClose} variant="secondary">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ComprehensiveItemModal
