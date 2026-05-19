import { useEffect, useMemo, useState } from "react"
import { Printer } from "lucide-react"
import { getHistoryLogs } from "../api/historyApi"

const ACTION_TYPES = ["All", "Stock In", "Stock Out", "Update", "Archive"]

const ACTION_BADGE = {
  "Stock In": "bg-emerald-50 text-emerald-700",
  "Stock Out": "bg-rose-50 text-rose-700",
  Update: "bg-blue-50 text-blue-700",
  Archive: "bg-slate-100 text-slate-600"
}

const TrackHistory = ({ track, title, inventoryItems = [], logHeight }) => {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState("")
  const [selectedAction, setSelectedAction] = useState("All")
  const [selectedDate, setSelectedDate] = useState("")

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        const data = selectedItemId
          ? await getHistoryLogs({ itemId: selectedItemId })
          : await getHistoryLogs({ category: track.toUpperCase() })
        setLogs(data)
      } catch {
        setLogs([])
      }
      setIsLoading(false)
    }

    load()
  }, [track, selectedItemId])

  useEffect(() => {
    if (selectedItemId !== "" || selectedAction !== "All") {
      setSelectedItemId("")
      setSelectedAction("All")
    }
  }, [track, selectedItemId, selectedAction])

  const filteredLogs = useMemo(
    () =>
      logs
        .filter((log) => (selectedItemId ? String(log.consumableId) === selectedItemId : true))
        .filter((log) => (selectedAction !== "All" ? log.actionType === selectedAction : true))
        .filter((log) => !selectedDate || new Date(log.createdAt).toLocaleDateString('en-CA') === selectedDate),
    [logs, selectedItemId, selectedAction, selectedDate]
  )

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--brand-secondary-soft)] bg-white">
      <div className="border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-[var(--brand-primary)]" />
            <h3 className="font-title text-base font-semibold text-slate-800 sm:text-lg">
              Recent Activity - {title || track.toUpperCase()}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--brand-primary-strong)] sm:w-fit sm:px-4 sm:text-sm"
          >
            <Printer className="h-4 w-4" />
            Print Report
          </button>
        </div>
      </div>

      <div className={`overflow-y-auto ${logHeight || ''}`}>
        <div className="space-y-4 p-4 print:pt-2 sm:p-6">
          {/* Filter bar */}
          <div className="flex flex-col gap-3 print:hidden lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              {/* Date selector */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={`rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
                    selectedDate ? 'border-[var(--brand-primary)] bg-[#fff6f7]' : 'border-slate-200 bg-white'
                  }`}
                  title="Filter by date"
                />
                {selectedDate && (
                  <button
                    onClick={() => setSelectedDate('')}
                    className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 rounded"
                  >
                    ✕ Clear
                  </button>
                )}
              </div>

              {/* Item selector */}
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] sm:w-auto $\{
                  selectedItemId ? "border-[var(--brand-primary)] bg-[#fff6f7]" : "border-slate-200 bg-white"
                }`}
              >
                <option value="">All Items</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={String(item.id)}>
                    {item.itemName}
                  </option>
                ))}
              </select>

              {/* Action type pill filters */}
              <div className="flex flex-wrap gap-1 overflow-x-auto pb-1 sm:pb-0">
                {ACTION_TYPES.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => setSelectedAction(action)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      selectedAction === action
                        ? "bg-[var(--brand-primary)] text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-500">
              {selectedItemId ? "Showing selected item history" : "Showing full track history"}
            </p>
          </div>

          {/* Active filter summary badge */}
          {(selectedItemId || selectedAction !== "All" || selectedDate) && (
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <span className="text-xs text-slate-500">Filtering:</span>
              {selectedDate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-0.5 text-xs font-semibold text-blue-700">
                  📅 {new Date(selectedDate).toLocaleDateString('en-PH')}
                  <button
                    type="button"
                    onClick={() => setSelectedDate("")}
                    className="ml-1 text-blue-600 hover:text-blue-700"
                    aria-label="Clear date filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedItemId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#fbe9ed] px-3 py-0.5 text-xs font-semibold text-[#800000]">
                  {inventoryItems.find((i) => String(i.id) === selectedItemId)?.itemName ?? "Item"}
                  <button
                    type="button"
                    onClick={() => setSelectedItemId("")}
                    className="ml-1 text-[#800000]/70 hover:text-[#800000]"
                    aria-label="Clear item filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedAction !== "All" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-700">
                  {selectedAction}
                  <button
                    type="button"
                    onClick={() => setSelectedAction("All")}
                    className="ml-1 text-slate-500 hover:text-slate-700"
                    aria-label="Clear action filter"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="py-6 text-sm text-slate-500">Loading activity log...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 py-6 text-center text-sm text-slate-500">
              No history records found for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-[1100px] w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-[#f8eef0]">
                    <tr>
                      <th className="px-4 py-4 font-semibold text-[var(--brand-primary)] sm:px-5">Item</th>
                      <th className="px-4 py-4 font-semibold text-[var(--brand-primary)] sm:px-5">Action</th>
                      <th className="px-4 py-4 font-semibold text-[var(--brand-primary)] sm:px-5">Qty Δ</th>
                      <th className="px-4 py-4 font-semibold text-[var(--brand-primary)] sm:px-5">
                        Performed By
                      </th>
                      <th className="px-4 py-4 font-semibold text-[var(--brand-primary)] sm:px-5">
                        Duration
                      </th>
                      <th className="px-4 py-4 font-semibold text-[var(--brand-primary)] sm:px-5">
                        Description
                      </th>
                      <th className="px-4 py-4 font-semibold text-[var(--brand-primary)] sm:px-5">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-4 font-medium text-slate-700 sm:px-5">{log.itemName}</td>
                        <td className="px-4 py-4 sm:px-5">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold sm:px-3 sm:text-[11px] ${
                              ACTION_BADGE[log.actionType] ?? "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {log.actionType}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-slate-700 sm:px-5">{log.quantityChanged}</td>
                        <td className="px-4 py-4 text-slate-700 sm:px-5 whitespace-normal break-words">{log.performedBy || "System"}</td>
                        <td className="px-4 py-4 text-slate-600 sm:px-5 whitespace-normal break-words">
                          {log.startDate && log.endDate
                            ? `${new Date(log.startDate).toLocaleDateString("en-PH")} - ${new Date(
                                log.endDate
                              ).toLocaleDateString("en-PH")}`
                            : "—"}
                        </td>
                        <td className="px-4 py-4 text-slate-600 sm:px-5 whitespace-normal break-words">{log.description || "—"}</td>
                        <td className="px-4 py-4 text-slate-600 sm:px-5 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("en-PH")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TrackHistory
