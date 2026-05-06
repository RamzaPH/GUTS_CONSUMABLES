import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, ArrowUpDown, Edit2, X } from "lucide-react"
import Button from "../components/Button"
import { useSearch } from "../context/SearchContext"
import { getConsumptionReport, getHistoryLogs } from "../api/historyApi"

const ITEMS_PER_PAGE = 10

const ACTION_TYPES = {
  'Check In': { color: 'bg-green-100', textColor: 'text-green-700', badge: 'bg-green-500' },
  'Check Out': { color: 'bg-blue-100', textColor: 'text-blue-700', badge: 'bg-blue-500' },
  'Adjustment': { color: 'bg-yellow-100', textColor: 'text-yellow-700', badge: 'bg-yellow-500' },
  'Checkout': { color: 'bg-purple-100', textColor: 'text-purple-700', badge: 'bg-purple-500' },
  'Stock In': { color: 'bg-green-100', textColor: 'text-green-700', badge: 'bg-green-500' },
  'Stock Out': { color: 'bg-red-100', textColor: 'text-red-700', badge: 'bg-red-500' },
  'Delete': { color: 'bg-red-100', textColor: 'text-red-700', badge: 'bg-red-500' },
  'Archive': { color: 'bg-gray-100', textColor: 'text-gray-700', badge: 'bg-gray-500' },
}

const getActionColor = (actionType) => {
  return ACTION_TYPES[actionType] || { color: 'bg-slate-100', textColor: 'text-slate-700', badge: 'bg-slate-500' }
}

const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
}[char]))

const getLogoDataUrl = async () => {
  try {
    const response = await fetch('/guts-logo.png')
    if (!response.ok) return ''

    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result || '')
      reader.readAsDataURL(blob)
    })
  } catch {
    return ''
  }
}

