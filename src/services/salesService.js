import api from "./api";

const salesService = {
  // Sales Orders
  getSalesOrders: async (params = {}) => {
    return await api.get("/sales-orders", { params });
  },

  getSalesOrder: async (id) => {
    return await api.get(`/sales-orders/${id}`);
  },

  createSalesOrder: async (data) => {
    return await api.post("/sales-orders", data);
  },

  updateSalesOrder: async (id, data) => {
    return await api.put(`/sales-orders/${id}`, data);
  },

  confirmSalesOrder: async (id) => {
    return await api.post(`/sales-orders/${id}/confirm`);
  },

  holdSalesOrder: async (id, reason) => {
    return await api.post(`/sales-orders/${id}/hold`, { reason });
  },

  closeSalesOrder: async (id) => {
    return await api.post(`/sales-orders/${id}/close`);
  },

  cancelSalesOrder: async (id) => {
    return await api.post(`/sales-orders/${id}/cancel`);
  },

  // Delivery Challans
  getDeliveryChallans: async (params = {}) => {
    return await api.get("/delivery-challans", { params });
  },

  getDeliveryChallan: async (id) => {
    return await api.get(`/delivery-challans/${id}`);
  },

  createDeliveryChallan: async (data) => {
    return await api.post("/delivery-challans", data);
  },

  updateDeliveryChallan: async (id, data) => {
    return await api.put(`/delivery-challans/${id}`, data);
  },

  closeDeliveryChallan: async (id) => {
    return await api.post(`/delivery-challans/${id}/close`);
  },

  // Sales Invoices
  getSalesInvoices: async (params = {}) => {
    return await api.get("/sales-invoices", { params });
  },

  getSalesInvoice: async (id) => {
    return await api.get(`/sales-invoices/${id}`);
  },

  createSalesInvoice: async (data) => {
    return await api.post("/sales-invoices", data);
  },

  postSalesInvoice: async (id) => {
    return await api.post(`/sales-invoices/${id}/post`);
  },

  getSalesInvoicePDF: async (id) => {
    return await api.get(`/sales-invoices/${id}/pdf`, {
      responseType: "blob",
    });
  },
};

export default salesService;
