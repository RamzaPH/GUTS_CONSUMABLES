import api from "./axios"

export const getHistoryLogs = async ({ category, itemId } = {}) => {
  const params = {}
  if (category) params.category = category
  if (itemId) params.itemId = itemId
  const response = await api.get("/history", { params })
  return response.data?.logs || []
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

export const recalculateInventoryHistory = async (consumableId, location = 'main') => {
  const response = await api.post(`/history/${consumableId}/recalculate`, {}, {
    params: { location }
  })
  return response.data
}
