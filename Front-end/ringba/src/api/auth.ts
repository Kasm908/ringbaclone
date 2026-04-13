import client from "./client";
import type { User, TokenResponse } from "../types/index";

export const authApi = {
  login: async (email: string, password: string): Promise<TokenResponse> => {
    const res = await client.post("/auth/login", { email, password });
    return res.data;
  },

  register: async (
    email: string,
    username: string,
    password: string,
    role: string
  ): Promise<TokenResponse> => {
    const res = await client.post("/auth/register", {
      email,
      username,
      password,
      role,
    });
    return res.data;
  },

  refresh: async (refresh: string): Promise<{ access: string }> => {
    const res = await client.post("/auth/refresh", { refresh });
    return res.data;
  },

  me: async (): Promise<User> => {
    const res = await client.get("/auth/me");
    return res.data;
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  },
};