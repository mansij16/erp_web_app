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
    return await api.get("/products", { params });
  },

  getProduct: async (id) => {
    return await api.get(`/products/${id}`);
  },

  createProduct: async (data) => {
    return await api.post("/products", data);
  },

  updateProduct: async (id, data) => {
    return await api.put(`/products/${id}`, data);
  },

  deleteProduct: async (id) => {
    return await api.delete(`/products/${id}`);
  },

  // SKUs
  getSKUs: async (params = {}) => {
    return await api.get("/skus", { params });
  },

  getSKU: async (id) => {
    return await api.get(`/skus/${id}`);
  },

  getSKUsByProduct: async (productId) => {
    return await api.get(`/skus/by-product/${productId}`);
  },

  createSKU: async (data) => {
    return await api.post("/skus", data);
  },

  updateSKU: async (id, data) => {
    return await api.put(`/skus/${id}`, data);
  },

  deleteSKU: async (id) => {
    return await api.delete(`/skus/${id}`);
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
