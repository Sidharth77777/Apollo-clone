// app/auth/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axiosConfig";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

/* Design tokens matched with your People page */
const SURFACE = "rgba(255,255,255,0.94)";
const SURFACE_BORDER = "rgba(255, 0, 0, 0.06)";
const TEXT_DARK = "#111827";
const MUTED = "#6B7280";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const persistUserLocally = (emailValue: string, isAdmin: boolean | null) => {
    try {
      localStorage.setItem("user_email", String(emailValue ?? ""));
      if (typeof isAdmin === "boolean") {
        localStorage.setItem("user_isAdmin", isAdmin ? "true" : "false");
      } else {
        localStorage.removeItem("user_isAdmin");
      }
    } catch (e) {
      // ignore localStorage errors (e.g. in strict privacy modes)
      // but don't block login flow
      console.warn("localStorage write failed", e);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const res = await api.post("/auth/login", { email, password });
        toast.success(res?.data?.message ?? "Logged in");
      } else {
        const res = await api.post("/auth/signup", { email, password });
        toast.success(res?.data?.message ?? "Account created");
      }

      // Get authoritative user object (reads token from HttpOnly cookie)
      let me = null;
      try {
        const meRes = await api.get("/auth/me"); // cookie is sent automatically via axios withCredentials
        me = meRes?.data?.data ?? meRes?.data ?? null;
      } catch (e) {
        // If /auth/me fails, we still persist the email (best-effort)
        console.warn("Failed to fetch /auth/me after auth:", e);
      }

      const isAdmin = me?.isAdmin ?? null;
      const userEmail = me?.email ?? email; // fallback to provided email
      // persist minimal info for quick checks in UI
      persistUserLocally(userEmail, typeof isAdmin === "boolean" ? isAdmin : null);

      // redirect: if admin -> /admin else -> /
      if (isAdmin === true) {
        router.push("/admin");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-full max-w-md p-8 rounded-2xl"
      style={{
        background: SURFACE,
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        border: `1px solid ${SURFACE_BORDER}`,
        color: TEXT_DARK,
      }}
    >
      <h1 className="text-2xl font-semibold mb-4 text-center" style={{ color: TEXT_DARK }}>
        {mode === "login" ? "Sign in" : "Create account"}
      </h1>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode("login")}
          className={`flex-1 py-2 rounded transition-colors cursor-pointer ${mode === "login" ? "bg-white text-black" : "bg-transparent text-slate-600"}`}
          style={{
            borderStyle: mode === "login" ? "solid" : "none",
            borderWidth: mode === "login" ? 3 : 0,              // change 3 -> 4 or 5 for thicker
            borderColor: mode === "login" ? "#0f172a" : "transparent",
            boxShadow: mode === "login" ? "0 2px 8px rgba(15,23,42,0.06)" : undefined,
          }}
        >
          Login
        </button>

        <button
          onClick={() => setMode("signup")}
          className={`flex-1 py-2 rounded transition-colors cursor-pointer ${mode === "signup" ? "bg-white text-black" : "bg-transparent text-slate-600"}`}
          style={{
            borderStyle: mode === "signup" ? "solid" : "none",
            borderWidth: mode === "signup" ? 3 : 0,
            borderColor: mode === "signup" ? "#0f172a" : "transparent",
            boxShadow: mode === "signup" ? "0 2px 8px rgba(15,23,42,0.06)" : undefined,
          }}
        >
          Signup
        </button>

      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: TEXT_DARK }}>
            Email
          </label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: TEXT_DARK }}>
            Password
          </label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full"
            placeholder="At least 6 characters"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full py-2"
          style={{ background: "#111827", color: "white" }}
        >
          {loading ? (mode === "login" ? "Signing in..." : "Creating...") : mode === "login" ? "Sign in" : "Create account"}
        </Button>
      </form>

      <div className="mt-4 text-sm text-center" style={{ color: MUTED }}>
        {mode === "login" ? (
          <>
            Don't have an account?{" "}
            <button className="text-sky-600 hover:underline" onClick={() => setMode("signup")}>
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button className="text-sky-600 hover:underline" onClick={() => setMode("login")}>
              Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
