import { useState } from "react"
import { Menu } from "lucide-react"
import { Outlet } from "react-router-dom"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import Button from "../components/Button"

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen w-full bg-[var(--brand-base)]">
      <div className="flex min-h-screen w-full">
        <aside
          className={`hidden min-h-full flex-grow-0 border-r border-slate-700/70 bg-[var(--brand-accent)] transition-all duration-300 md:block print:hidden ${
            isSidebarCollapsed ? "w-20" : "w-72"
          }`}
        >
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          />
        </aside>

        <div className="relative w-full flex-1 min-h-screen flex flex-col transition-all duration-300">
          <div
            className={`fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-300 md:hidden ${
              isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            onClick={() => setIsSidebarOpen(false)}
          >
            <aside
              className={`h-full w-[86vw] max-w-xs bg-[var(--brand-accent)] shadow-2xl transition-transform duration-300 ${
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
              }`}
              onClick={(event) => event.stopPropagation()}
            >
              <Sidebar isMobile onNavigate={() => setIsSidebarOpen(false)} />
            </aside>
          </div>

          <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-3 sm:px-4 md:hidden print:hidden">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">TESDA</p>
              <p className="font-title text-sm font-semibold text-slate-800 sm:text-base">GUTS Inventory</p>
            </div>
            <Button className="px-2 py-2 min-h-11 min-w-11" onClick={() => setIsSidebarOpen(true)} aria-label="Open sidebar">
              <Menu className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 flex flex-col bg-slate-50 transition-all duration-300">
            {/* Print-only header — hidden on screen, visible when printing */}
            <div className="hidden print:flex print:items-center print:gap-5 print:border-b print:border-slate-300 print:pb-4 print:mb-4 print:px-6 print:pt-6">
              <img
                src="/guts-logo.png"
                alt="GUTS Logo"
                className="h-20 w-20 object-contain print:h-24 print:w-24"
                style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
              />
              <div>
                <p className="text-xl font-bold" style={{ color: '#800000' }}>Guardians Technical School Inc.</p>
                <p className="text-sm text-slate-600">TESDA Consumables Status Report</p>
                <p className="text-xs text-slate-400">{new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
            </div>
            <div className="sticky top-0 z-30">
              <Navbar />
            </div>
            <main className="flex-1 p-3 transition-all duration-300 sm:p-4 md:p-6 lg:p-8">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MainLayout
