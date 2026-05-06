import Button from "./Button"

const RequestRejectionModal = ({ isOpen, request, rejectionReason, onClose }) => {
  if (!isOpen || !request) return null

  const details = [
    { label: "Request ID", value: request.requestId || request.id || "-" },
    { label: "Username", value: request.requesterUsername || request.requesterFullName || "-" },
    { label: "Item", value: request.itemName || request.consumableName || "-" },
    { label: "Request Type", value: request.requestType || "-" },
    { label: "Quantity", value: request.quantity ?? "-" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-600">Request Rejected</p>
            <h3 className="mt-1 text-xl font-bold text-slate-900">Rejection Details</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close rejection details"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="grid gap-3 sm:grid-cols-2">
            {details.map((detail) => (
              <div key={detail.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{detail.label}</p>
                <p className="mt-1 text-sm font-medium text-slate-900 break-words">{detail.value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Exact Reason</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-900">
              {rejectionReason?.trim() || "No rejection reason was provided."}
            </p>
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <Button type="button" onClick={onClose}>Close</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RequestRejectionModal