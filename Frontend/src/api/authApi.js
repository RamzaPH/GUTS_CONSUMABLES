import api from './axios'

// Admin: Create a new user
export const createUser = async (userData) => {
  const response = await api.post('/auth/admin/create-user', userData)
  return response.data
}

// Admin: Get all users
export const getUsers = async () => {
  const response = await api.get('/auth/admin/users')
  return response.data
}

// Admin: Update user
export const updateUser = async (userId, userData) => {
  const response = await api.put(`/auth/admin/users/${userId}`, userData)
  return response.data
}

// Admin: Delete/Deactivate user
export const deleteUser = async (userId) => {
  const response = await api.delete(`/auth/admin/users/${userId}`)
  return response.data
}

// Admin: Restore archived user
export const restoreUser = async (userId) => {
  const response = await api.patch(`/auth/admin/users/${userId}/restore`)
  return response.data
}

// Login
export const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password })
  return response.data
}

// Get profile
export const getProfile = async () => {
  const response = await api.get('/auth/profile')
  return response.data
}

// ─── Trainer Management ────────────────────────────────────────────────────────

// Admin: Create a new trainer
export const createTrainer = async (trainerData) => {
  const response = await api.post('/admin/trainers', trainerData)
  return response.data
}

// Admin: Get all trainers (including inactive)
export const getAllTrainers = async () => {
  const response = await api.get('/admin/trainers')
  return response.data
}

// Get active trainers
export const getTrainers = async () => {
  const response = await api.get('/trainers')
  return response.data
}

// Admin: Update trainer
export const updateTrainer = async (trainerId, trainerData) => {
  const response = await api.put(`/admin/trainers/${trainerId}`, trainerData)
  return response.data
}

// Admin: Delete/Deactivate trainer
export const deleteTrainer = async (trainerId) => {
  const response = await api.delete(`/admin/trainers/${trainerId}`)
  return response.data
}
