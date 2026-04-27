import { Search } from "lucide-react"
import { useLocation } from "react-router-dom"
import { useSearch } from "../context/SearchContext"
import { useInventoryLocation } from "../context/InventoryLocationContext"
import NotificationBell from "./NotificationBell"

const Navbar = () => {
  const { searchQuery, setSearchQuery } = useSearch()
  const { selectedInventory, handleInventoryChange } = useInventoryLocation()
  const location = useLocation()

  const dateText = new Date().toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })

  const isItemDetailPage = location.pathname.includes('/inventory/')

  return (
    <>
      <header className="flex flex-col gap-2 border-b border-slate-200 bg-white px-3 py-3 sm:px-4 md:flex-row md:items-center md:justify-between md:px-6 print:hidden">
        <div className="min-w-0">
          <h1 className="font-title text-lg font-semibold text-slate-800 sm:text-xl">
            Consumables Management Dashboard
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <label className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm sm:w-auto sm:min-w-[12rem]">
            <Search className="h-4 w-4" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Quick Search"
              className="w-full min-w-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 sm:w-44"
            />
          </label>
          <NotificationBell />
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 sm:text-xs">
            {dateText}
          </p>
        </div>
      </header>

      {/* Inventory Location Tabs - shown only on item detail page */}
      {isItemDetailPage && (
        <div className="border-b border-slate-200 bg-white px-3 py-3 sm:px-4 md:px-6 print:hidden">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <p className="text-sm font-semibold text-slate-600 sm:mr-2">Inventory Location:</p>
            <button
              onClick={() => handleInventoryChange("main")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                selectedInventory === "main"
                  ? "bg-[#800000] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Main Inventory Monitoring
            </button>
            <button
              onClick={() => handleInventoryChange("annex")}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition sm:px-4 ${
                selectedInventory === "annex"
                  ? "bg-[#800000] text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Training Inventory Monitoring
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar
