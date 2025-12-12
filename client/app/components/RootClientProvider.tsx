"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { WebProvider } from "../context/WebContext";
import { Toaster } from "react-hot-toast";
import FiltersSidebar from "../components/Sidebar";
import Header from "../components/Header";
import AnalyticsClient from "./AnalyticsClient";

export default function RootClientProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isAuthRoute = pathname.startsWith("/auth");

  
  return (
    <WebProvider>
      {!isAuthRoute && <AnalyticsClient />}
      {isAuthRoute ? (
        <div className="min-h-screen flex items-center justify-center border-[#454446]  text-slate-100">
          {children}
        </div>
      ) : (
        <div className="min-h-screen flex bg-[#0f1014] text-slate-100">
          <aside
            className="flex-shrink-0 h-screen border-r border-[#454446] bg-[#0f1014] z-10"
            aria-label="Filters sidebar"
          >
            <FiltersSidebar />
          </aside>

          <div className="flex-1 flex flex-col min-h-screen">
            <header className="w-full">
              <Header />
            </header>

            <main className="flex-1 bg-[#ECECED] overflow-auto">{children}</main>
          </div>
        </div>
      )}

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(17,17,17,0.9)",
            color: "white",
            borderRadius: "8px",
          },
        }}
      />
    </WebProvider>
  );
}
