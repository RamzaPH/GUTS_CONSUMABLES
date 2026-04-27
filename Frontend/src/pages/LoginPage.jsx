import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Lock, User } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { login as loginApi } from "../api/authApi"

const LoginPage = () => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      console.log("🔐 Attempting login with username:", username)
      const data = await loginApi(username, password)
      console.log("✅ Login response received:", data)

      // Update auth context and localStorage
      login(data.user, data.token)
      console.log("✅ Auth context updated")

      // Show success toast
      success(`Welcome ${data.user.fullName || username}! 🎉`)
      
      // Small delay to ensure state is updated before navigation
      setTimeout(() => {
        console.log("🚀 Navigating to dashboard")
        navigate("/dashboard", { replace: true })
      }, 500)
    } catch (err) {
      console.error("❌ Login error:", err)
      const errorMessage = err.response?.data?.error || err.message || "Login failed. Please try again."
      setError(errorMessage)
      showError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-t from-[#800000] to-white px-3 py-6 sm:px-4 sm:py-8">
      <div className="w-full max-w-md">
        {/* Card with gradient background */}
        <div className="relative isolate rounded-3xl overflow-hidden">
          <div className="absolute -top-8 left-8 right-8 h-24 rounded-full bg-white/35 blur-3xl opacity-90 pointer-events-none" />
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/10 via-white/5 to-transparent ring-1 ring-white/20 pointer-events-none" />
          <div className="relative -translate-y-1 rounded-3xl bg-gradient-to-b from-maroon-900 via-maroon-700 to-maroon-600 shadow-2xl shadow-[#5a0000]/55 overflow-hidden border border-white/10 backdrop-blur-sm">
          {/* Header Section */}
          <div className="px-5 py-8 text-center sm:px-6 sm:py-12">
            <div className="flex justify-center mb-4">
              <img 
                src="/guts-logo.png" 
                alt="GUTS Logo" 
                className="h-10 w-10 object-contain sm:h-12 sm:w-12"
              />
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-4xl">
              GUTS Consumables
            </h1>
            <p className="mt-2 text-xs font-medium text-white/90 sm:text-sm">
              Guardians Technical School - TESDA Training Center
            </p>
          </div>

          {/* Form Section */}
          <div className="px-5 py-6 sm:px-6 sm:py-8">
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Username Field */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 sm:text-base"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-11 text-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30 sm:text-base"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 flex min-h-9 min-w-9 items-center justify-center rounded text-slate-400 transition hover:text-slate-600"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-5 w-full rounded-lg bg-red-950 py-3 font-bold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 sm:mt-6"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Support Text */}
            <div className="mt-5 text-center sm:mt-6">
              <p className="text-[11px] text-white/90 sm:text-xs">
                For login support, contact your administrator.
              </p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
