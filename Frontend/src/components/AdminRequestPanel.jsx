import { useState, useEffect, useCallback } from "react"
import { CheckCircle, XCircle, Clock, X, Image as ImageIcon } from "lucide-react"
import Button from "./Button"
import { useToast } from "../context/ToastContext"
import api from "../api/axios"

const AdminRequestPanel = ({ isOpen, onClose }) => {
  const { success, error: showError } = useToast()
  const [requests, setRequests] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [actionType, setActionType] = useState(null) // 'approve' or 'reject'
  const [actionNotes, setActionNotes] = useState("")
  const [isSubmittingAction, setIsSubmittingAction] = useState(false)
  const [activeTab, setActiveTab] = useState("pending")
  const [previewImage, setPreviewImage] = useState(null)

  // Fetch pending requests
  const fetchRequests = useCallback(async (page = 1, tab = activeTab) => {
    setLoading(true)
    try {
      const response = tab === 'history'
        ? await api.get('/requests/history', {
            params: { page, limit: 10 },
          })
        : await api.get('/requests', {
            params: { status: 'pending', page, limit: 10 },
          })
      setRequests(response.data.requests || [])
      setCurrentPage(page)
      setTotalPages(response.data.totalPages || 1)
    } catch (error) {
      console.error("Failed to fetch requests:", error)
      showError("Failed to load pending requests.")
    } finally {
      setLoading(false)
    }
  }, [activeTab, showError])

  useEffect(() => {
    if (isOpen) {
      fetchRequests(1, activeTab)
    }
  }, [isOpen, activeTab, fetchRequests])

  const handleApprove = async () => {
    if (!selectedRequest) return

    setIsSubmittingAction(true)
    try {
      await api.put(`/requests/${selectedRequest.id}/approve`, {
        notes: actionNotes || null,
      })

      success("✓ Request approved successfully!")
      setSelectedRequest(null)
      setActionType(null)
      setActionNotes("")
      fetchRequests(currentPage, activeTab)
    } catch (error) {
      showError(error.response?.data?.error || "Failed to approve request.")
    } finally {
      setIsSubmittingAction(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest || !actionNotes.trim()) {
      showError("Please enter a rejection reason.")
      return
    }

    setIsSubmittingAction(true)
    try {
      await api.put(`/requests/${selectedRequest.id}/reject`, {
        reason: actionNotes,
      })

      success("✓ Request rejected successfully!")
      setSelectedRequest(null)
      setActionType(null)
      setActionNotes("")
      fetchRequests(currentPage, activeTab)
    } catch (error) {
      showError(error.response?.data?.error || "Failed to reject request.")
    } finally {
      setIsSubmittingAction(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg my-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 sm:p-6">
          <div>
            <h2 className="font-title text-xl font-bold text-[#800000] sm:text-2xl">
              {activeTab === 'history' ? 'Request History' : 'Pending Stock Requests'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {requests.length} {activeTab === 'history' ? 'record' : 'pending request'}{requests.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        <div className="border-b border-slate-200 px-4 pt-3 sm:px-6">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('pending')
                setSelectedRequest(null)
                setActionType(null)
                setActionNotes("")
                fetchRequests(1, 'pending')
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'pending'
                  ? 'bg-white text-[#800000] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('history')
                setSelectedRequest(null)
                setActionType(null)
                setActionNotes("")
                fetchRequests(1, 'history')
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'history'
                  ? 'bg-white text-[#800000] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000]"></div>
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center">
              <Clock className="mx-auto h-12 w-12 text-slate-400 mb-3" />
              <p className="text-slate-600">No pending requests</p>
            </div>
          ) : (
            <>
              {/* Requests Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Item</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Staff Member</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Quantity</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Purpose</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-700">Evidence</th>
                      {activeTab === 'pending' && (
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">Action</th>
                      )}
                      {activeTab === 'history' && (
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => (
                      <tr key={request.id} className="border-t border-slate-200 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">
                            {request.consumable?.itemName || request.requestedItemName || 'Unknown Item'}
                          </div>
                          {request.requestType === 'New Consumable' && (
                            <p className="text-xs text-slate-500">
                              {request.requestedCategory || 'N/A'} • {request.requestedUnit || 'unit'}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {request.requestedBy?.fullName || request.requestedBy?.username}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            request.requestType === 'Stock In'
                              ? 'bg-emerald-100 text-emerald-700'
                              : request.requestType === 'Stock Out'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {request.requestType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-[#800000]">
                          {request.quantity}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {request.requestType === 'New Consumable'
                            ? (request.requestedLocation === 'annex' ? 'Training Inventory' : 'Main Inventory')
                            : (request.purpose || '—')}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {request.verificationImages?.length > 0 ? (
                            <button
                              onClick={() => {
                                setSelectedRequest(request)
                                setActionType(null)
                                setActionNotes("")
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#800000]/10 px-3 py-2 text-xs font-semibold text-[#800000] hover:bg-[#800000]/15"
                            >
                              <ImageIcon size={14} />
                              Images ({request.verificationImages.length})
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </td>
                        {activeTab === 'pending' && (
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedRequest(request)
                                setActionType(null)
                                setActionNotes("")
                              }}
                              className="text-[#800000] hover:underline font-semibold text-sm"
                            >
                              Review
                            </button>
                          </td>
                        )}
                        {activeTab === 'history' && (
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                              request.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {request.status}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <button
                    onClick={() => fetchRequests(1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-slate-300 text-sm disabled:opacity-50"
                  >
                    First
                  </button>
                  <button
                    onClick={() => fetchRequests(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-slate-300 text-sm disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => fetchRequests(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-slate-300 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => fetchRequests(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-slate-300 text-sm disabled:opacity-50"
                  >
                    Last
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Review Modal (when selectedRequest is set) */}
        {selectedRequest && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-3 sm:p-4">
            <div className="w-full max-w-md max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              {/* Header */}
              <div className="border-b border-slate-200 p-4 sm:p-6">
                <h3 className="font-title text-lg font-bold text-[#800000] sm:text-xl">
                  Review Request
                </h3>
              </div>

              {/* Content */}
              <div className="max-h-[calc(90vh-88px)] overflow-y-auto p-4 space-y-4 sm:p-6">
                <div className="rounded-lg bg-slate-50 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Item</p>
                    <p className="font-semibold text-slate-800">
                      {selectedRequest.consumable?.itemName || selectedRequest.requestedItemName || 'Unknown Item'}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Staff Member</p>
                      <p className="font-semibold text-slate-800">{selectedRequest.requestedBy?.username}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Type</p>
                      <p className="font-semibold text-slate-800">{selectedRequest.requestType}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Quantity</p>
                      <p className="text-lg font-bold text-[#800000]">{selectedRequest.quantity}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Purpose</p>
                      <p className="font-semibold text-slate-800">
                        {selectedRequest.requestType === 'New Consumable'
                          ? (selectedRequest.requestedLocation === 'annex' ? 'Training Inventory' : 'Main Inventory')
                          : (selectedRequest.purpose || '—')}
                      </p>
                    </div>
                  </div>
                  {selectedRequest.requestType === 'New Consumable' && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Category</p>
                        <p className="font-semibold text-slate-800">{selectedRequest.requestedCategory || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase">Unit / Reorder Level</p>
                        <p className="font-semibold text-slate-800">
                          {selectedRequest.requestedUnit || '—'} / {selectedRequest.requestedReorderLevel ?? '—'}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedRequest.reason && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase">Reason</p>
                      <p className="text-slate-700">{selectedRequest.reason}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase">Verification Images</p>
                    {selectedRequest.verificationImages?.length > 0 ? (
                      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {selectedRequest.verificationImages.map((image, index) => (
                          <button
                            key={`${image.fileName}-${index}`}
                            type="button"
                            onClick={() => setPreviewImage(image)}
                            className="overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:shadow"
                          >
                            <img src={image.dataUrl} alt={image.fileName} className="h-24 w-full object-cover" />
                            <div className="p-2">
                              <p className="truncate text-xs font-semibold text-slate-700">{image.fileName}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-slate-500">No verification images provided.</p>
                    )}
                  </div>
                </div>

                {activeTab === 'pending' && !actionType && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                    <button
                      onClick={() => setActionType('approve')}
                      className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                    >
                      <CheckCircle size={18} />
                      Approve
                    </button>
                    <button
                      onClick={() => setActionType('reject')}
                      className="flex items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100 border border-red-200 transition"
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                  </div>
                )}

                {activeTab === 'pending' && actionType && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        {actionType === 'approve' ? 'Approval Notes (optional)' : 'Rejection Reason (required)'}
                      </label>
                      <textarea
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                        placeholder={actionType === 'approve' ? 'Add any notes...' : 'Why are you rejecting this request?'}
                        rows="3"
                        className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                        required={actionType === 'reject'}
                      />
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
                      <button
                        onClick={() => {
                          setActionType(null)
                          setActionNotes("")
                        }}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-1"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={actionType === 'approve' ? handleApprove : handleReject}
                        disabled={isSubmittingAction || (actionType === 'reject' && !actionNotes.trim())}
                        className={`w-full rounded-lg px-4 py-2 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1 ${
                          actionType === 'approve'
                            ? 'bg-emerald-600 hover:bg-emerald-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        {isSubmittingAction ? 'Processing...' : (actionType === 'approve' ? 'Approve' : 'Reject')}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Close Button */}
              <div className="border-t border-slate-200 p-4">
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {previewImage && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Verification Image Preview</p>
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
              <img src={previewImage.dataUrl} alt={previewImage.fileName} className="max-h-[80vh] w-full object-contain bg-black" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminRequestPanel
