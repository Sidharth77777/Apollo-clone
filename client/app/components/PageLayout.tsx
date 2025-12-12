"use client";

import { useWebProvider } from "../context/WebContext";

export default function PageLayout({ children }: { children: React.ReactNode }) {
  const { collapsed } = useWebProvider();

  return (
    <div className="min-h-screen flex bg-[#ECECED]">
      <div
        className="flex-1 flex flex-col transition-all duration-300"
        style={{
          marginLeft: collapsed ? "72px" : "288px",
          paddingTop: "60px" // Add space for fixed header
        }}
      >
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}