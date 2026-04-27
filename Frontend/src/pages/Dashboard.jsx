import { useEffect, useMemo, useState, useCallback } from "react"
import { Boxes, PackageOpen, ShieldCheck, Wrench } from "lucide-react"
import { useNavigate } from "react-router-dom"
import Button from "../components/Button"
import SummaryCard from "../components/SummaryCard"
import ConsumableTable from "../components/ConsumableTable"
import ConsumableModal from "../components/ConsumableModal"
import InventorySelector from "../components/InventorySelector"
import { getDashboardInventory } from "../api/inventoryApi"
import { getHistoryLogs } from "../api/historyApi"
import { addConsumable, archiveConsumable, updateConsumable } from "../api/inventoryCrudApi"
import { useSearch } from "../context/SearchContext"
import { useToast } from "../context/ToastContext"
import { useNotifications } from "../context/NotificationContext"
import { useInventoryLocation } from "../context/InventoryLocationContext"
import { normalizeItems, summarizeInventory } from "../utils/inventory"

const trackIconMap = {
  EIM: PackageOpen,
  SMAW: Wrench,
  CSS: ShieldCheck
}

const Dashboard = () => {
  const navigate = useNavigate()
  const { error: showError, success } = useToast()
  const { selectedInventory } = useInventoryLocation()
  const [summary, setSummary] = useState({ totalsByTrack: [], grandTotal: 0 })
  const [allItems, setAllItems] = useState([])
  const [allHistory, setAllHistory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const { searchQuery } = useSearch()
  const { setOnStockUpdate } = useNotifications()

  const loadDashboard = async () => {
    setIsLoading(true)
    try {
      const inventoryByTrack = await getDashboardInventory(selectedInventory)
      const combinedItems = [
        ...(inventoryByTrack.eim || []),
        ...(inventoryByTrack.smaw || []),
        ...(inventoryByTrack.css || [])
      ]
      setSummary(summarizeInventory(inventoryByTrack))
      setAllItems(normalizeItems(combinedItems))

      // Load all history
      const logs = await getHistoryLogs()
      const filtered = (logs || [])
        .filter(h => h.location === selectedInventory)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setAllHistory(filtered)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [selectedInventory])

  // Create stable callback for stock updates
  const handleStockUpdate = useCallback(async (data) => {
    console.log('📦 Updating dashboard with stock update:', data)
    setAllItems(prevItems =>
      prevItems.map(item =>
        item.id === data.id ? { ...item, quantity: data.quantity } : item
      )
    )
    // Update summary totals
    setSummary(prevSummary => ({
      ...prevSummary,
      grandTotal: prevSummary.grandTotal
    }))
    
    // Refresh history logs to show latest activity
    try {
      const logs = await getHistoryLogs()
      const filtered = (logs || [])
        .filter(h => h.location === selectedInventory)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setAllHistory(filtered)
    } catch (error) {
      console.error('Error refreshing history logs:', error)
    }
  }, [selectedInventory])

  // Register stock update listener
  useEffect(() => {
    setOnStockUpdate(handleStockUpdate)
    
    return () => {
      setOnStockUpdate(null)
    }
  }, [handleStockUpdate, setOnStockUpdate])

  const lowStockItems = useMemo(
    () =>
      allItems
        .filter(
          (item) =>
            item.status === "Low Stock" &&
            item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => a.quantity - b.quantity),
    [allItems, searchQuery]
  )

  const highStockItems = useMemo(
    () =>
      allItems
        .filter(
          (item) =>
            item.status !== "Low Stock" &&
            item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10),
    [allItems, searchQuery]
  )

  const handleAdd = async (payload) => {
    try {
      // Ensure a location is selected before adding
      if (!selectedInventory) {
        showError("Please select a location (Main or Training) before adding an item.")
        return
      }
      
      console.log('📝 Adding consumable from Dashboard:', { ...payload, location: selectedInventory })
      const result = await addConsumable({ ...payload, location: selectedInventory })
      setIsAddOpen(false)
      if (result?.createdAsRequest) {
        success("Request submitted. An admin will review your new consumable request.")
      } else {
        success("New consumable added successfully.")
      }
      await loadDashboard()
    } catch (error) {
      showError(error.response?.data?.error || "Failed to add item.")
    }
  }

  const handleEdit = async (payload) => {
    try {
      await updateConsumable(editingItem.id, payload)
      setEditingItem(null)
      await loadDashboard()
    } catch (error) {
      showError(error.response?.data?.error || "Failed to update item.")
    }
  }

  const handleArchive = async (item) => {
    const shouldArchive = window.confirm(`Archive ${item.itemName}?`)
    if (!shouldArchive) return
    try {
      await archiveConsumable(item.id)
      await loadDashboard()
    } catch (error) {
      showError(error.response?.data?.error || "Failed to archive item.")
    }
  }

  const handleSelectItem = (item) => {
    // Navigate to item detail page using category as track
    const track = item.category?.toLowerCase() || 'eim'
    navigate(`/inventory/${track}/${item.id}`)
  }

  return (
    <section className="space-y-4 transition-all duration-300 sm:space-y-5">
      <div className="flex flex-col gap-3 print:hidden sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h2 className="font-title text-xl font-bold text-[var(--brand-primary)] transition-colors duration-300 dark:text-red-400 sm:text-2xl">Dashboard Overview</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button className="px-3 py-2 text-xs sm:px-4 sm:text-sm" onClick={() => window.print()}>Print Report</Button>
          <Button className="px-3 py-2 text-xs sm:px-4 sm:text-sm" onClick={() => setIsAddOpen(true)}>Add New Consumable</Button>
        </div>
      </div>

      {/* Location Selection */}
      <div className={`${
        selectedInventory 
          ? 'rounded-xl border border-slate-200 bg-slate-50 p-3' 
          : 'rounded-xl border-2 border-yellow-200 bg-yellow-50 p-3'
      } mb-4`}>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className={`text-sm font-semibold ${
            selectedInventory 
              ? 'text-slate-700' 
              : 'text-yellow-800'
          }`}>
            {selectedInventory ? 'Current Location' : 'Please select an inventory location to proceed:'}
          </p>
          {selectedInventory && (
            <span className="inline-flex w-fit rounded-lg bg-white px-3 py-1 text-sm font-bold text-[#800000]">
              {selectedInventory === 'main' ? 'Main Inventory' : 'Training Inventory'}
            </span>
          )}
        </div>
        <InventorySelector />
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm transition-colors duration-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
          Loading inventory summary...
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Total Consumables"
              value={summary.grandTotal}
              subtitle="Grand Total"
              icon={Boxes}
            />
            {summary.totalsByTrack.map((track) => (
              <SummaryCard
                key={track.track}
                label={`${track.track} Total`}
                value={track.total}
                subtitle={`${track.track} Total`}
                icon={trackIconMap[track.track] || PackageOpen}
              />
            ))}
          </div>

          <div className={`grid gap-4 ${lowStockItems.length === 0 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'} print:grid-cols-1`}>
            {/* Low Stock Alerts - Only show if there are items */}
            {lowStockItems.length > 0 && (
              <div className="space-y-2 flex flex-col">
                <h3 className="font-title flex items-center gap-2 text-base font-semibold text-slate-800 sm:text-lg">
                  <span className="h-5 w-1 rounded-full bg-[var(--brand-primary)]" />
                  Low Stock Alerts
                  <span className="ml-1 rounded-full bg-[#fbe9ed] px-2 py-0.5 text-xs font-semibold text-[#800000]">
                    {lowStockItems.length}
                  </span>
                </h3>
                <div>
                  <ConsumableTable
                    items={lowStockItems}
                    onEdit={setEditingItem}
                    onArchive={handleArchive}
                    onRowClick={handleSelectItem}
                  />
                </div>
              </div>
            )}

            {/* Empty State for Low Stock - Show only when list is empty */}
            {lowStockItems.length === 0 && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
                ✓ All consumables are currently healthy.
              </div>
            )}

            {/* High Stock Inventory */}
            <div className="space-y-2 flex flex-col">
              <h3 className="font-title flex items-center gap-2 text-base font-semibold text-slate-800 sm:text-lg">
                <span className="h-5 w-1 rounded-full bg-emerald-500" />
                High Stock Inventory
                <span className="ml-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                  Top {highStockItems.length}
                </span>
              </h3>
              {highStockItems.length > 0 ? (
                <div>
                  <ConsumableTable
                    items={highStockItems}
                    onEdit={setEditingItem}
                    onArchive={handleArchive}
                    onRowClick={handleSelectItem}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No in-stock items found.
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Section */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-5 w-1 rounded-full bg-[var(--brand-primary)]" />
                <h3 className="font-title text-lg font-semibold text-slate-800">
                  Recent Activity
                </h3>
                <span className="ml-2 rounded-full bg-[#fbe9ed] px-2 py-0.5 text-xs font-semibold text-[#800000]">
                  Last 5
                </span>
              </div>
            </div>

            {/* Activity Table - Limited to 5 rows */}
            <div className="overflow-x-auto select-none">
              {allHistory.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-slate-500">
                  <p>No activity available for {selectedInventory ? (selectedInventory === 'main' ? 'Main' : 'Annex') : 'selected'} inventory</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm pointer-events-none select-none">
                    <thead className="bg-[#f8eef0]">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-[var(--brand-primary)]">Item</th>
                        <th className="px-3 py-2 text-left font-semibold text-[var(--brand-primary)]">Action</th>
                        <th className="px-3 py-2 text-center font-semibold text-[var(--brand-primary)]">Qty Δ</th>
                        <th className="px-3 py-2 text-left font-semibold text-[var(--brand-primary)]">Performed By</th>
                        <th className="px-3 py-2 text-left font-semibold text-[var(--brand-primary)]">Description</th>
                        <th className="px-3 py-2 text-left font-semibold text-[var(--brand-primary)]">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {allHistory.slice(0, 5).map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50/70">
                          <td className="px-3 py-2 font-medium text-slate-700">{record.itemName}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                                record.actionType === "Stock In" ? "bg-emerald-50 text-emerald-700" :
                                record.actionType === "Stock Out" ? "bg-rose-50 text-rose-700" :
                                record.actionType === "Update" ? "bg-blue-50 text-blue-700" :
                                "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {record.actionType}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-slate-700">{record.quantityChanged}</td>
                          <td className="px-3 py-2 text-slate-700">{record.performedBy || "System"}</td>
                          <td className="px-3 py-2 text-slate-600">{record.description || "—"}</td>
                          <td className="px-3 py-2 text-slate-600">
                            {new Date(record.createdAt).toLocaleString("en-PH")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <ConsumableModal
        isOpen={isAddOpen}
        title="Add New Consumable"
        submitLabel="Save Item"
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAdd}
      />

      <ConsumableModal
        isOpen={Boolean(editingItem)}
        title="Update Consumable"
        submitLabel="Save Changes"
        onClose={() => setEditingItem(null)}
        onSubmit={handleEdit}
        initialValues={editingItem || undefined}
      />
    </section>
  )
}

export default Dashboard
