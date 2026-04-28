import { useState, useEffect } from "react"
import { X, Upload, Image as ImageIcon } from "lucide-react"
import { useToast } from "../context/ToastContext"
import { getTrainers } from "../api/authApi"
import { submitRequest } from "../api/requestApi"
const getDefaultPurpose = (type) => (type === "Stock In" ? "Replenishment" : "Training")

const MAX_VERIFICATION_IMAGES = 5
const MAX_VERIFICATION_IMAGE_BYTES = 2 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"])

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
  reader.readAsDataURL(file)
})

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
  const [verificationImages, setVerificationImages] = useState([])
  const [imageError, setImageError] = useState("")
  const [previewImage, setPreviewImage] = useState(null)

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
      setImageError("")
      setVerificationImages([])
      setPreviewImage(null)
    }
  }, [isOpen, requestType])

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleImageSelection = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ""

    if (files.length === 0) return

    const remainingSlots = MAX_VERIFICATION_IMAGES - verificationImages.length
    if (remainingSlots <= 0) {
      const message = `You can upload up to ${MAX_VERIFICATION_IMAGES} images.`
      setImageError(message)
      showError(message)
      return
    }

    if (files.length > remainingSlots) {
      const message = `Only ${remainingSlots} more image${remainingSlots !== 1 ? "s" : ""} can be added.`
      setImageError(message)
      showError(message)
      return
    }

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        const message = `${file.name} is not a supported image type.`
        setImageError(message)
        showError(message)
        return
      }

      if (file.size > MAX_VERIFICATION_IMAGE_BYTES) {
        const message = `${file.name} exceeds the 2MB limit.`
        setImageError(message)
        showError(message)
        return
      }
    }

    try {
      const nextImages = await Promise.all(files.map(async (file) => ({
        fileName: file.name,
        fileType: file.type,
        size: file.size,
        dataUrl: await readFileAsDataUrl(file),
        uploadedAt: new Date().toISOString(),
      })))

      setVerificationImages(prev => [...prev, ...nextImages])
      setImageError("")
    } catch (error) {
      const message = error.message || "Failed to load selected images."
      setImageError(message)
      showError(message)
    }
  }

  const removeImage = (index) => {
    setVerificationImages(prev => prev.filter((_, imageIndex) => imageIndex !== index))
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

    if (verificationImages.length > MAX_VERIFICATION_IMAGES) {
      const message = `You can upload up to ${MAX_VERIFICATION_IMAGES} images.`
      setImageError(message)
      showError(message)
      return
    }

    setSubmitError("")
    setIsSubmitting(true)
    try {
      const today = new Date().toISOString().split("T")[0]

      const response = await submitRequest({
        consumableId: item.id,
        requestType,
        quantity: parseInt(formData.quantity, 10),
        reason: formData.reason || null,
        course: formData.course || null,
        trainer: formData.trainer || null,
        purpose: formData.purpose,
        startDate: today,
        endDate: today,
        verificationImages,
      })

      success("✓ Request submitted successfully! Administrators will review your request shortly.")

      if (onRequestSubmitted) {
        try {
          onRequestSubmitted(response.request)
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

          {/* Verification Images */}
          <div>
            <label className="block text-sm font-semibold text-slate-700">
              Verification Images (Optional)
            </label>
            <div className="mt-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-[#800000]/10 p-2 text-[#800000]">
                    <Upload size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Upload index card photos</p>
                    <p className="text-xs text-slate-500">Up to {MAX_VERIFICATION_IMAGES} images, 2MB each.</p>
                  </div>
                </div>
                <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#800000] ring-1 ring-inset ring-[#800000]/20 transition hover:bg-[#fff7f8]">
                  Choose Images
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelection}
                    capture="environment"
                  />
                </label>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <ImageIcon size={16} />
                <span>{verificationImages.length} / {MAX_VERIFICATION_IMAGES} images selected</span>
              </div>

              {imageError && (
                <p className="mt-3 text-sm text-red-600">{imageError}</p>
              )}

              {verificationImages.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {verificationImages.map((image, index) => (
                    <div key={`${image.fileName}-${index}`} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() => setPreviewImage(image)}
                        className="block w-full"
                      >
                        <img
                          src={image.dataUrl}
                          alt={image.fileName}
                          className="h-28 w-full object-cover"
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white opacity-100 transition group-hover:bg-black"
                        aria-label={`Remove ${image.fileName}`}
                      >
                        <X size={14} />
                      </button>
                      <div className="p-2">
                        <p className="truncate text-xs font-semibold text-slate-700">{image.fileName}</p>
                        <p className="text-[11px] text-slate-500">{Math.round(image.size / 1024)} KB</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

        {previewImage && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-4">
            <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Preview Image</p>
                  <p className="text-xs text-slate-500">{previewImage.fileName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <img src={previewImage.dataUrl} alt={previewImage.fileName} className="max-h-[75vh] w-full object-contain bg-black" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RequestStockModal
