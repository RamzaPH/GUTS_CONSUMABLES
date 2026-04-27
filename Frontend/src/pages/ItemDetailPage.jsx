import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChevronLeft, RefreshCw, Lock } from "lucide-react"
import Button from "../components/Button"
import { getInventoryByTrack } from "../api/inventoryApi"
import { getHistoryLogs, recalculateInventoryHistory } from "../api/historyApi"
import { updateStock } from "../api/inventoryCrudApi"
import { normalizeItems } from "../utils/inventory"
import { useInventoryLocation } from "../context/InventoryLocationContext"
import { useToast } from "../context/ToastContext"
import { useAuth } from "../context/AuthContext"
import ComprehensiveItemModal from "../components/ComprehensiveItemModal"
import RequestStockModal from "../components/RequestStockModal"

const ItemDetailPage = () => {
  const { success, error: showError } = useToast()
  const { track, itemId } = useParams()
  const navigate = useNavigate()
  const { selectedInventory } = useInventoryLocation()
  const { user } = useAuth()
  
  // Check if staff is accessing main inventory (read-only)
  const isStaffAccessingMain = user?.role === 'staff' && selectedInventory === 'main'
  
  const [item, setItem] = useState(null)
  const [itemHistory, setItemHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState(null) // "add" or "deduct"
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [requestModalType, setRequestModalType] = useState("Stock Out")
  const [pendingRequestSummary, setPendingRequestSummary] = useState(null)
  const [purposeFilter, setPurposeFilter] = useState('All')
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const loadItemDetails = async () => {
      setIsLoading(true)
      try {
        // Fetch inventory for the track
        const inventory = await getInventoryByTrack(track, selectedInventory)
        const items = normalizeItems(inventory)
        
        // Find the specific item
        const selectedItem = items.find(i => String(i.id) === String(itemId))
        setItem(selectedItem)

        // Fetch history for this item
        const logs = await getHistoryLogs({ itemId })
        setItemHistory(logs || [])
      } catch (error) {
        console.error("Failed to load item details:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadItemDetails()
  }, [track, itemId, selectedInventory])

  const handleAddStock = async (formData) => {
    if (!item) return
    
    try {
      await updateStock(item.id, {
        type: "in",
        amount: parseInt(formData.quantity, 10),
        description: formData.notes,
        course: formData.course,
        trainer: formData.trainer,
        purpose: formData.purpose,
        location: selectedInventory,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      })
      
      // Reload item details
      const inventory = await getInventoryByTrack(track, selectedInventory)
      const items = normalizeItems(inventory)
      const updatedItem = items.find(i => i.id === item.id)
      setItem(updatedItem)
      
      const logs = await getHistoryLogs({ itemId: item.id })
      setItemHistory(logs || [])
      
      setIsModalOpen(false)
      setModalAction(null)
      success("Stock added successfully!")
    } catch (error) {
      showError(error.response?.data?.error || "Failed to add stock.")
    }
  }

  const handleDeductStock = async (formData) => {
    if (!item) return
    
    try {
      await updateStock(item.id, {
        type: "out",
        amount: parseInt(formData.quantity, 10),
        description: formData.notes,
        course: formData.course,
        trainer: formData.trainer,
        purpose: formData.purpose,
        location: selectedInventory,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
      })
      
      // Reload item details
      const inventory = await getInventoryByTrack(track, selectedInventory)
      const items = normalizeItems(inventory)
      const updatedItem = items.find(i => i.id === item.id)
      setItem(updatedItem)
      
      const logs = await getHistoryLogs({ itemId: item.id })
      setItemHistory(logs || [])
      
      setIsModalOpen(false)
      setModalAction(null)
      success("Stock deducted successfully!")
    } catch (error) {
      showError(error.response?.data?.error || "Failed to deduct stock.")
    }
  }

  const openModal = (action) => {
    setModalAction(action)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setModalAction(null)
  }

  // Filter history by purpose
  const filteredHistory = purposeFilter === 'All'
    ? itemHistory
    : itemHistory.filter(h => h.purpose === purposeFilter)
  
  const handlePurposeChange = (newPurpose) => {
    setPurposeFilter(newPurpose)
  }

  const handleSyncInventory = async () => {
    if (!item) return
    
    setIsSyncing(true)
    try {
      const result = await recalculateInventoryHistory(item.id, selectedInventory)
      
      // Reload item details
      const inventory = await getInventoryByTrack(track, selectedInventory)
      const items = normalizeItems(inventory)
      const updatedItem = items.find(i => i.id === item.id)
      setItem(updatedItem)
      
      // Reload history
      const logs = await getHistoryLogs({ itemId: item.id })
      setItemHistory(logs || [])
      
      success(`✓ Inventory synced!\n📦 Current stock: ${result.finalQuantity} units\n📊 Updated ${result.recordsUpdated} records`)
    } catch (error) {
      showError(error.response?.data?.error || "Failed to sync inventory history.")
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-[#800000] hover:text-[#660000] font-semibold"
        >
          <ChevronLeft size={20} />
          Back
        </button>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          Item not found.
        </div>
      </div>
    )
  }

  const trackLabel = track.toUpperCase()

  // Filter history by action type AND location
  const purchaseHistory = itemHistory?.filter(h => 
    h.actionType === "Stock In" && h.location === selectedInventory
  ) || []
  const consumptionHistory = itemHistory?.filter(h => 
    h.actionType === "Stock Out" && h.location === selectedInventory
  ) || []
  const allHistory = [...itemHistory].filter(h => h.location === selectedInventory).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const filteredByAction = allHistory
  const filteredByPurpose = purposeFilter === 'All'
    ? filteredByAction
    : filteredByAction.filter(h => h.purpose === purposeFilter)
  const recentHistory = filteredByPurpose.slice(0, 5)

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 font-semibold text-[#800000] transition hover:text-[#660000]"
      >
        <ChevronLeft size={20} />
        Back to {trackLabel}
      </button>

      {/* Item Summary Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h1 className="font-title mb-4 text-2xl font-bold text-[#800000] sm:text-3xl">{item.itemName}</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Category</p>
            <p className="mt-1 font-semibold text-slate-800">{item.category}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Unit</p>
            <p className="mt-1 font-semibold text-slate-800">{item.unit}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Current Stock</p>
            <p className="mt-2 font-title text-xl font-bold text-[#800000] sm:text-2xl">{item.quantity}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Reorder Level</p>
            <p className="mt-1 font-semibold text-slate-800">{item.reorderLevel}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
            <p className="mt-2">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                item.quantity >= item.reorderLevel 
                  ? "bg-emerald-100 text-emerald-700" 
                  : "bg-red-100 text-red-700"
              }`}>
                {item.quantity >= item.reorderLevel ? "In Stock" : "Low Stock"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Add/Deduct Stock Buttons */}
      {isStaffAccessingMain ? (
        <div className="space-y-3">
          {pendingRequestSummary && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
              <p className="text-sm font-bold text-amber-800">Pending Admin Approval</p>
              <p className="mt-1 text-sm text-amber-700">
                Requested {pendingRequestSummary.requestType === 'Stock In' ? 'addition' : 'deduction'} of {pendingRequestSummary.quantity} {item.unit}
                {pendingRequestSummary.quantity > 1 ? 's' : ''} for {pendingRequestSummary.itemName}.
              </p>
              <p className="mt-1 text-xs text-amber-700">
                Submitted on {new Date(pendingRequestSummary.createdAt).toLocaleString("en-PH")}.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => {
                setRequestModalType('Stock In')
                setIsRequestModalOpen(true)
              }}
              className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-100 sm:p-6"
            >
              <h3 className="mb-2 text-base font-bold text-emerald-700 sm:text-lg">Request Stock Addition</h3>
              <p className="text-sm text-emerald-600">Ask admin to approve adding stock to main inventory</p>
            </button>
            <button
              onClick={() => {
                setRequestModalType('Stock Out')
                setIsRequestModalOpen(true)
              }}
              className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 text-left transition hover:border-blue-400 hover:bg-blue-100 sm:p-6"
            >
              <h3 className="mb-2 text-base font-bold text-blue-700 sm:text-lg">Request Stock Deduction</h3>
              <p className="text-sm text-blue-600">Ask admin to approve deducting stock from main inventory</p>
            </button>
            <button
              onClick={handleSyncInventory}
              disabled={isSyncing}
              className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:p-6"
            >
              <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-slate-700 sm:text-lg">
                <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
                Sync Inventory
              </h3>
              <p className="text-sm text-slate-600">Recalculate ending inventory</p>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => openModal("add")}
            className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-100 sm:p-6"
          >
            <h3 className="mb-2 text-base font-bold text-emerald-700 sm:text-lg"> Add Stock</h3>
            <p className="text-sm text-emerald-600">Increase inventory quantity</p>
          </button>
          <button
            onClick={() => openModal("deduct")}
            className="rounded-2xl border-2 border-red-200 bg-red-50 p-4 text-left transition hover:border-red-400 hover:bg-red-100 sm:p-6"
          >
            <h3 className="mb-2 text-base font-bold text-red-700 sm:text-lg"> Deduct Stock</h3>
            <p className="text-sm text-red-600">Decrease inventory quantity</p>
          </button>
          <button
            onClick={handleSyncInventory}
            disabled={isSyncing}
            className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-4 text-left transition hover:border-blue-400 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:p-6"
          >
            <h3 className="mb-2 flex items-center gap-2 text-base font-bold text-blue-700 sm:text-lg">
              <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
              Sync Inventory
            </h3>
            <p className="text-sm text-blue-600">Recalculate ending inventory</p>
          </button>
        </div>
      )}

      {/* History Section */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {/* Clickable History Header */}
        <button
          onClick={() => navigate(`/history/${track}/${itemId}`)}
          className="w-full border-b border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100 sm:px-6"
        >
          <h2 className="text-lg font-semibold text-[#800000] cursor-pointer hover:underline">
            History ({allHistory.length}) 
          </h2>
          <p className="text-xs text-slate-500 mt-1">Click to view full history with pagination</p>
        </button>

        {/* History Table - Limited to 5 rows */}
        <div className="overflow-x-auto select-none">
          {recentHistory.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <p>No history available</p>
            </div>
          ) : (
            <table className="w-full text-sm pointer-events-none select-none">
              <thead className="bg-[#f8eef0]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#800000]">Inventory Date</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#800000]">Beginning Inv.</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#800000]">{selectedInventory === "annex" ? "Replenishment" : "Purchase"}</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#800000]">Stock-on-hand</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#800000]">Consumption</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#800000]">Ending Inv.</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#800000]">Unit</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#800000]">Course</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#800000] relative group">
                    <div className="flex items-center gap-2">
                      Purpose
                      <div className="absolute top-full right-0 mt-1 hidden group-hover:block bg-white border border-slate-300 rounded-lg shadow-lg z-50">
                        <button
                          onClick={() => handlePurposeChange('All')}
                          className={`block w-full text-left px-4 py-2 hover:bg-slate-100 transition whitespace-nowrap ${
                            purposeFilter === 'All' ? 'bg-[#f8eef0] text-[#800000] font-semibold' : 'text-slate-700'
                          }`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => handlePurposeChange('Training')}
                          className={`block w-full text-left px-4 py-2 hover:bg-slate-100 transition whitespace-nowrap ${
                            purposeFilter === 'Training' ? 'bg-[#f8eef0] text-[#800000] font-semibold' : 'text-slate-700'
                          }`}
                        >
                          Training
                        </button>
                        <button
                          onClick={() => handlePurposeChange('Assessment')}
                          className={`block w-full text-left px-4 py-2 hover:bg-slate-100 transition whitespace-nowrap ${
                            purposeFilter === 'Assessment' ? 'bg-[#f8eef0] text-[#800000] font-semibold' : 'text-slate-700'
                          }`}
                        >
                          Assessment
                        </button>
                      </div>
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-[#800000]">Trainer</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#800000]">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentHistory.map((record) => (
                  <tr key={record.id} className="bg-slate-50">
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {new Date(record.createdAt).toLocaleDateString("en-PH")}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-600">
                      {record.beginningInventory || "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-emerald-600">
                      {record.quantityChanged > 0 ? record.quantityChanged : "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-600">
                      {record.quantityChanged > 0 
                        ? (record.beginningInventory + record.quantityChanged) || "—"
                        : record.beginningInventory || "—"
                      }
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-red-600">
                      {record.quantityChanged < 0 ? Math.abs(record.quantityChanged) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-600">
                      {record.endingInventory || "—"}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-600">
                      {item?.unit || "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{record.course || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{record.purpose || "—"}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{record.trainer || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{record.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modals */}
      <ComprehensiveItemModal
        isOpen={isModalOpen}
        item={item}
        action={modalAction}
        onClose={closeModal}
        onAddStock={modalAction === "add" ? handleAddStock : null}
        onDeductStock={modalAction === "deduct" ? handleDeductStock : null}
      />
      
      <RequestStockModal
        isOpen={isRequestModalOpen}
        item={item}
        requestType={requestModalType}
        onClose={() => setIsRequestModalOpen(false)}
        onRequestSubmitted={(request) => {
          if (request) {
            setPendingRequestSummary({
              quantity: request.quantity,
              itemName: item.itemName,
              requestType: request.requestType || requestModalType,
              createdAt: request.createdAt || new Date().toISOString(),
            })
          }
          setIsRequestModalOpen(false)
        }}
      />
    </div>
  )
}

export default ItemDetailPage
