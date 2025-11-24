import client from './client'

export const listAdmissions = async (params = {}) => {
  return client.get('/admissions/', { params })
}

export const createAdmission = async (payload) => {
  return client.post('/admissions/', payload)
}
