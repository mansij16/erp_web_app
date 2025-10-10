import api from "./api";

const inventoryService = {
  // Rolls
  getRolls: async (params = {}) => {
    return await api.get("/rolls", { params });
  },

  getRoll: async (id) => {
    return await api.get(`/rolls/${id}`);
  },

  updateRoll: async (id, data) => {
    return await api.put(`/rolls/${id}`, data);
  },

  getUnmappedRolls: async () => {
    return await api.get("/rolls/unmapped");
  },

  bulkMapRolls: async (data) => {
    return await api.post("/rolls/bulk-map", data);
  },

  getRollHistory: async (id) => {
    return await api.get(`/rolls/${id}/history`);
  },

  createRolls: async (data) => {
    return await api.post("/rolls", data);
  },

  // Stock Summary
  getStockSummary: async (params = {}) => {
    return await api.get("/inventory/stock-summary", { params });
  },

  // Stock Movement
  getStockMovement: async (params = {}) => {
    return await api.get("/inventory/stock-movement", { params });
  },
};

export default inventoryService;
