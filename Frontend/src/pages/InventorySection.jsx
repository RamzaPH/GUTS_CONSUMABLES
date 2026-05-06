import { useEffect, useState, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import Button from "../components/Button"
import ConsumableTable from "../components/ConsumableTable"
import ConsumableModal from "../components/ConsumableModal"
import TrackHistory from "../components/TrackHistory"
import { getInventoryByTrack } from "../api/inventoryApi"
import { addConsumable, archiveConsumable, updateConsumable } from "../api/inventoryCrudApi"
import { getHistoryLogs } from "../api/historyApi"
import { useSearch } from "../context/SearchContext"
import { useToast } from "../context/ToastContext"
import { useNotifications } from "../context/NotificationContext"
import { useInventoryLocation } from "../context/InventoryLocationContext"
import { normalizeItems } from "../utils/inventory"

const InventorySection = ({ title, description, track }) => {
  const { error: showError, success } = useToast()
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const { searchQuery } = useSearch()
  const { setOnStockUpdate } = useNotifications()
  const { selectedInventory } = useInventoryLocation()
  const navigate = useNavigate()

  const loadItems = async () => {
    setIsLoading(true)
    const inventory = await getInventoryByTrack(track, selectedInventory)
    setItems(normalizeItems(inventory))
    setIsLoading(false)
  }

  // Navigate to item detail page when row is clicked
  const handleSelectItem = (item) => {
    navigate(`/inventory/${track}/${item.id}`)
  }

  useEffect(() => {
    loadItems()
  }, [track, selectedInventory])

  // Create stable callback for stock updates
  const handleStockUpdate = useCallback((data) => {
    setItems(prevItems =>
      prevItems.map(item =>
        item.id === data.id ? { ...item, quantity: data.quantity } : item
      )
    )
  }, [])

  // Register stock update listener
  useEffect(() => {
    setOnStockUpdate(handleStockUpdate)
    
    return () => {
      setOnStockUpdate(null)
    }
  }, [handleStockUpdate, setOnStockUpdate])

  const filteredItems = items.filter((item) =>
    item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalItems = items.length
  const lowStockCount = items.filter((item) => item.status === "Low Stock").length
  const inStockCount = totalItems - lowStockCount

  const handleAdd = async (payload) => {
    try {
      const result = await addConsumable({ ...payload, category: track.toUpperCase(), location: selectedInventory })
      setIsAddOpen(false)
      if (result?.createdAsRequest) {
        success("Request submitted. An admin will review your new consumable request.")
      } else {
        success("New consumable added successfully.")
      }
      await loadItems()
    } catch (error) {
      showError(error.response?.data?.error || "Failed to add item.")
    }
  }

  const handleEdit = async (payload) => {
    try {
      await updateConsumable(editingItem.id, payload)
      setEditingItem(null)
      await loadItems()
    } catch (error) {
      showError(error.response?.data?.error || "Failed to update item.")
    }
  }

  const handleArchive = async (item) => {
    const shouldArchive = window.confirm(`Archive ${item.itemName}?`)

    if (!shouldArchive) {
      return
    }

    try {
      await archiveConsumable(item.id)
      await loadItems()
    } catch (error) {
      showError(error.response?.data?.error || "Failed to archive item.")
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h2 className="font-title text-2xl font-bold text-[var(--brand-primary)] sm:text-3xl">{title}</h2>
          <p className="mt-1 text-sm text-slate-600 sm:mt-2">{description}</p>
        </div>
        <Button
          className="bg-[var(--brand-primary)] px-3 py-2 text-xs hover:bg-[var(--brand-primary-strong)] sm:px-4 sm:text-sm"
          onClick={() => setIsAddOpen(true)}
        >
          Add New Consumable
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-[var(--brand-secondary-soft)] bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Items</p>
          <p className="mt-1 font-title text-lg font-bold text-slate-800 sm:text-xl">{totalItems} Consumables</p>
        </div>
        <div className="rounded-xl border border-[#e9cfd3] bg-[#fff6f7] px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Low Stock</p>
          <p className="mt-1 font-title text-lg font-bold text-[var(--brand-primary)] sm:text-xl">{lowStockCount}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-[#f8fafc] px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">In Stock</p>
          <p className="mt-1 font-title text-lg font-bold text-slate-700 sm:text-xl">{inStockCount}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading {title} consumables...
        </div>
      ) : (
        <div className="h-[280px] overflow-y-auto sm:h-[340px]">
          <ConsumableTable
            items={filteredItems}
            onEdit={setEditingItem}
            onArchive={handleArchive}
            onRowClick={handleSelectItem}
          />
        </div>
      )}

      <TrackHistory track={track} title={title} inventoryItems={items} logHeight="h-[240px] sm:h-[260px]" />

      <ConsumableModal
        isOpen={isAddOpen}
        title="Add New Consumable"
        submitLabel="Save Item"
        onClose={() => setIsAddOpen(false)}
        onSubmit={handleAdd}
        initialValues={{ category: track.toUpperCase() }}
        lockCategory
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

export default InventorySection
