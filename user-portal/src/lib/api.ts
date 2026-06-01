import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const sendOTP = (data: { name: string; email: string; phone: string }) =>
  api.post('/auth/send-otp', data);
export const verifyOTP = (data: { email: string; otp: string }) =>
  api.post('/auth/verify-otp', data);

// Public
export const getPublicCountries = () => api.get('/public/countries');
export const getPublicVisaTypes = (countryId?: string) =>
  api.get('/public/visa-types', { params: { country: countryId } });

// User — Applications
export const getDashboard = () => api.get('/user/dashboard');
export const getApplications = () => api.get('/user/applications');
export const createApplication = (data: { visaTypeId: string; formResponses: Record<string, string> }) =>
  api.post('/user/applications', data);
export const getApplication = (id: string) => api.get(`/user/applications/${id}`);
export const uploadDocument = (id: string, formData: FormData) =>
  api.post(`/user/applications/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const makePayment = (id: string) => api.put(`/user/applications/${id}/payment`);

// User — Document Vault
export const getVaultDocuments = () => api.get('/user/vault');
export const uploadVaultDocument = (formData: FormData) =>
  api.post('/user/vault', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteVaultDocument = (id: string) => api.delete(`/user/vault/${id}`);

// User — Payments
export const getUserPayments = () => api.get('/user/payments');
export const downloadReceipt = (id: string) =>
  api.get(`/user/payments/${id}/receipt`, { responseType: 'blob' });

// Notifications
export const getNotifications = () => api.get('/user/notifications');
export const markNotificationRead = (id: string) => api.put(`/user/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.put('/user/notifications/read-all');
