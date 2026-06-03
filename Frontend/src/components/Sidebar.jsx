import { Archive as BoxArchive, ChevronLeft, ChevronDown, Clock, LayoutDashboard, PackageOpen, ShieldCheck, Wrench, LogOut, User, Users, BookOpen, Settings, Inbox, X } from "lucide-react"
import { NavLink, useLocation, useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { getActiveCourses } from "../api/courseApi"
import AddUserModal from "./AddUserModal"
import UserManagementModal from "./UserManagementModal"
import TrainerManagementModal from "./TrainerManagementModal"
import CourseManagementModal from "./CourseManagementModal"
import AdminRequestPanel from "./AdminRequestPanel"

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }
]

const settingsItems = [
  { to: "/history", label: "Activity Logs", icon: Clock },
  { to: "/archive", label: "Archive Vault", icon: BoxArchive }
]

const adminPanelItems = [
  { label: "Manage Users", icon: Users, onClick: "users" },
  { label: "Manage Trainers", icon: Wrench, onClick: "trainers" },
  { label: "Manage Courses", icon: BookOpen, onClick: "courses" },
  { label: "Pending Requests", icon: Inbox, onClick: "requests" }
]

const Sidebar = ({ isCollapsed = false, onToggleCollapse, isMobile = false, onNavigate, onClose }) => {
  const { user, logout } = useAuth()
  const { success } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false)
  const [isTrainerManagementOpen, setIsTrainerManagementOpen] = useState(false)
  const [isCourseManagementOpen, setIsCourseManagementOpen] = useState(false)
  const [isRequestPanelOpen, setIsRequestPanelOpen] = useState(false)
  const [courseItems, setCourseItems] = useState([])
  const [isCoursesOpen, setIsCoursesOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const handleAddUserSuccess = (fullName, role) => {
    success(`User "${fullName}" created successfully as ${role}!`)
  }

  const handleCoursesUpdated = () => {
    fetchCourses()
  }

  const fetchCourses = async () => {
    try {
      const data = await getActiveCourses()
      const determineTrackPath = (course) => {
        const code = String(course.code || '').toLowerCase()
        const name = String(course.name || '').toLowerCase()
        if (code.includes('eim') || name.includes('eim')) return '/eim'
        if (code.includes('smaw') || name.includes('smaw')) return '/smaw'
        if (code.includes('css') || name.includes('css')) return '/css'
        return `/${String(course.code || '').split(/\s+/)[0].toLowerCase()}`
      }

      const courses = (data.courses || []).map(course => ({
        to: determineTrackPath(course),
        label: course.name,
        icon: PackageOpen,
      }))
      setCourseItems(courses)
    } catch (err) {
      console.error('Error fetching courses:', err)
    }
  }

  // Fetch courses on mount
  useEffect(() => {
    fetchCourses()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const shouldOpenPending = params.get("openPendingRequests") === "1"

    if (shouldOpenPending && user?.role === "admin") {
      setIsRequestPanelOpen(true)
      if (location.pathname !== "/dashboard") {
        navigate("/dashboard", { replace: true })
      } else {
        navigate("/dashboard", { replace: true })
      }
    }
  }, [location.pathname, location.search, navigate, user?.role])

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden ${isMobile ? "h-[100dvh] pb-0" : "h-full"}`}>
      <div className={`shrink-0 border-b border-slate-600/80 py-3 transition-all duration-300 ${isCollapsed ? "px-3" : "px-5"}`}>
        {isMobile && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-300">
              Menu
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-slate-600/80 bg-slate-700/50 p-2 text-slate-200 transition hover:bg-slate-700"
              aria-label="Close navigation menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {!isMobile ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`mb-2 inline-flex items-center justify-center rounded-lg border border-slate-600/80 bg-slate-700/50 p-2 text-slate-200 transition hover:bg-slate-700 ${isCollapsed ? "w-full" : "ml-auto"}`}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? "rotate-180" : "rotate-0"}`} />
          </button>
        ) : null}

        <div className={`mx-auto flex justify-center rounded-xl bg-slate-800/50 transition-all duration-300 ${isMobile ? "w-full max-w-[150px] p-2.5" : isCollapsed ? "w-12 p-2" : "w-full max-w-[150px] p-2.5"}`}>
          <img
            src="/guts-logo.png"
            alt="GUTS TESDA logo"
            className={`object-contain transition-all duration-300 ${isMobile ? "h-[72px] w-full" : isCollapsed ? "h-10 w-10" : "h-[72px] w-full"}`}
          />
        </div>
        <p className={`mt-2 text-center text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-300 transition-all duration-300 ${isMobile ? "max-h-10 opacity-100" : isCollapsed ? "max-h-0 opacity-0" : "max-h-10 opacity-100"}`}>
          GUTS CONSUMABLE MONITORING SYSTEM
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain sidebar-scroll" tabIndex={0} aria-label="Sidebar navigation" role="navigation">
          <nav className={`mt-6 space-y-3 py-3 transition-all duration-300 ${isCollapsed ? "px-2" : "px-4"}`}>
        {/* Dashboard */}
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={isCollapsed ? item.label : undefined}
              onClick={onNavigate}
              className={({ isActive }) =>
                `group flex min-h-11 items-center rounded-r-xl border-l-4 py-3 text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? "border-[var(--brand-primary)] bg-slate-100 text-[var(--brand-primary)]"
                    : "border-transparent text-slate-200 hover:bg-slate-700/70 hover:text-white"
                } ${isCollapsed ? "justify-center px-2" : "gap-3 px-5"}`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? "max-w-0 opacity-0" : "max-w-[140px] opacity-100"}`}
              >
                {item.label}
              </span>
            </NavLink>
          )
        })}

        {/* Courses Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation() // FIX: Prevents sidebar from auto-expanding
              setIsCoursesOpen(!isCoursesOpen)
            }}
            title={isCollapsed ? "Courses" : undefined}
            className={`w-full group flex min-h-11 items-center rounded-r-xl border-l-4 py-3 text-sm font-semibold transition-all duration-300 border-transparent text-slate-200 hover:bg-slate-700/70 hover:text-white ${isCollapsed ? "justify-center px-2" : "gap-3 px-5"}`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? "max-w-0 opacity-0" : "max-w-[100px] opacity-100"}`}
            >
              Courses
            </span>
            {!isCollapsed && (
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${isCoursesOpen ? "rotate-180" : "rotate-0"}`}
              />
            )}
          </button>

          {/* Course Items - Dropdown (Floating when collapsed) */}
          {isCoursesOpen && (
            <div 
              className={`space-y-2 transition-all duration-300 ${
                isCollapsed 
                  ? "absolute left-full top-0 ml-3 w-48 rounded-xl bg-slate-800 p-2 shadow-xl border border-slate-600/80 z-50" 
                  : "mt-2 pl-2"
              }`}
            >
              {courseItems.length > 0 ? (
                courseItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={(e) => {
                        e.stopPropagation()
                        onNavigate && onNavigate()
                        if (isCollapsed) setIsCoursesOpen(false)
                      }}
                      className={({ isActive }) =>
                        `group flex min-h-10 items-center rounded-lg border-l-4 py-2 px-3 text-xs font-semibold transition-all duration-300 ${
                          isActive
                            ? "border-[var(--brand-primary)] bg-slate-100 text-[var(--brand-primary)]"
                            : "border-transparent text-slate-300 hover:bg-slate-700/50 hover:text-white"
                        }`
                      }
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className={`whitespace-nowrap ml-3 transition-all duration-300 ${isCollapsed ? "max-w-full opacity-100" : "max-w-[100px] opacity-100"}`}>
                        {item.label}
                      </span>
                    </NavLink>
                  )
                })
              ) : (
                <div className={`text-xs text-slate-400 px-3 py-2`}>
                  No courses available
                </div>
              )}
            </div>
          )}
        </div>
          </nav>

          <div className={`mt-8 border-t border-slate-600/80 py-4 transition-all duration-300 ${isCollapsed ? "px-2" : "px-4"}`}>
          {/* Settings Dropdown */}
          <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation() // FIX: Prevents sidebar from auto-expanding
              setIsSettingsOpen(!isSettingsOpen)
            }}
            title={isCollapsed ? "Settings" : undefined}
            className={`w-full group flex min-h-11 items-center rounded-r-xl border-l-4 py-3 text-sm font-semibold transition-all duration-300 border-transparent text-slate-200 hover:bg-slate-700/70 hover:text-white ${isCollapsed ? "justify-center px-2" : "gap-3 px-5"}`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span
              className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? "max-w-0 opacity-0" : "max-w-[100px] opacity-100"}`}
            >
              Settings
            </span>
            {!isCollapsed && (
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${isSettingsOpen ? "rotate-180" : "rotate-0"}`}
              />
            )}
          </button>

          {/* Settings Items - Dropdown (Floating when collapsed) */}
          {isSettingsOpen && (
            <div 
              className={`space-y-2 transition-all duration-300 ${
                isCollapsed 
                  ? "absolute left-full top-0 ml-3 w-48 rounded-xl bg-slate-800 p-2 shadow-xl border border-slate-600/80 z-50" 
                  : "mt-2 pl-2"
              }`}
            >
              {settingsItems
                .filter(item => {
                  if (item.label === "Archive Vault" && user?.role !== "admin") return false
                  return true
                })
                .map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={(e) => {
                      e.stopPropagation()
                      onNavigate && onNavigate()
                      if (isCollapsed) setIsSettingsOpen(false)
                    }}
                    className={({ isActive }) =>
                      `group flex min-h-10 items-center rounded-lg border-l-4 py-2 px-3 text-xs font-semibold transition-all duration-300 ${
                        isActive
                          ? "border-[var(--brand-primary)] bg-slate-100 text-[var(--brand-primary)]"
                          : "border-transparent text-slate-300 hover:bg-slate-700/50 hover:text-white"
                      }`
                    }
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className={`whitespace-nowrap ml-3 transition-all duration-300 ${isCollapsed ? "max-w-full opacity-100" : "max-w-[100px] opacity-100"}`}>
                      {item.label}
                    </span>
                  </NavLink>
                )
              })}
            </div>
          )}
        </div>

          {/* Admin Panel Dropdown */}
          {user?.role === "admin" && (
            <div className="relative mt-6">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsAdminPanelOpen(!isAdminPanelOpen)
              }}
              title={isCollapsed ? "Admin Panel" : undefined}
              className={`group flex min-h-11 w-full items-center rounded-r-xl border-l-4 py-3 text-sm font-semibold transition-all duration-300 border-transparent text-slate-200 hover:bg-slate-700/70 hover:text-white ${isCollapsed ? "justify-center px-2" : "gap-3 px-5"}`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? "max-w-0 opacity-0" : "max-w-[120px] opacity-100"}`}
              >
                Admin Panel
              </span>
              {!isCollapsed && (
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-300 ${isAdminPanelOpen ? "rotate-180" : "rotate-0"}`}
                />
              )}
            </button>

            {isAdminPanelOpen && (
              <div
                className={`space-y-2 transition-all duration-300 ${
                  isCollapsed
                    ? "absolute left-full top-0 ml-3 w-56 rounded-xl border border-slate-600/80 bg-slate-800 p-2 shadow-xl z-50"
                    : "mt-2 pl-2"
                }`}
              >
                {adminPanelItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => {
                        if (item.onClick === "users") setIsUserManagementOpen(true)
                        if (item.onClick === "trainers") setIsTrainerManagementOpen(true)
                        if (item.onClick === "courses") setIsCourseManagementOpen(true)
                        if (item.onClick === "requests") setIsRequestPanelOpen(true)
                        if (isCollapsed) setIsAdminPanelOpen(false)
                      }}
                      className="group flex min-h-10 w-full items-center gap-3 rounded-lg border-l-4 border-transparent bg-slate-700/50 px-3 py-2 text-xs font-semibold text-slate-200 transition-all duration-300 hover:bg-slate-700 hover:text-white"
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* User Profile Section - Fixed at bottom */}
      <div className={`mt-auto shrink-0 border-t border-slate-600/80 py-4 transition-all duration-300 ${isCollapsed ? "px-2" : "px-4"}`}>
        {/* Profile Card */}
        <button
          type="button"
          onClick={() => user?.role === "admin" ? setIsUserManagementOpen(true) : null}
          className={`w-full rounded-lg bg-slate-700/50 p-3 mb-3 transition-all duration-300 ${
            user?.role === "admin"
              ? "hover:bg-slate-700 cursor-pointer group"
              : "cursor-default"
          }`}
          title={user?.role === "admin" ? "Click to manage users" : ""}
          disabled={user?.role !== "admin"}
        >
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 h-8 w-8 rounded-full bg-[var(--brand-primary)] flex items-center justify-center transition-all ${
              user?.role === "admin" ? "group-hover:ring-2 ring-[var(--brand-primary)]/50" : ""
            }`}>
              <User className="h-4 w-4 text-white" />
            </div>
            <div className={`transition-all duration-300 overflow-hidden ${isCollapsed ? "max-w-0 opacity-0" : "max-w-[140px] opacity-100"}`}>
              <p className="text-xs font-semibold text-white truncate">{user?.fullName || "User"}</p>
              <p className={`text-xs truncate ${user?.role === "admin" ? "text-yellow-300" : "text-slate-300"}`}>
                {user?.role === "admin" ? "👤 System Administrator" : user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "staff"}
              </p>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className={`w-full flex items-center rounded-lg py-2.5 px-3 text-sm font-semibold text-slate-200 hover:bg-red-600/20 hover:text-red-300 transition-all duration-300 ${isCollapsed ? "justify-center" : "gap-3"}`}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span
            className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? "max-w-0 opacity-0" : "max-w-[140px] opacity-100"}`}
          >
            Logout
          </span>
        </button>

        {/* Version Display */}
        <div className={`mt-4 pt-3 border-t border-slate-600/80 text-center transition-all duration-300 ${isCollapsed ? "px-2" : "px-4"}`}>
          <p className={`text-xs font-semibold text-slate-400 transition-all duration-300 ${isCollapsed ? "max-h-0 opacity-0" : "max-h-10 opacity-100"}`}>
            Version 0.1
          </p>
        </div>
      </div>

      {/* Modals */}
      {user?.role === "admin" && (
        <>
          <AddUserModal
            isOpen={isAddUserOpen}
            onClose={() => setIsAddUserOpen(false)}
            onSuccess={handleAddUserSuccess}
          />
          <UserManagementModal
            isOpen={isUserManagementOpen}
            onClose={() => setIsUserManagementOpen(false)}
          />
          <TrainerManagementModal
            isOpen={isTrainerManagementOpen}
            onClose={() => setIsTrainerManagementOpen(false)}
          />
          <CourseManagementModal
            isOpen={isCourseManagementOpen}
            onClose={() => setIsCourseManagementOpen(false)}
            onCoursesUpdated={handleCoursesUpdated}
          />
          <AdminRequestPanel
            isOpen={isRequestPanelOpen}
            onClose={() => setIsRequestPanelOpen(false)}
          />
        </>
      )}
    </div>
  )
}

export default Sidebar