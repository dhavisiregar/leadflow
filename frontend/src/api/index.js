import api from "./client";

// Auth
export const register = (data) => api.post("/auth/register", data);
export const login = (data) => api.post("/auth/login", data);
export const googleLogin = (credential) => api.post("/auth/google", { credential });
export const getMe = () => api.get("/auth/me");

// Stages
export const getStages = () => api.get("/stages");

// Leads
export const getLeads = (params) => api.get("/leads", { params });
export const getLead = (id) => api.get(`/leads/${id}`);
export const createLead = (data) => api.post("/leads", data);
export const updateLead = (id, data) => api.put(`/leads/${id}`, data);
export const deleteLead = (id) => api.delete(`/leads/${id}`);
export const moveLead = (id, stage_id) => api.patch(`/leads/${id}/stage`, { stage_id });
export const updateLeadStatus = (id, status, close_reason, close_note) =>
  api.patch(`/leads/${id}/status`, { status, close_reason, close_note });

// Lead products & services
export const addLeadService = (leadId, data) =>
  api.post(`/leads/${leadId}/services`, data);
export const removeLeadService = (leadId, serviceId) =>
  api.delete(`/leads/${leadId}/services/${serviceId}`);

// Teams
export const getTeams = () => api.get("/teams");
export const createTeam = (data) => api.post("/teams", data);
export const updateTeam = (id, data) => api.put(`/teams/${id}`, data);
export const deleteTeam = (id) => api.delete(`/teams/${id}`);

// Team members
export const getTeamMembers = () => api.get("/team-members");
export const createTeamMember = (data) => api.post("/team-members", data);
export const updateTeamMember = (id, data) => api.put(`/team-members/${id}`, data);
export const deleteTeamMember = (id) => api.delete(`/team-members/${id}`);

// Activities (Notes & updates)
export const getActivities = (leadId) => api.get(`/leads/${leadId}/activities`);
export const createActivity = (leadId, note) =>
  api.post(`/leads/${leadId}/activities`, { note });
export const updateActivity = (leadId, activityId, note) =>
  api.put(`/leads/${leadId}/activities/${activityId}`, { note });
export const deleteActivity = (leadId, activityId) =>
  api.delete(`/leads/${leadId}/activities/${activityId}`);

// Dashboard
export const getAnalytics = (params) => api.get("/dashboard/analytics", { params });
