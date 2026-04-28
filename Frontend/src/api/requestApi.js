import api from "./axios"

export const submitRequest = async (payload) => {
  const response = await api.post('/requests', payload)
  return response.data
}