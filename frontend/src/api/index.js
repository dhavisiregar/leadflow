import api from './client'

// Auth
export const register = (data) => api.post('/auth/register', data)
export const login = (data) => api.post('/auth/login', data)
export const getMe = () => api.get('/auth/me')

// Plan & Payment
export const getPlan = () => api.get('/plan')
export const createPayment = (plan) => api.post('/payment/create', { plan })

// Stages
export const getStages = () => api.get('/stages')

// Leads
export const getLeads = (params) => api.get('/leads', { params })
export const getLead = (id) => api.get(`/leads/${id}`)
export const createLead = (data) => api.post('/leads', data)
export const updateLead = (id, data) => api.put(`/leads/${id}`, data)
export const deleteLead = (id) => api.delete(`/leads/${id}`)
export const moveLead = (id, stage_id) => api.patch(`/leads/${id}/stage`, { stage_id })

// Contacts
export const getContacts = () => api.get('/contacts')
export const createContact = (data) => api.post('/contacts', data)
export const updateContact = (id, data) => api.put(`/contacts/${id}`, data)
export const deleteContact = (id) => api.delete(`/contacts/${id}`)

// Activities
export const getActivities = (leadId) => api.get(`/leads/${leadId}/activities`)
export const createActivity = (leadId, data) => api.post(`/leads/${leadId}/activities`, data)

// Dashboard
export const getStats = () => api.get('/dashboard/stats')