const buildPrintFrame = async ({ title, subtitle, summaryItems, tableHeaders, tableRows, footer }) => {
  const logoDataUrl = await getLogoDataUrl()
  const printFrame = document.createElement('iframe')
  printFrame.style.position = 'fixed'
  printFrame.style.right = '0'
  printFrame.style.bottom = '0'
  printFrame.style.width = '0'
  printFrame.style.height = '0'
  printFrame.style.border = '0'
  printFrame.style.visibility = 'hidden'
  document.body.appendChild(printFrame)

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" alt="GUTS Logo" style="width:72px;height:72px;object-fit:contain;display:block;" />`
    : `<div style="width:72px;height:72px;border:2px solid #800000;border-radius:18px;display:flex;align-items:center;justify-content:center;color:#800000;font-weight:800;font-size:18px;">GUTS</div>`

  const summaryHtml = summaryItems.map((item) => `
    <div style="border:1px solid #cbd5e1;border-radius:12px;padding:10px 12px;background:#fff;">
      <div style="font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:4px;">${escapeHtml(item.label)}</div>
      <div style="font-size:13px;font-weight:700;color:#0f172a;line-height:1.4;">${escapeHtml(item.value)}</div>
    </div>
  `).join('')

  const headerCells = tableHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join('')
  const bodyRows = tableRows.map((row) => `
    <tr>
      ${row.map((cell) => `<td>${cell}</td>`).join('')}
    </tr>
  `).join('')

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
      <style>
        * { box-sizing: border-box; }
        @page { size: landscape; margin: 12mm; }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
          background: #fff;
          color: #0f172a;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .page {
          padding: 0;
        }
        .header {
          display: flex;
          align-items: center;
          gap: 16px;
          border-bottom: 3px solid #800000;
          padding-bottom: 14px;
          margin-bottom: 16px;
        }
        .title {
          font-size: 26px;
          font-weight: 800;
          color: #800000;
          margin: 0 0 4px 0;
          line-height: 1.1;
        }
        .subtitle {
          margin: 0;
          font-size: 14px;
          color: #475569;
          line-height: 1.4;
        }
        .summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
          font-size: 13px;
        }
        th, td {
          border: 1px solid #dbe2ea;
          padding: 11px 12px;
          text-align: left;
          vertical-align: top;
          white-space: normal;
          word-break: break-word;
        }
        th {
          background: #f8eef0;
          color: #800000;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .02em;
        }
        tbody tr:nth-child(even) td {
          background: #fafafa;
        }
        .footer {
          margin-top: 18px;
          padding-top: 12px;
          border-top: 1px solid #dbe2ea;
          text-align: center;
          color: #64748b;
          font-size: 12px;
        }
        tr { page-break-inside: avoid; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div>${logoHtml}</div>
          <div>
            <h1 class="title">${escapeHtml(title)}</h1>
            <p class="subtitle">${escapeHtml(subtitle)}</p>
          </div>
        </div>
        <div class="summary">${summaryHtml}</div>
        <table>
          <thead>
            <tr>${headerCells}</tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
        <div class="footer">${escapeHtml(footer)}</div>
      </div>
    </body>
    </html>
  `

  const cleanup = () => {
    setTimeout(() => {
      if (printFrame.parentNode) {
        printFrame.parentNode.removeChild(printFrame)
      }
    }, 500)
  }

  printFrame.onload = () => {
    const printWindow = printFrame.contentWindow
    printWindow.focus()
    printWindow.print()
    printWindow.onafterprint = cleanup
    setTimeout(cleanup, 2000)
  }

  printFrame.contentDocument.open()
  printFrame.contentDocument.write(html)
  printFrame.contentDocument.close()

  return printFrame
}

const History = () => {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [consumptionReport, setConsumptionReport] = useState({
    courses: [],
    batches: [],
    records: [],
    totals: { recordCount: 0, totalConsumed: 0 },
  })
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedBatchKey, setSelectedBatchKey] = useState('')
  const [isReportLoading, setIsReportLoading] = useState(true)
  const [selectedAction, setSelectedAction] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [searchUsername, setSearchUsername] = useState('')
  const [sortDate, setSortDate] = useState('DESC') // DESC or ASC
  const [currentPage, setCurrentPage] = useState(1)
  const [editingLog, setEditingLog] = useState(null)
  const [editDescription, setEditDescription] = useState('')
  const { searchQuery } = useSearch()

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)

      try {
        const data = await getHistoryLogs()
        setLogs(data)
      } catch {
        setLogs([])
      }

      setIsLoading(false)
    }

    load()
  }, [])

  useEffect(() => {
    const loadConsumptionReport = async () => {
      setIsReportLoading(true)

      try {
        const report = await getConsumptionReport({
          course: selectedCourse || undefined,
          batchKey: selectedBatchKey || undefined,
        })

        setConsumptionReport(report)

        if (selectedBatchKey && !report.batches.some((batch) => batch.batchKey === selectedBatchKey)) {
          setSelectedBatchKey('')
        }
      } catch (error) {
        console.error('Failed to load consumption report:', error)
        setConsumptionReport({
          courses: [],
          batches: [],
          records: [],
          totals: { recordCount: 0, totalConsumed: 0 },
        })
      } finally {
        setIsReportLoading(false)
      }
    }

    loadConsumptionReport()
  }, [selectedCourse, selectedBatchKey])

  const uniqueActions = useMemo(
    () => [...new Set(logs.map((log) => log.actionType))],
    [logs]
  )

  const selectedBatch = useMemo(
    () => consumptionReport.batches.find((batch) => batch.batchKey === selectedBatchKey),
    [consumptionReport.batches, selectedBatchKey]
  )

  const filteredLogs = useMemo(
    () => {
      let filtered = logs.filter((log) => {
        const matchesSearch = log.itemName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesAction = !selectedAction || log.actionType === selectedAction
        const matchesDate = !selectedDate || new Date(log.createdAt).toLocaleDateString('en-CA') === selectedDate
        const matchesUsername = !searchUsername || (log.performedBy || 'System').toLowerCase().includes(searchUsername.toLowerCase())
        return matchesSearch && matchesAction && matchesDate && matchesUsername
      })

      // Sort by date
      filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt)
        const dateB = new Date(b.createdAt)
        return sortDate === 'DESC' ? dateB - dateA : dateA - dateB
      })

      return filtered
    },
    [logs, searchQuery, selectedAction, selectedDate, searchUsername, sortDate]
  )

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedAction, selectedDate, searchUsername, sortDate])

  // Pagination calculations
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex)
  const recordsToDisplay = paginatedLogs

  const handleEditClick = (log) => {
    setEditingLog(log)
    setEditDescription(log.description || '')
  }

  const handleSaveEdit = () => {
    if (editingLog) {
      setLogs(logs.map(log => 
        log.id === editingLog.id 
          ? { ...log, description: editDescription }
          : log
      ))
      setEditingLog(null)
    }
  }

  const handlePrintAllRecords = async () => {
    const tableRows = filteredLogs.map((log) => [
      `<strong>${escapeHtml(log.itemName)}</strong>`,
      `<span style="display:inline-block;padding:4px 8px;border-radius:999px;background:${log.actionType === 'Stock Out' ? '#fee2e2' : log.actionType === 'Stock In' ? '#dcfce7' : '#e2e8f0'};color:${log.actionType === 'Stock Out' ? '#b91c1c' : log.actionType === 'Stock In' ? '#15803d' : '#475569'};font-weight:700;font-size:11px;">${escapeHtml(log.actionType)}</span>`,
      `<span style="font-weight:700;${log.quantityChanged > 0 ? 'color:#15803d' : log.quantityChanged < 0 ? 'color:#dc2626' : 'color:#475569'}">${log.quantityChanged > 0 ? '+' : ''}${escapeHtml(log.quantityChanged)}</span>`,
      escapeHtml(log.performedBy || 'System'),
      escapeHtml(log.startDate && log.endDate ? `${new Date(log.startDate).toLocaleDateString('en-PH')} - ${new Date(log.endDate).toLocaleDateString('en-PH')}` : '—'),
      escapeHtml(log.description || '—'),
      escapeHtml(new Date(log.createdAt).toLocaleString('en-PH')),
    ])

    await buildPrintFrame({
      title: 'Activity Logs Report',
      subtitle: 'All activity logs with the current filters applied',
      summaryItems: [
        { label: 'Scope', value: 'All Activity Logs' },
        { label: 'Filters', value: [selectedAction !== 'All' ? `Action: ${selectedAction}` : null, selectedDate ? `Date: ${selectedDate}` : null, searchUsername ? `User: ${searchUsername}` : null].filter(Boolean).join(' • ') || 'None' },
        { label: 'Total Records', value: `${filteredLogs.length}` },
      ],
      tableHeaders: ['Item Name', 'Action', 'Quantity Changed', 'Performed By', 'Duration', 'Details', 'Date & Time'],
      tableRows,
      footer: `Total records shown: ${filteredLogs.length}`,
    })
  }

  const handlePrintConsumptionReport = async () => {
    await buildPrintFrame({
      title: 'Consumption Report by Batch',
      subtitle: 'Consumption records grouped by course batch',
      summaryItems: [
        { label: 'Course', value: selectedCourse || 'All Courses' },
        { label: 'Batch', value: selectedBatch?.batchLabel || 'All Batches' },
        { label: 'Total', value: `${consumptionReport.totals.recordCount} records • ${consumptionReport.totals.totalConsumed} units` },
      ],
      tableHeaders: ['Item', 'Course', 'Batch', 'Qty Used', 'Performed By', 'Date & Time'],
      tableRows: consumptionReport.records.map((record) => [
        `<strong>${escapeHtml(record.itemName)}</strong>`,
        escapeHtml(record.course || '-'),
        escapeHtml(record.batchLabel),
        `<span style="font-weight:700;color:#dc2626">${Math.abs(record.quantityChanged || 0)}</span>`,
        escapeHtml(record.performedBy || 'System'),
        escapeHtml(new Date(record.createdAt).toLocaleString('en-PH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })),
      ]),
      footer: `Total records shown: ${consumptionReport.totals.recordCount}`,
    })
  }

  return (
    <section className="space-y-6">
      <div className="print:hidden">
        <h2 className="font-title text-3xl font-bold text-[var(--brand-primary)] dark:text-red-400 transition-colors duration-300">Activity Logs</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 transition-colors duration-300">Complete system activity history including all item movements, updates, and actions.</p>
      </div>

      {/* Consumption Report */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 transition-colors duration-300 dark:bg-slate-800 dark:border-slate-700">
        <div className="print-report-controls flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="print-report-note">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Consumption Report by Batch</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              View all consumption records per course batch and filter down to a specific batch.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrintConsumptionReport}
            disabled={isReportLoading || consumptionReport.records.length === 0}
            className="print-report-button inline-flex items-center justify-center rounded-lg bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-primary-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Print Batch Report
          </button>
        </div>

        <div className="print-report-controls grid gap-4 md:grid-cols-3 print:hidden">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Course</label>
            <select
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value)
                setSelectedBatchKey('')
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">All Courses</option>
              {consumptionReport.courses.map((course) => (
                <option key={course} value={course}>
                  {course}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Batch</label>
            <select
              value={selectedBatchKey}
              onChange={(e) => setSelectedBatchKey(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            >
              <option value="">All Batches</option>
              {consumptionReport.batches.map((batch) => (
                <option key={batch.batchKey} value={batch.batchKey}>
                  {batch.batchLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-700/50">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Summary</p>
            <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
              {isReportLoading
                ? 'Loading report...'
                : `${consumptionReport.totals.recordCount} records · ${consumptionReport.totals.totalConsumed} total units`}
            </p>
          </div>
        </div>

        {isReportLoading ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-400">
            Loading consumption report...
          </div>
        ) : consumptionReport.records.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-400">
            No consumption records found for the selected filters.
          </div>
        ) : (
          <div className="print-table-wrapper overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm dark:divide-slate-700">
                <thead className="bg-[#f8eef0] dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[var(--brand-primary)]">Item</th>
                    <th className="px-4 py-3 font-semibold text-[var(--brand-primary)]">Course</th>
                    <th className="px-4 py-3 font-semibold text-[var(--brand-primary)]">Batch</th>
                    <th className="px-4 py-3 font-semibold text-[var(--brand-primary)]">Qty Used</th>
                    <th className="px-4 py-3 font-semibold text-[var(--brand-primary)]">Performed By</th>
                    <th className="px-4 py-3 font-semibold text-[var(--brand-primary)]">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-800">
                  {consumptionReport.records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-700/60 transition">
                      <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 whitespace-normal break-words">{record.itemName}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-normal break-words">{record.course || '-'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-normal break-words">{record.batchLabel}</td>
                      <td className="px-4 py-3 font-semibold text-red-600">{Math.abs(record.quantityChanged || 0)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-normal break-words">{record.performedBy || 'System'}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {new Date(record.createdAt).toLocaleString('en-PH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 transition-colors duration-300 dark:bg-slate-800 dark:border-slate-700 print:hidden">
        {/* Search Bar */}
        <div>
          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2 transition-colors duration-300">Search by Username or Action:</label>
          <input
            type="text"
            placeholder="Enter username or search..."
            value={searchUsername}
            onChange={(e) => setSearchUsername(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-colors duration-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:placeholder:text-slate-400"
          />
        </div>

        {/* Date Filter and Sort Toggle */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-2 transition-colors duration-300">Filter by Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] transition-colors duration-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div>
            <button
              onClick={() => setSortDate(sortDate === 'DESC' ? 'ASC' : 'DESC')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium transition-colors duration-300 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200"
              title={`Sort by date (${sortDate === 'DESC' ? 'Newest' : 'Oldest'} first)`}
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortDate === 'DESC' ? 'Newest' : 'Oldest'}
            </button>
          </div>
        </div>

        {/* Action Type Filter */}
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors duration-300">Filter by Action Type:</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedAction('')}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                selectedAction === ''
                  ? 'bg-[var(--brand-primary)] text-white dark:bg-red-600'
                  : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              All Actions
            </button>
            {uniqueActions.map((action) => {
              const colors = getActionColor(action)
              return (
                <button
                  key={action}
                  onClick={() => setSelectedAction(action)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                    selectedAction === action
                      ? `${colors.badge} text-white`
                      : `${colors.color} ${colors.textColor} hover:opacity-80 dark:opacity-70 dark:hover:opacity-100`
                  }`}
                >
                  {action}
                </button>
              )
            })}
          </div>
        </div>

        {/* Clear Filters */}
        {(searchUsername || selectedDate || selectedAction) && (
          <button
            onClick={() => {
              setSearchUsername('')
              setSelectedDate('')
              setSelectedAction('')
            }}
            className="text-xs text-red-600 hover:text-red-700 font-medium dark:text-red-400 dark:hover:text-red-300 transition-colors duration-300"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Print Button */}
      <div className="flex justify-end print:hidden">
        <Button type="button" onClick={handlePrintAllRecords}>Print All Logs</Button>
      </div>

      {/* Logs Table */}
      {isLoading ? (
        <div className="rounded-2xl border border-[var(--brand-secondary-soft)] bg-white p-8 text-center text-sm text-slate-500">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[var(--brand-primary)]"></div>
          <p className="mt-3">Loading activity logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-[var(--brand-secondary-soft)] bg-white p-8 text-center text-sm text-slate-500">
          No activity logs found {selectedAction && `for action "${selectedAction}"`}.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--brand-secondary-soft)] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-[#f8eef0]">
                <tr>
                  <th className="px-5 py-4 font-semibold text-[var(--brand-primary)]">Item Name</th>
                  <th className="px-5 py-4 font-semibold text-[var(--brand-primary)]">Action</th>
                  <th className="px-5 py-4 font-semibold text-[var(--brand-primary)]">Quantity Changed</th>
                  <th className="px-5 py-4 font-semibold text-[var(--brand-primary)]">Performed By</th>
                  <th className="px-5 py-4 font-semibold text-[var(--brand-primary)]">Duration</th>
                  <th className="px-5 py-4 font-semibold text-[var(--brand-primary)]">Details</th>
                  <th className="px-5 py-4 font-semibold text-[var(--brand-primary)]">Date & Time</th>
                  <th className="px-5 py-4 font-semibold text-[var(--brand-primary)]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recordsToDisplay.map((log) => {
                  const colors = getActionColor(log.actionType)
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-4 font-medium text-slate-800">{log.itemName}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colors.color} ${colors.textColor}`}>
                          {log.actionType}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`font-semibold ${log.quantityChanged > 0 ? 'text-green-600' : log.quantityChanged < 0 ? 'text-red-600' : 'text-slate-600'}`}>
                          {log.quantityChanged > 0 ? '+' : ''}{log.quantityChanged}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        <div className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                          {log.performedBy || 'System'}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        {log.startDate && log.endDate
                          ? `${new Date(log.startDate).toLocaleDateString('en-PH')} - ${new Date(log.endDate).toLocaleDateString('en-PH')}`
                          : '-'}
                      </td>
                      <td className="px-5 py-4 text-slate-600 max-w-xs truncate">
                        {log.description || '-'}
                      </td>
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("en-PH", {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => handleEditClick(log)}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-200 transition"
                          title="Edit this record"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Summary Footer and Pagination */}
          <div className="bg-slate-50 px-5 py-4 text-sm border-t border-slate-200 print:hidden">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-slate-700">
                Total Records: <span className="text-[var(--brand-primary)]">{filteredLogs.length}</span> {selectedAction && `| Filter: ${selectedAction}`}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-600">
                    Page <span className="font-semibold">{currentPage}</span> of <span className="font-semibold">{totalPages}</span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="font-semibold text-slate-900">Edit History Record</h3>
              <button
                onClick={() => setEditingLog(null)}
                className="text-slate-400 hover:text-slate-600"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4 px-6 py-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Item Name</label>
                <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{editingLog.itemName}</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Action Type</label>
                <p className="text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg">{editingLog.actionType}</p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Status / Details (Edit)</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter updated details or status..."
                  rows="4"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium transition"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-strong)] font-medium transition"
                  type="button"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default History
