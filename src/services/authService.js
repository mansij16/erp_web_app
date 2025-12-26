import api from "./api";

const authService = {
  register: async (payload) => {
    return await api.post("/auth/register", payload);
  },
  login: async (payload) => {
    return await api.post("/auth/login", payload);
  },
};

export default authService;

