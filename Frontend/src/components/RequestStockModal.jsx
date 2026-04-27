import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { useToast } from "../context/ToastContext"
import { getTrainers } from "../api/authApi"
import api from "../api/axios"
const getDefaultPurpose = (type) => (type === "Stock In" ? "Replenishment" : "Training")

const RequestStockModal = ({
  isOpen,
  item,
  requestType = "Stock Out",
  onClose,
  onRequestSubmitted,
}) => {
  const { success, error: showError } = useToast()
  const [formData, setFormData] = useState({
    quantity: "",
    reason: "",
    course: "",
    trainer: "",
    purpose: getDefaultPurpose(requestType),
  })
  const [trainers, setTrainers] = useState([])
  const [loadingTrainers, setLoadingTrainers] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

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

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        quantity: "",
        reason: "",
        course: "",
        trainer: "",
        purpose: getDefaultPurpose(requestType),
      })
      setSubmitError("")
    }
  }, [isOpen, requestType])

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.quantity || parseInt(formData.quantity) < 1) {
      showError("Please enter a valid quantity.")
      return
    }

    if (!item) {
      showError("Item not found.")
      return
    }

    setSubmitError("")
    setIsSubmitting(true)
    try {
      const today = new Date().toISOString().split("T")[0]

      const response = await api.post('/requests', {
        consumableId: item.id,
        requestType,
        quantity: parseInt(formData.quantity, 10),
        reason: formData.reason || null,
        course: formData.course || null,
        trainer: formData.trainer || null,
        purpose: formData.purpose,
        startDate: today,
        endDate: today,
      })

      success("✓ Request submitted successfully! Administrators will review your request shortly.")

      if (onRequestSubmitted) {
        try {
          onRequestSubmitted(response.data.request)
        } catch (callbackError) {
          console.error("onRequestSubmitted callback error:", callbackError)
        }
      }

      onClose()
    } catch (error) {
      const message = error.response?.data?.error || "Failed to submit request."
      setSubmitError(message)
      showError(`${message} Please retry.`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-3 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-title text-xl font-bold text-[#800000] sm:text-2xl">
            {requestType === "Stock Out" ? "Request Stock Deduction" : "Request Stock Addition"}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Item Info */}
        {item && (
          <div className="mb-6 rounded-lg bg-slate-50 p-3 sm:p-4">
            <p className="text-sm text-slate-600">Item</p>
            <p className="font-semibold text-slate-800">{item.itemName}</p>
            <p className="text-xs text-slate-500 mt-1">
              Current Stock: <span className="font-semibold text-[#800000]">{item.quantityMain} {item.unit}</span>
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Quantity Requested *
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => handleChange("quantity", e.target.value)}
              placeholder={requestType === "Stock Out" ? "Enter quantity to deduct" : "Enter quantity to add"}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
              required
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Reason / Notes
            </label>
            <textarea
              value={formData.reason}
              onChange={(e) => handleChange("reason", e.target.value)}
              placeholder={requestType === "Stock Out" ? "Why should this stock be deducted from main inventory?" : "Why do you need this stock addition?"}
              rows="3"
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
            />
          </div>

          {/* Course */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Course
            </label>
            <input
              type="text"
              value={formData.course}
              onChange={(e) => handleChange("course", e.target.value)}
              placeholder="Enter course name"
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
            />
          </div>

          {/* Trainer */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Trainer
            </label>
            <select
              value={formData.trainer}
              onChange={(e) => handleChange("trainer", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
            >
              <option value="">Select a trainer</option>
              {loadingTrainers ? (
                <option disabled>Loading trainers...</option>
              ) : (
                trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.name}>
                    {trainer.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Purpose */}
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
              <option value="Replenishment">Replenishment</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-[#800000] px-4 py-2 font-semibold text-white hover:bg-[#660000] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : submitError ? "Retry Request" : "Submit Request"}
            </button>
          </div>

          {submitError && (
            <p className="text-sm text-red-600">
              Submit failed. Check your input or connection, then click Retry Request.
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export default RequestStockModal
