import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('axispos_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('axispos_token');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  }
);

export default api;

export const authApi = {
  login:  (body) => api.post('/auth/login', body),
  logout: ()     => api.post('/auth/logout'),
  me:     ()     => api.get('/auth/me'),
};

export const productsApi = {
  list:       (params)     => api.get('/products', { params }),
  get:        (id)         => api.get(`/products/${id}`),
  resolveSku: (sku)        => api.get(`/products/resolve/${encodeURIComponent(sku)}`),
  create:     (body)       => api.post('/products', body),
  update:     (id, body)   => api.patch(`/products/${id}`, body),
  archive:    (id)         => api.post(`/products/${id}/archive`),
  activate:   (id)         => api.patch(`/products/${id}/activate`),
};

export const categoriesApi = {
  list:   ()     => api.get('/categories'),
  create: (body) => api.post('/categories', body),
  delete: (id)   => api.delete(`/categories/${id}`),
};

export const inventoryApi = {
  overview:  ()       => api.get('/inventory'),
  lowStock:  ()       => api.get('/inventory/low-stock'),
  movements: (params) => api.get('/inventory/movements', { params }),
  adjust:    (body)   => api.post('/inventory/adjust', body),
};

export const salesApi = {
  list:   (params) => api.get('/sales', { params }),
  get:    (id)     => api.get(`/sales/${id}`),
  create: (body)   => api.post('/sales', body),
  void:   (id)     => api.post(`/sales/${id}/void`),
};

export const reportsApi = {
  summary:     (params) => api.get('/reports/summary', { params }),
  topProducts: (params) => api.get('/reports/top-products', { params }),
  lowStock:    ()       => api.get('/reports/low-stock'),
};

export const barcodesApi = {
  svgUrl:   (productId, params = {}) => {
    const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const q = new URLSearchParams(params).toString();
    return `${base}/barcodes/${productId}${q ? '?' + q : ''}`;
  },
  skuUrl:   (sku) => {
    const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    return `${base}/barcodes/sku/${encodeURIComponent(sku)}`;
  },
  validate: (productId) => api.get(`/barcodes/${productId}/validate`),
  sheetUrl: (params = {}) => {
    const base = import.meta.env.VITE_API_BASE_URL || '/api/v1';
    const token = localStorage.getItem('axispos_token');
    const q = new URLSearchParams({ ...params, token }).toString();
    return `${base}/barcodes/sheet/all?${q}`;
  },
  sheet: (body) => api.post('/barcodes/sheet', body),
  sheetAll: (cols = 3) => api.get(`/barcodes/sheet/all?cols=${cols}`),
};

export const usersApi = {
  list:   ()           => api.get('/users'),
  create: (body)       => api.post('/users', body),
  update: (id, body)   => api.patch(`/users/${id}`, body),
  remove: (id)         => api.delete(`/users/${id}`),
  deactivate: (id)     => api.patch(`/users/${id}/deactivate`),
  activate:   (id)     => api.patch(`/users/${id}/activate`),
};