import client from './client'

export const searchPatients = async (q) =>
  client.get('/patients/', { params: q ? { q } : {} })

export const listWards = async () =>
  client.get('/wards/')

export const listBeds = async (ward, status) =>
  client.get('/beds/', { params: { ward, ...(status ? { status } : {}) } })

export const listDoctors = async (department) =>
  client.get('/doctors/', { params: department ? { department } : {} })
