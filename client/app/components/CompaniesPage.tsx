"use client";

import { useWebProvider } from "../context/WebContext";
import CompaniesBody from "./CompaniesBody";
import Header from "./Header";
import Lists from "./Lists";
import People from "./People";
import FiltersSidebar from "./Sidebar";

export default function CompaniesPage() {
  const { activeItem, collapsed } = useWebProvider();

  return (
    <div className="min-h-screen flex bg-[#ECECED]">
      <div
        className="flex-1 flex flex-col transition-all duration-300"
        style={{
          marginLeft: collapsed ? "72px" : "288px",
          paddingTop: "60px" // Add space for fixed header
        }}
      >
        {/* <div className="flex-1 overflow-y-auto">
          {activeItem === "Companies" && <CompaniesBody />}
          {activeItem === "People" && <People />}
          {activeItem === "Lists" && <Lists />}
        </div> */}
      </div>
    </div>
  );
}