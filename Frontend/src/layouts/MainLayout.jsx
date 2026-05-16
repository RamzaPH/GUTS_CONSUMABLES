import { useState } from "react"
import { Menu } from "lucide-react"
import { Outlet, useLocation } from "react-router-dom"
import Navbar from "../components/Navbar"
import Sidebar from "../components/Sidebar"
import Button from "../components/Button"

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const location = useLocation()
  const shouldShowPrintHeader = !location.pathname.startsWith("/history")

  return (
    <div className="min-h-screen bg-[var(--brand-base)]">
      <aside
        className={`hidden fixed left-0 top-0 z-40 h-screen overflow-hidden border-r border-slate-700/70 bg-[var(--brand-accent)] transition-all duration-300 md:block print:hidden ${
          isSidebarCollapsed ? "w-20" : "w-64 xl:w-72"
        }`}
      >
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        />
      </aside>

      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "md:pl-20" : "md:pl-64 xl:pl-72"
        }`}
      >
        <div
          className={`fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-300 md:hidden ${
            isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={() => setIsSidebarOpen(false)}
        >
          <aside
            className={`h-[100dvh] w-[86vw] max-w-xs overflow-hidden bg-[var(--brand-accent)] shadow-2xl transition-transform duration-300 ${
              isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <Sidebar isMobile onNavigate={() => setIsSidebarOpen(false)} />
          </aside>
        </div>

        <div className="sticky top-0 z-30">
          <Navbar />
        </div>

        <main className="flex-1 p-3 transition-all duration-300 sm:p-4 md:p-6 lg:p-8">
          {shouldShowPrintHeader && (
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
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default MainLayout
