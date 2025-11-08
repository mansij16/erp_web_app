// src/services/masterService.js
import api from "./api";

const masterService = {
  // Categories
  getCategories: async (params = {}) => {
    const res = await api.get("/categories", { params });
    return res;
  },

  getCategory: async (id) => {
    const res = await api.get(`/categories/${id}`);
    return res.data;
  },

  createCategory: async (data) => {
    const res = await api.post("/categories", data);
    return res.data;
  },

  updateCategory: async (id, data) => {
    const res = await api.patch(`/categories/${id}`, data);
    return res.data;
  },

  toggleCategoryStatus: async (id) => {
    const res = await api.patch(`/categories/${id}/toggle-status`);
    return res.data;
  },

  deleteCategory: async (id) => {
    const res = await api.delete(`/categories/${id}`);
    return res;
  },

  // Products
  getProducts: async (params = {}) => {
    const res = await api.get("/products", { params });
    return {
      products: res.products || [],
      pagination: res.pagination || {},
    };
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
    const res = await api.delete(`/products/${id}`);
    return res;
  },

  toggleProductStatus: async (id) => {
    const res = await api.patch(`/products/${id}/toggle-status`);
    return res.data;
  },

  bulkCreateProducts: async (products) => {
    const res = await api.post("/products/bulk", { products });
    return res.data; // { success:[], failed:[] }
  },

  getProductsByCategoryAndGSM: async (categoryId, gsm) => {
    const res = await api.get(`/products/category/${categoryId}/gsm/${gsm}`);
    return res.data || [];
  },

  // SKUs
  getSKUs: async (params = {}) => {
    const res = await api.get("/skus", { params });
    return {
      skus: res.skus || [],
      pagination: res.pagination || {},
    };
  },

  getSKU: async (id) => {
    const res = await api.get(`/skus/${id}`);
    return res.data;
  },

  getAvailableSKUs: async () => {
    const res = await api.get("/skus/available");
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
    const res = await api.delete(`/skus/${id}`);
    return res;
  },

  bulkCreateSKUs: async (productId, widths) => {
    const res = await api.post("/skus/bulk", { productId, widths });
    return res.data; // { success:[], failed:[] }
  },

  toggleSKUStatus: async (id) => {
    const res = await api.patch(`/skus/${id}/toggle-status`);
    return res.data;
  },

  // Suppliers
  getSuppliers: async (params = {}) => {
    const res = await api.get("/suppliers", { params });
    return {
      suppliers: res.suppliers || [],
      pagination: res.pagination || {},
    };
  },

  getSupplier: async (id) => {
    const res = await api.get(`/suppliers/${id}`);
    return res.data;
  },

  getSupplierByCode: async (code) => {
    const res = await api.get(`/suppliers/code/${code}`);
    return res.data;
  },

  createSupplier: async (data) => {
    const res = await api.post("/suppliers", data);
    return res.data;
  },

  updateSupplier: async (id, data) => {
    const res = await api.patch(`/suppliers/${id}`, data);
    return res.data;
  },

  toggleSupplierStatus: async (id) => {
    const res = await api.patch(`/suppliers/${id}/toggle-status`);
    return res.data;
  },

  updateSupplierRating: async (id, rating, notes) => {
    const res = await api.patch(`/suppliers/${id}/rating`, { rating, notes });
    return res.data;
  },

  getSuppliersByProduct: async (productId) => {
    const res = await api.get(`/suppliers/product/${productId}`);
    return res.data || [];
  },

  deleteSupplier: async (id) => {
    const res = await api.delete(`/suppliers/${id}`);
    return res;
  },

  // Customers
  getCustomers: async (params = {}) => {
    const res = await api.get("/customers", { params });
    return {
      customers: res.customers || [],
      pagination: res.pagination || {},
    };
  },

  getCustomer: async (id) => {
    const res = await api.get(`/customers/${id}`);
    return res.data; // Returns { customer, rates }
  },

  createCustomer: async (data) => {
    const res = await api.post("/customers", data);
    return res.data;
  },

  updateCustomer: async (id, data) => {
    const res = await api.patch(`/customers/${id}`, data);
    return res.data;
  },

  updateCreditPolicy: async (id, creditPolicy) => {
    const res = await api.patch(`/customers/${id}/credit-policy`, creditPolicy);
    return res.data;
  },

  checkCreditLimit: async (id) => {
    const res = await api.get(`/customers/${id}/credit-check`);
    return res.data;
  },

  blockCustomer: async (id, reason) => {
    const res = await api.post(`/customers/${id}/block`, { reason });
    return res.data;
  },

  unblockCustomer: async (id, notes) => {
    const res = await api.post(`/customers/${id}/unblock`, { notes });
    return res.data;
  },

  deleteCustomer: async (id) => {
    const res = await api.delete(`/customers/${id}`);
    return res;
  },

  // Customer Rates
  getCustomerRates: async (customerId) => {
    const res = await api.get(`/customers/${customerId}/rates`);
    return res.data || [];
  },

  setCustomerRate: async (customerId, rateData) => {
    const res = await api.post(`/customers/${customerId}/rates`, rateData);
    return res.data;
  },

  bulkUpdateCustomerRates: async (customerId, rateUpdates) => {
    const res = await api.post(`/customers/${customerId}/bulk-rates`, {
      rateUpdates,
    });
    return res.data;
  },

  getCustomerRateHistory: async (customerId, productId = null) => {
    const params = productId ? { productId } : {};
    const res = await api.get(`/customers/${customerId}/rate-history`, {
      params,
    });
    return res.data || [];
  },
};

export default masterService;
