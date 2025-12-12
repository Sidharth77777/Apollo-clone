"use client";

import { SidebarContextType } from "@/lib/types";
import { createContext, useContext, useState, ReactNode } from "react";

const WebContext = createContext<SidebarContextType | undefined>(undefined);

export const WebProvider = ({ children }: { children: ReactNode }) => {
  const [activeItem, setActiveItem] = useState<string>("");
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [FilterCompanies, setFilterCompanies] = useState<boolean>(false);
  const [refreshFlag, setRefreshFlag] = useState<boolean>(false);

  return (
    <WebContext.Provider value={{ activeItem, setActiveItem, collapsed, setCollapsed, FilterCompanies, setFilterCompanies, refreshFlag, setRefreshFlag }}>
      {children}
    </WebContext.Provider>
  );
};

export const useWebProvider = () => {
  const ctx = useContext(WebContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
};
