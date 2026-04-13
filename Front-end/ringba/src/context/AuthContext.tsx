import React, { createContext, useContext, useState, useEffect } from "react";
import type { TokenResponse, User } from "../types/index";
import { authApi } from "../api/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    username: string,
    password: string,
    role: string
  ) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const savedUser = localStorage.getItem("user");
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const data: TokenResponse = await authApi.login(email, password);
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    const userData: User = {
      id: data.user_id,
      email: data.email,
      username: data.username,
      role: data.role as User["role"],
      created_at: new Date().toISOString(),
    };
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const register = async (
    email: string,
    username: string,
    password: string,
    role: string
  ) => {
    const data: TokenResponse = await authApi.register(
      email,
      username,
      password,
      role
    );
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    const userData: User = {
      id: data.user_id,
      email: data.email,
      username: data.username,
      role: data.role as User["role"],
      created_at: new Date().toISOString(),
    };
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};