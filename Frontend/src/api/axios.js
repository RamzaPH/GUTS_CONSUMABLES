import axios from "axios"

const DEFAULT_API_BASE_URL = "https://guts-inventory.onrender.com/api"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || DEFAULT_API_BASE_URL,
  timeout: 30000
})

// Add Authorization header with JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Handle 401 responses (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Skip auto-redirect for login endpoint (let LoginPage handle the error)
      if (error.config?.url !== '/auth/login') {
        // Clear auth data and redirect to login for other endpoints
        localStorage.removeItem("token")
        localStorage.removeItem("user")
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  }
)

export default api
