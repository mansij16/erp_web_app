import api from "./api";

const masterService = {
  // Categories
  getCategories: async (params = {}) => {
    return await api.get("/categories", { params });
  },

  getCategory: async (id) => {
    return await api.get(`/categories/${id}`);
  },

  createCategory: async (data) => {
    return await api.post("/categories", data);
  },

  updateCategory: async (id, data) => {
    return await api.put(`/categories/${id}`, data);
  },

  deleteCategory: async (id) => {
    return await api.delete(`/categories/${id}`);
  },

  // Products
  getProducts: async (params = {}) => {
    const res = await api.get("/products", { params });
    // Backend returns { success, products, pagination }
    return { products: res.products || [], pagination: res.pagination };
  },

  getProduct: async (id) => {
    const res = await api.get(`/products/${id}`);
    return res.data;
  },

  createProduct: async (data) => {
    const res = await api.post("/products", data);
    return res.data;
  },

  updateProduct: async (id, data) => {
    const res = await api.patch(`/products/${id}`, data);
    return res.data;
  },

  deleteProduct: async (id) => {
    return await api.delete(`/products/${id}`);
  },

  toggleProductStatus: async (id) => {
    const res = await api.patch(`/products/${id}/toggle-status`);
    return res.data;
  },

  bulkCreateProducts: async (products) => {
    const res = await api.post(`/products/bulk`, { products });
    return res.data; // { success:[], failed:[] }
  },

  getProductsByCategoryAndGSM: async (categoryId, gsm) => {
    const res = await api.get(`/products/category/${categoryId}/gsm/${gsm}`);
    return res.data;
  },

  // SKUs
  getSKUs: async (params = {}) => {
    const res = await api.get("/skus", { params });
    // Assume list; backend may add pagination later
    return res.data || res.skus || [];
  },

  getSKU: async (id) => {
    const res = await api.get(`/skus/${id}`);
    return res.data;
  },

  getAvailableSKUs: async (params = {}) => {
    const res = await api.get(`/skus/available`, { params });
    return res.data || [];
  },

  getSKUByCode: async (code) => {
    const res = await api.get(`/skus/code/${code}`);
    return res.data;
  },

  createSKU: async (data) => {
    const res = await api.post("/skus", data);
    return res.data;
  },

  updateSKU: async (id, data) => {
    const res = await api.patch(`/skus/${id}`, data);
    return res.data;
  },

  deleteSKU: async (id) => {
    return await api.delete(`/skus/${id}`);
  },

  bulkCreateSKUs: async (skus) => {
    const res = await api.post(`/skus/bulk`, { skus });
    return res.data; // { success:[], failed:[] }
  },

  toggleSKUStatus: async (id) => {
    const res = await api.patch(`/skus/${id}/toggle-status`);
    return res.data;
  },

  // Suppliers
  getSuppliers: async (params = {}) => {
    return await api.get("/suppliers", { params });
  },

  getSupplier: async (id) => {
    return await api.get(`/suppliers/${id}`);
  },

  createSupplier: async (data) => {
    return await api.post("/suppliers", data);
  },

  updateSupplier: async (id, data) => {
    return await api.put(`/suppliers/${id}`, data);
  },

  deleteSupplier: async (id) => {
    return await api.delete(`/suppliers/${id}`);
  },

  // Customers
  getCustomers: async (params = {}) => {
    return await api.get("/customers", { params });
  },

  getCustomer: async (id) => {
    return await api.get(`/customers/${id}`);
  },

  createCustomer: async (data) => {
    return await api.post("/customers", data);
  },

  updateCustomer: async (id, data) => {
    return await api.put(`/customers/${id}`, data);
  },

  checkCredit: async (id) => {
    return await api.post(`/customers/${id}/check-credit`);
  },

  blockCustomer: async (id, reason) => {
    return await api.post(`/customers/${id}/block`, { reason });
  },

  unblockCustomer: async (id) => {
    return await api.post(`/customers/${id}/unblock`);
  },
};

export default masterService;
