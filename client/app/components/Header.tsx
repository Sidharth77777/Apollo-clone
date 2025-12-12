"use client";

import { Button } from "@/components/ui/button";
import { BG_COLOR, BORDER_COLOR } from "@/lib/colors";
import { CiSearch } from "react-icons/ci";
import { RiClaudeFill } from "react-icons/ri";
import { useWebProvider } from "../context/WebContext";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axiosConfig";
import toast from "react-hot-toast";

export default function Header() {
  const { collapsed } = useWebProvider();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [initials, setInitials] = useState<string>("");

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const firstActionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      const storedEmail = localStorage.getItem("user_email");
      const storedAdmin = localStorage.getItem("user_isAdmin") === "true";
      if (storedEmail) {
        setEmail(storedEmail);
        setIsAdmin(storedAdmin);
        setInitials(makeInitials(storedEmail));
      }
    } catch (e) {
      console.error("Failed to read localStorage", e);
    }
  }, []);

  // attach outside pointerdown listener only while open
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (ev: PointerEvent) => {
      const target = ev.target as Node | null;
      if (!containerRef.current) return;
      if (!target) return;
      if (!containerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open]);

  // focus first actionable item when menu opens (keyboard friendly)
  useEffect(() => {
    if (open) {
      setTimeout(() => firstActionRef.current?.focus(), 0);
    }
  }, [open]);

  function makeInitials(emailStr: string) {
    try {
      const local = emailStr.split("@")[0];
      const parts = local.split(/[\.\-_]/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return local.slice(0, 2).toUpperCase();
    } catch {
      return "??";
    }
  }

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (e) {
      console.warn("logout request failed", e);
    } finally {
      try {
        localStorage.removeItem("user_email");
        localStorage.removeItem("user_isAdmin");
      } catch {}
      toast.success("Logged out");
      setOpen(false);
      router.push("/auth");
    }
  };

  const toggle = () => setOpen((v) => !v);

  return (
    <header
      style={{
        backgroundColor: "rgba(255,255,255,0.92)",
        borderBottom: `1px solid ${BORDER_COLOR ?? "#e7e7ea"}`,
        backdropFilter: "saturate(120%)",
        marginLeft: collapsed ? "72px" : "288px",
        width: collapsed ? "calc(100% - 72px)" : "calc(100% - 288px)",
      }}
      className="fixed top-0 right-0 flex items-center gap-3 px-6 py-3 z-40 transition-all duration-300"
    >
      <div className="flex-1 relative">
        <CiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg" />
        <input
          placeholder="Search across Appolo..."
          className="w-full bg-white/80 border border-gray-200 rounded-md pl-10 pr-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-300 placeholder:text-gray-400"
        />
      </div>

      <div>
        <Button
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-sm rounded-md"
          aria-label="Assistant"
        >
          Assistant <RiClaudeFill />
        </Button>
      </div>

      {/* user menu */}
      <div ref={containerRef} className="relative">
        <button
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          className="p-2 rounded-full text-xs cursor-pointer font-semibold text-white bg-green-600 focus:outline-none"
        >
          {initials || "??"}
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 bg-white text-gray-800 rounded-md shadow-lg border border-gray-200 min-w-[180px] z-50"
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 py-2 border-b text-sm text-gray-600 truncate" title={email ?? ""}>
              {email ?? "Loading..."}
            </div>

            <div className="flex flex-col">
              {isAdmin && (
                <button
                  ref={firstActionRef}
                  onClick={() => {
                    setOpen(false);
                    router.push("/admin");
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                >
                  Admin Panel
                </button>
              )}

              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm text-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
