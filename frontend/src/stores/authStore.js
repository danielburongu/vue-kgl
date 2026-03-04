import { defineStore } from "pinia";
import api from "@/services/api";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(localStorage.getItem("kglUser")) || null,
    token: localStorage.getItem("kglToken") || null,
  }),

  actions: {
    async login(credentials) {
      const res = await api.post("/auth/login", credentials);

      this.user = res.data.user;
      this.token = res.data.token;

      localStorage.setItem("kglUser", JSON.stringify(this.user));
      localStorage.setItem("kglToken", this.token);
    },

    logout() {
      this.user = null;
      this.token = null;

      localStorage.removeItem("kglUser");
      localStorage.removeItem("kglToken");
    },
  },
});