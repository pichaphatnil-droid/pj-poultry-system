"use client";

import { createContext, useContext } from "react";
import type { AdminState } from "./useAdminState";
import type { AdminView } from "./adminView";

export type AdminContextValue = AdminState & AdminView;

const AdminContext = createContext<AdminContextValue | null>(null);

export const AdminProvider = AdminContext.Provider;

export const useAdmin = () => {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin ต้องใช้ภายใน AdminProvider");
  return value;
};
