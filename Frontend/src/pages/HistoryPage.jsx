import { useEffect, useRef, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChevronLeft, Printer, ArrowUpDown, Edit2, X, Image as ImageIcon } from "lucide-react"
import { getInventoryByTrack } from "../api/inventoryApi"
import { getHistoryLogs, updateHistoryRecord } from "../api/historyApi"
import { useInventoryLocation } from "../context/InventoryLocationContext"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { normalizeItems } from "../utils/inventory"

const ROWS_PER_PAGE = 20

const HistoryPage = () => {
  const { track, itemId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { success } = useToast()
  const { selectedInventory } = useInventoryLocation()
  const [item, setItem] = useState(null)
  const [allHistory, setAllHistory] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [purposeFilter, setPurposeFilter] = useState('All')
  const [searchUsername, setSearchUsername] = useState('')
  const [sortDate, setSortDate] = useState('DESC')
  const [editingRecord, setEditingRecord] = useState(null)
  const [editDescription, setEditDescription] = useState('')
  const [editPurchase, setEditPurchase] = useState(0)
  const [editConsumption, setEditConsumption] = useState(0)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [editError, setEditError] = useState(null)
  const [selectedEvidenceRecord, setSelectedEvidenceRecord] = useState(null)
  const [selectedEvidenceImage, setSelectedEvidenceImage] = useState(null)
  const printRef = useRef(null)

  const getRecordInventoryDate = (record) => record.startDate || record.createdAt

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Fetch item details
        const inventory = await getInventoryByTrack(track, selectedInventory)
        const items = normalizeItems(inventory)
        const selectedItem = items.find(i => String(i.id) === String(itemId))
        setItem(selectedItem)

        // Fetch history
        const logs = await getHistoryLogs({ itemId })
        const filtered = (logs || [])
          .filter(h => h.location === selectedInventory)
          .sort((a, b) => new Date(b.startDate || b.createdAt) - new Date(a.startDate || a.createdAt))
        setAllHistory(filtered)
        setCurrentPage(1)
      } catch (error) {
        console.error("Failed to load history:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [track, itemId, selectedInventory])

  // Pagination logic with purpose filtering, search, and date filtering
  const filteredHistory = allHistory
    .filter(h => {
      const matchesPurpose = purposeFilter === 'All' || h.purpose === purposeFilter
      const matchesUsername = !searchUsername || (h.performedBy || 'System').toLowerCase().includes(searchUsername.toLowerCase())
      
      // Date range filter
      let matchesDateRange = true
      if (startDate || endDate) {
        const recordDate = new Date(getRecordInventoryDate(h)).toLocaleDateString('en-CA')
        if (startDate && recordDate < startDate) matchesDateRange = false
        if (endDate && recordDate > endDate) matchesDateRange = false
      }
      
      return matchesPurpose && matchesUsername && matchesDateRange
    })
    .sort((a, b) => {
      const dateA = new Date(getRecordInventoryDate(a))
      const dateB = new Date(getRecordInventoryDate(b))
      return sortDate === 'DESC' ? dateB - dateA : dateA - dateB
    })
  
  const totalPages = Math.ceil(filteredHistory.length / ROWS_PER_PAGE)
  const startIndex = (currentPage - 1) * ROWS_PER_PAGE
  const endIndex = startIndex + ROWS_PER_PAGE
  const currentRecords = filteredHistory.slice(startIndex, endIndex)
  
  // Reset to page 1 when filter changes
  const handlePurposeChange = (newPurpose) => {
    setPurposeFilter(newPurpose)
    setCurrentPage(1)
  }

  const handleEditClick = (record) => {
    setEditingRecord(record)
    setEditDescription(record.description || '')
    setEditPurchase(record.quantityChanged > 0 ? record.quantityChanged : 0)
    setEditConsumption(record.quantityChanged < 0 ? Math.abs(record.quantityChanged) : 0)
  }

  const handleSaveEdit = async () => {
    if (editingRecord) {
      let newQuantityChanged = 0
      if (editPurchase > 0) {
        newQuantityChanged = editPurchase
      } else if (editConsumption > 0) {
        newQuantityChanged = -editConsumption
      }
      
      // Client-side validation
      const newEndingInventory = editingRecord.beginningInventory + newQuantityChanged
      if (newEndingInventory < 0) {
        setEditError('Consumption cannot exceed beginning inventory. Ending inventory would be negative.')
        return
      }

      setIsEditLoading(true)
      setEditError(null)

      try {
        // Call API to update the record
        const result = await updateHistoryRecord(editingRecord.id, {
          quantityChanged: newQuantityChanged,
          description: editDescription,
        })

        // Extract cascade and update information
        const replenishmentAdjustment = result.data?.replenishmentAdjustment || 0
        const stockUpdateAmount = result.data?.stockUpdateAmount || 0
        const cascadeCount = result.data?.cascadeCount || 0
        const finalQuantity = result.data?.finalQuantity || 0

        // Build success message
        let successMessage = '✓ History record updated successfully!'
        
        if (cascadeCount > 0) {
          successMessage += `\n🔄 Recalculated ${cascadeCount} subsequent transaction${cascadeCount !== 1 ? 's' : ''}`
        }

        if (finalQuantity !== undefined && finalQuantity !== null) {
          successMessage += `\n📦 Current stock now: ${finalQuantity} units`
        }

        if (editingRecord.actionType === 'Stock In' && stockUpdateAmount > 0) {
          successMessage += `\n➕ Main inventory increased: +${stockUpdateAmount} units`
        } else if (editingRecord.actionType === 'Stock Out' && replenishmentAdjustment !== 0) {
          if (replenishmentAdjustment > 0) {
            successMessage += `\n⬆️ Training inventory adjusted: +${replenishmentAdjustment} units (more consumed)`
          } else {
            successMessage += `\n⬇️ Training inventory adjusted: ${replenishmentAdjustment} units (less consumed)`
          }
        }

        setEditingRecord(null)

        // Reload all history data to show updated values
        try {
          const logs = await getHistoryLogs({ itemId })
          const filtered = (logs || [])
            .filter(h => h.location === selectedInventory)
            .sort((a, b) => new Date(b.startDate || b.createdAt) - new Date(a.startDate || a.createdAt))
          setAllHistory(filtered)
          setCurrentPage(1)
        } catch (reloadErr) {
          console.warn('Failed to reload history after edit:', reloadErr)
        }

        // Show success message
        success(successMessage)
      } catch (error) {
        console.error('Failed to save edit:', error)
        const errorMsg = error.response?.data?.error || 'Failed to save changes. Please try again.'
        const detailsMsg = error.response?.data?.details ? `\n\nDetails: ${error.response.data.details}` : ''
        setEditError(errorMsg + detailsMsg)
      } finally {
        setIsEditLoading(false)
      }
    }
  }

  // Print functionality - uses current tab without opening new window
  const handlePrint = () => {
    if (printRef.current) {
      // Create a temporary iframe for a cleaner print experience
      const printFrame = document.createElement('iframe');
      printFrame.style.display = 'none';
      document.body.appendChild(printFrame);
      
      const printWindow = printFrame.contentWindow;
      const printContent = printRef.current.innerHTML;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>History Report - ${item?.itemName}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            @page {
              size: landscape;
              margin: 12mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              padding: 12px;
              background-color: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-header {
              margin-bottom: 12px;
              text-align: center;
              border-bottom: 3px solid #800000;
              padding-bottom: 10px;
            }
            .print-header h1 {
              color: #800000;
              margin-bottom: 4px;
              font-size: 28px;
              line-height: 1.1;
            }
            .print-header h2 {
              color: #666;
              font-size: 18px;
              font-weight: 600;
              margin-bottom: 8px;
            }
            .print-header p {
              color: #666;
              margin: 2px 0;
              font-size: 14px;
              line-height: 1.3;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 14px;
              background-color: white;
              font-size: 14px;
              table-layout: auto;
            }
            thead {
              background-color: #f8eef0;
              border-bottom: 2px solid #800000;
            }
            th {
              padding: 12px 14px;
              text-align: left;
              font-weight: 600;
              color: #800000;
              font-size: 13px;
              text-transform: uppercase;
              white-space: normal;
              word-break: break-word;
              border: 1px solid #ddd;
            }
            td {
              padding: 11px 14px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
              line-height: 1.4;
              border: 1px solid #ddd;
              vertical-align: top;
              white-space: normal;
              word-break: break-word;
            }
            tbody tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            .print-footer {
              margin-top: 22px;
              text-align: center;
              color: #999;
              font-size: 13px;
              border-top: 1px solid #ddd;
              padding-top: 12px;
            }
            @media print {
              body {
                padding: 0;
              }
              thead {
                display: table-header-group;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <h1>GUTS TESDA INVENTORY</h1>
            <h2 style="color: #666; font-size: 16px; font-weight: 500; margin-bottom: 10px;">History Report</h2>
            <p><strong>Item:</strong> ${item?.itemName || "Unknown"}</p>
            <p><strong>Category:</strong> ${item?.category || "—"} | <strong>Unit:</strong> ${item?.unit || "—"} | <strong>Location:</strong> ${selectedInventory === 'main' ? 'Main Inventory' : 'Training Inventory'}</p>
            <p><strong>Filter:</strong> ${purposeFilter !== 'All' ? 'Purpose = ' + purposeFilter : 'None (All Records)'}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleDateString('en-PH')} at ${new Date().toLocaleTimeString('en-PH')}</p>
          </div>
          ${printContent}
          <div class="print-footer">
            <p>This is an official inventory history report. Total records shown: ${filteredHistory.length}</p>
            <p>End of Report</p>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      
      // Trigger print dialog after content loads
      setTimeout(() => {
        printWindow.print();
        // Remove iframe after printing
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 500);
      }, 250);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      {/* Header and Navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 font-semibold text-[#800000] transition hover:text-[#660000]"
        >
          <ChevronLeft size={20} />
          Back
        </button>
        <h1 className="text-2xl font-bold text-[#800000] sm:text-3xl">Full History Report</h1>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-[#800000] px-4 py-2 font-semibold text-white transition hover:bg-[#660000] sm:px-6"
        >
          <Printer size={20} />
          Print Report
        </button>
      </div>

      {/* Item Info Card */}
      {item && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
          <h2 className="mb-4 text-xl font-bold text-[#800000] sm:text-2xl">{item.itemName}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <p className="mt-1 font-semibold text-[#800000] text-lg">{item.quantity}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">Total Records</p>
              <p className="mt-1 font-semibold text-[#800000] text-lg">{filteredHistory.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 sm:p-6">
        {/* Row 1: Search and Sort */}
        <div className="grid gap-4 md:grid-cols-4">
          {/* Search Username */}
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Search by Username:</label>
            <input
              type="text"
              placeholder="Enter username..."
              value={searchUsername}
              onChange={(e) => {
                setSearchUsername(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
            />
          </div>

          {/* Sort Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">Sort by Date:</label>
            <button
              onClick={() => {
                setSortDate(sortDate === 'DESC' ? 'ASC' : 'DESC')
                setCurrentPage(1)
              }}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
              title={`Sort by date (${sortDate === 'DESC' ? 'Newest' : 'Oldest'} first)`}
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortDate === 'DESC' ? 'Newest' : 'Oldest'}
            </button>
          </div>

          {/* Start Date and End Date */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">Start Date:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 block">End Date:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
            />
          </div>
        </div>

        {/* Row 2: Purpose Filter */}
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-sm font-semibold text-slate-700 block mb-2">Filter by Purpose:</label>
            <select
              value={purposeFilter}
              onChange={(e) => handlePurposeChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
            >
              <option value="All">All</option>
              <option value="Training">Training</option>
              <option value="Assessment">Assessment</option>
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchUsername || purposeFilter !== 'All' || startDate || endDate) && (
          <button
            onClick={() => {
              setSearchUsername('')
              setPurposeFilter('All')
              setStartDate('')
              setEndDate('')
              setSortDate('DESC')
              setCurrentPage(1)
            }}
            className="text-xs font-medium text-red-600 hover:text-red-700"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* History Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          {currentRecords.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <p>No history records available</p>
            </div>
          ) : (
            <table id="history-table" className="w-full text-sm">
              <thead className="bg-[#f8eef0]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-[#800000]">Inventory Date</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#800000]">Beginning Inv.</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#800000]">Purchase</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#800000]">Stock-on-hand</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#800000]">Consumption</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#800000]">Ending Inv.</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#800000]">Unit</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#800000]">Performed By</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#800000]">Course</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#800000]">Purpose</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#800000]">Trainer</th>
                  <th className="px-4 py-3 text-left font-semibold text-[#800000]">Remarks</th>
                  <th className="px-4 py-3 text-center font-semibold text-[#800000]">Evidence</th>
                  {user?.role === 'admin' && (
                    <th className="px-4 py-3 text-center font-semibold text-[#800000]">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {new Date(getRecordInventoryDate(record)).toLocaleDateString("en-PH")}
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
                      {record.unit || "—"}
                    </td>
                    <td className="px-4 py-3 whitespace-normal break-words text-slate-600">{record.performedBy || "System"}</td>
                    <td className="px-4 py-3 whitespace-normal break-words text-slate-600">{record.course || "—"}</td>
                    <td className="px-4 py-3 whitespace-normal break-words text-slate-600">{record.purpose || "—"}</td>
                    <td className="px-4 py-3 whitespace-normal break-words text-slate-600">{record.trainer || "—"}</td>
                    <td className="px-4 py-3 whitespace-normal break-words text-slate-600">{record.description || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {record.verificationImages?.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setSelectedEvidenceRecord(record)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#800000]/10 px-3 py-2 text-xs font-semibold text-[#800000] transition hover:bg-[#800000]/15"
                        >
                          <ImageIcon className="h-3 w-3" />
                          {record.verificationImages.length}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">None</span>
                      )}
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleEditClick(record)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-200 transition"
                          title="Edit this record"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="text-slate-600">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredHistory.length)} of {filteredHistory.length} records {purposeFilter !== 'All' && `(filtered by ${purposeFilter})`}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              ← Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg font-semibold transition ${
                    currentPage === page
                      ? "bg-[#800000] text-white"
                      : "border border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
            >
              Next 
            </button>
          </div>
        </div>
      )}

      {/* Hidden Printable Content (All Filtered Records) */}
      <div ref={printRef} style={{ display: 'none' }}>
        <table className="w-full text-sm">
          <thead className="bg-[#f8eef0]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-[#800000]">Inventory Date</th>
              <th className="px-4 py-3 text-center font-semibold text-[#800000]">Beginning Inv.</th>
              <th className="px-4 py-3 text-center font-semibold text-[#800000]">Purchase</th>
              <th className="px-4 py-3 text-center font-semibold text-[#800000]">Stock-on-hand</th>
              <th className="px-4 py-3 text-center font-semibold text-[#800000]">Consumption</th>
              <th className="px-4 py-3 text-center font-semibold text-[#800000]">Ending Inv.</th>
              <th className="px-4 py-3 text-center font-semibold text-[#800000]">Unit</th>
              <th className="px-4 py-3 text-left font-semibold text-[#800000]">Performed By</th>
              <th className="px-4 py-3 text-left font-semibold text-[#800000]">Course</th>
              <th className="px-4 py-3 text-left font-semibold text-[#800000]">Purpose</th>
              <th className="px-4 py-3 text-left font-semibold text-[#800000]">Trainer</th>
              <th className="px-4 py-3 text-left font-semibold text-[#800000]">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredHistory.map((record) => (
              <tr key={record.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {new Date(getRecordInventoryDate(record)).toLocaleDateString("en-PH")}
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
                  {record.unit || "—"}
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{record.performedBy || "System"}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{record.course || "—"}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{record.purpose || "—"}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{record.trainer || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{record.description || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Evidence Gallery Modal */}
      {selectedEvidenceRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
              <div>
                <h3 className="font-semibold text-slate-900">Verification Images</h3>
                <p className="text-xs text-slate-500">
                  {new Date(getRecordInventoryDate(selectedEvidenceRecord)).toLocaleDateString("en-PH")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedEvidenceRecord(null)
                  setSelectedEvidenceImage(null)
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-72px)] overflow-y-auto p-4 sm:p-6">
              {selectedEvidenceRecord.verificationImages?.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {selectedEvidenceRecord.verificationImages.map((image, index) => (
                    <button
                      key={`${image.fileName}-${index}`}
                      type="button"
                      onClick={() => setSelectedEvidenceImage(image)}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:shadow-md"
                    >
                      <img src={image.dataUrl} alt={image.fileName} className="h-48 w-full object-cover" />
                      <div className="p-3">
                        <p className="truncate text-sm font-semibold text-slate-800">{image.fileName}</p>
                        <p className="text-xs text-slate-500">{Math.round((image.size || 0) / 1024)} KB</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
                  No verification images found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedEvidenceImage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">Image Preview</p>
                <p className="text-xs text-slate-500">{selectedEvidenceImage.fileName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvidenceImage(null)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <img
              src={selectedEvidenceImage.dataUrl}
              alt={selectedEvidenceImage.fileName}
              className="max-h-[80vh] w-full object-contain bg-black"
            />
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="font-semibold text-slate-900">Edit History Record</h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{new Date(getRecordInventoryDate(editingRecord)).toLocaleDateString("en-PH")}</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Performed By</label>
                <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{editingRecord.performedBy || 'System'}</p>
              </div>
              
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Purchase (Edit)</label>
                  <input
                    type="number"
                    value={editPurchase}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0)
                      setEditPurchase(val)
                      if (val > 0) setEditConsumption(0)
                    }}
                    min="0"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Consumption (Edit)</label>
                  <input
                    type="number"
                    value={editConsumption}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0)
                      setEditConsumption(val)
                      if (val > 0) setEditPurchase(0)
                    }}
                    min="0"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status / Remarks (Edit)</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter updated remarks or status..."
                  rows="4"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                />
              </div>

              {editError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {editError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => {
                    setEditingRecord(null)
                    setEditError(null)
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition disabled:opacity-50"
                  type="button"
                  disabled={isEditLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-lg bg-[#800000] text-white hover:bg-[#660000] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                  disabled={isEditLoading}
                >
                  {isEditLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HistoryPage
