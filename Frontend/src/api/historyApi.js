import api from "./axios"

export const getHistoryLogs = async ({ category, itemId, all, archived } = {}) => {
  const params = {}
  if (category) params.category = category
  if (itemId) params.itemId = itemId
  if (all) params.all = true
  if (archived) params.archived = true
  const response = await api.get("/history", { params })
  return response.data?.logs || []
}

export const archiveHistoryRecord = async (id) => {
  const response = await api.patch(`/history/${id}/archive`)
  return response.data
}

export const restoreHistoryRecord = async (id) => {
  const response = await api.put(`/history/${id}/restore`)
  return response.data
}

export const getConsumptionReport = async ({ course, batchKey } = {}) => {
  const params = {}
  if (course) params.course = course
  if (batchKey) params.batchKey = batchKey

  const response = await api.get("/history/consumption-report", { params })
  return response.data || { courses: [], batches: [], records: [], totals: { recordCount: 0, totalConsumed: 0 } }
}

export const updateHistoryRecord = async (id, data) => {
  const response = await api.put(`/history/${id}`, data)
  return response.data
}

export const deleteHistoryRecord = async (id) => {
  const response = await api.delete(`/history/${id}`)
  return response.data
}

export const recalculateInventoryHistory = async (consumableId, location = 'main') => {
  const response = await api.post(`/history/${consumableId}/recalculate`, {}, {
    params: { location }
  })
  return response.data
}
