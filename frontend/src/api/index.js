import api from "./client";

// Auth
export const register = (data) => api.post("/auth/register", data);
export const login = (data) => api.post("/auth/login", data);
export const googleLogin = (credential) => api.post("/auth/google", { credential });
export const getMe = () => api.get("/auth/me");

// Plan & Payment
export const getPlan = () => api.get("/plan");
export const createPayment = (plan) => api.post("/payment/create", { plan });
export const verifyPayment = (order_id) =>
  api.post("/payment/verify", { order_id });
export const downgradePlan = (plan) => api.post("/plan/downgrade", { plan });

// Stages
export const getStages = () => api.get("/stages");

// Leads
export const getLeads = (params) => api.get("/leads", { params });
export const getLead = (id) => api.get(`/leads/${id}`);
export const createLead = (data) => api.post("/leads", data);
export const updateLead = (id, data) => api.put(`/leads/${id}`, data);
export const deleteLead = (id) => api.delete(`/leads/${id}`);
export const moveLead = (id, stage_id, close_reason, close_note) =>
  api.patch(`/leads/${id}/stage`, { stage_id, close_reason, close_note });
export const assignLead = (id, owner_id) =>
  api.patch(`/leads/${id}/assign`, { owner_id });
export const exportLeads = () => api.get("/leads/export", { responseType: "blob" });
export const importLeads = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/leads/import", formData);
};

// Contacts
export const getContacts = () => api.get("/contacts");
export const createContact = (data) => api.post("/contacts", data);
export const updateContact = (id, data) => api.put(`/contacts/${id}`, data);
export const deleteContact = (id) => api.delete(`/contacts/${id}`);
export const exportContacts = () => api.get("/contacts/export", { responseType: "blob" });
export const importContacts = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/contacts/import", formData);
};

// Activities
export const getActivities = (leadId) => api.get(`/leads/${leadId}/activities`);
export const createActivity = (leadId, data) =>
  api.post(`/leads/${leadId}/activities`, data);
export const updateActivity = (leadId, activityId, data) =>
  api.put(`/leads/${leadId}/activities/${activityId}`, data);
export const deleteActivity = (leadId, activityId) =>
  api.delete(`/leads/${leadId}/activities/${activityId}`);

// Dashboard
export const getStats = () => api.get("/dashboard/stats");

// Tasks
export const getTasks = (params) => api.get("/tasks", { params });
export const createTask = (data) => api.post("/tasks", data);
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data);
export const completeTask = (id) => api.patch(`/tasks/${id}/complete`);
export const deleteTask = (id) => api.delete(`/tasks/${id}`);

// Reports
export const getReportSummary = (days) =>
  api.get("/reports/summary", { params: { days } });

// Global search
export const globalSearch = (q) => api.get("/search", { params: { q } });

// Notifications
export const getNotifications = () => api.get("/notifications");
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch("/notifications/read-all");

// Team
export const getTeamMembers = () => api.get("/team/members");
export const inviteMember = (data) => api.post("/team/invite", data);
export const updateMemberRole = (id, role) =>
  api.patch(`/team/members/${id}/role`, { role });
export const removeMember = (id) => api.delete(`/team/members/${id}`);
export const getInviteInfo = (token) => api.get(`/auth/invite/${token}`);
export const acceptInvite = (token, password) =>
  api.post("/auth/accept-invite", { token, password });
