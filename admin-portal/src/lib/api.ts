import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('adminToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const sendAdminOtp = (data: { email: string }) =>
  api.post('/auth/admin/send-otp', data);
export const verifyAdminOtp = (data: { email: string; otp: string }) =>
  api.post('/auth/admin/verify-otp', data);

// Dashboard
export const getDashboardStats = () => api.get('/admin/dashboard');

// Countries
export const getCountries = () => api.get('/admin/countries');
export const createCountry = (data: object) => api.post('/admin/countries', data);
export const updateCountry = (id: string, data: object) => api.put(`/admin/countries/${id}`, data);
export const deleteCountry = (id: string) => api.delete(`/admin/countries/${id}`);
export const toggleCountry = (id: string) => api.patch(`/admin/countries/${id}/toggle`);

// Visa Types
export const getVisaTypes = (countryId?: string) =>
  api.get('/admin/visa-types', { params: { country: countryId } });
export const getVisaType = (id: string) => api.get(`/admin/visa-types/${id}`);
export const createVisaType = (data: object) => api.post('/admin/visa-types', data);
export const updateVisaType = (id: string, data: object) => api.put(`/admin/visa-types/${id}`, data);
export const deleteVisaType = (id: string) => api.delete(`/admin/visa-types/${id}`);
export const toggleVisaType = (id: string) => api.patch(`/admin/visa-types/${id}/toggle`);
export const updateCorporatePrice = (id: string, corporatePrice: number | '') =>
  api.patch(`/admin/visa-types/${id}/corporate-price`, { corporatePrice });

// Applications
export const getApplications = (params?: object) => api.get('/admin/applications', { params });
export const getApplication = (id: string) => api.get(`/admin/applications/${id}`);
export const updateStatus = (id: string, data: object) => api.put(`/admin/applications/${id}/status`, data);
export const reviewDocument = (id: string, data: object) => api.put(`/admin/applications/${id}/document-review`, data);
export const approveAllDocuments = (id: string) => api.put(`/admin/applications/${id}/approve-documents`);
export const downloadApplicationDocumentsZip = (id: string) =>
  api.get(`/admin/applications/${id}/documents/zip`, { responseType: 'blob' });
export const uploadVisaFile = (id: string, formData: FormData) =>
  api.post(`/admin/applications/${id}/visa-file`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const manualPaymentOverride = (id: string, adminNote?: string) =>
  api.put(`/admin/applications/${id}/manual-payment`, { adminNote });

// Payments
export const getAdminPayments = () => api.get('/admin/payments');

// Users
export const getUsers = () => api.get('/admin/users');
export const getUserApplications = (userId: string) => api.get(`/admin/users/${userId}/applications`);
export const getUserVaultDocuments = (userId: string) => api.get(`/admin/users/${userId}/vault`);
export const downloadUserVaultZip = (userId: string) =>
  api.get(`/admin/users/${userId}/vault/zip`, { responseType: 'blob' });

// Contact Leads
export const getLeads = () => api.get('/admin/leads');
export const markLeadRead = (id: string) => api.patch(`/admin/leads/${id}/read`);
export const deleteLead = (id: string) => api.delete(`/admin/leads/${id}`);

// Notifications
export const getAdminNotifications = () => api.get('/admin/notifications');
export const markAdminNotificationRead = (id: string) => api.put(`/admin/notifications/${id}/read`);
export const markAllAdminNotificationsRead = () => api.put('/admin/notifications/read-all');
export const deleteAdminNotification = (id: string) => api.delete(`/admin/notifications/${id}`);
export const deleteAllAdminNotifications = () => api.delete('/admin/notifications/all');
