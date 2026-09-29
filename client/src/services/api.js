import axios from 'axios';
export const LIVE = import.meta.env.VITE_DEMO_MODE !== 'true';
const api=axios.create({baseURL:import.meta.env.VITE_API_URL || '/api',timeout:300000});
api.interceptors.request.use(c=>{const token=localStorage.getItem('tripcraft_token');if(token)c.headers.Authorization=`Bearer ${token}`;return c});
export default api;
