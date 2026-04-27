import { Archive, Pencil } from "lucide-react"

const statusClassMap = {
  "In Stock": "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  "Low Stock": "bg-[#fbe9ed] text-[#800000] dark:bg-red-950/30 dark:text-red-400"
}

const ConsumableTable = ({ items, onEdit, onArchive, onRowClick, showActions = true, coursesMap = {} }) => {
  const handleRowClick = (item, e) => {
    if (!e.target.closest('button')) {
      onRowClick?.(item)
    }
  }

  const getCourseDisplay = (item) => {
    if (item.courseId && coursesMap[item.courseId]) {
      return coursesMap[item.courseId].courseName
    }
    return item.category || 'N/A'
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--brand-secondary-soft)] bg-white transition-colors duration-300 dark:bg-slate-800 dark:border-slate-700">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
          <thead className="bg-[#f8eef0] transition-colors duration-300 dark:bg-slate-900/50">
            <tr>
              <th className="px-3 py-2 font-semibold text-[var(--brand-primary)] transition-colors duration-300 dark:text-red-400">Item Name</th>
              <th className="hidden px-3 py-2 font-semibold text-[var(--brand-primary)] transition-colors duration-300 dark:text-red-400 md:table-cell">Course</th>
              <th className="px-3 py-2 font-semibold text-[var(--brand-primary)] transition-colors duration-300 dark:text-red-400">Quantity</th>
              <th className="hidden px-3 py-2 font-semibold text-[var(--brand-primary)] transition-colors duration-300 dark:text-red-400 sm:table-cell">Unit</th>
              <th className="px-3 py-2 font-semibold text-[var(--brand-primary)] transition-colors duration-300 dark:text-red-400">Status</th>
              {showActions ? <th className="px-3 py-2 font-semibold text-[var(--brand-primary)] transition-colors duration-300 print:hidden dark:text-red-400">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-700 dark:bg-slate-800 transition-colors duration-300">
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={(e) => handleRowClick(item, e)}
                className="cursor-pointer hover:bg-[#fce4e8]/40 dark:hover:bg-slate-700/50 transition-colors duration-300"
              >
                <td className="px-3 py-2 font-medium text-slate-700 transition-colors duration-300 dark:text-slate-200">{item.itemName}</td>
                <td className="hidden px-3 py-2 text-slate-700 transition-colors duration-300 dark:text-slate-300 md:table-cell">{getCourseDisplay(item)}</td>
                <td className="px-3 py-2 text-slate-700 transition-colors duration-300 dark:text-slate-300">{item.quantity}</td>
                <td className="hidden px-3 py-2 text-slate-600 transition-colors duration-300 dark:text-slate-400 sm:table-cell">{item.unit}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold transition-colors duration-300 sm:px-3 sm:text-[11px] ${statusClassMap[item.status]}`}
                  >
                    {item.status}
                  </span>
                </td>
                {showActions ? (
                  <td className="px-3 py-2 print:hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit?.(item)}
                        className="inline-flex rounded-lg border border-[var(--brand-secondary-soft)] p-2 text-slate-600 transition hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] dark:border-slate-600 dark:text-slate-400 dark:hover:border-red-400 dark:hover:text-red-400"
                        aria-label={`Edit ${item.itemName}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onArchive?.(item)}
                        className="inline-flex rounded-lg border border-rose-200 p-2 text-rose-700 transition hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        aria-label={`Archive ${item.itemName}`}
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ConsumableTable
