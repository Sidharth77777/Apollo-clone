import axios, { type AxiosInstance } from "axios";
import { ENV } from "./ENV";
import toast from "react-hot-toast";

// FIX: template literal always returns string — so fallback never used.
// Use ?? instead.
const BASE =
  ENV.NEXT_PUBLIC_API_URL?.length
    ? `${ENV.NEXT_PUBLIC_API_URL}/api`
    : "http://localhost:5000/api";

const api: AxiosInstance = axios.create({
  baseURL: BASE,
  timeout: 15000,
  withCredentials: true, // send HttpOnly cookie automatically
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Optional logging
api.interceptors.request.use(
  (config) => config,
  (err) => Promise.reject(err)
);

// -------------------------------------------
// GLOBAL RESPONSE INTERCEPTOR
// -------------------------------------------

let isShowing401Toast = false; // prevents spamming multiple 401 toasts

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;

    // -----------------------
    // 401: Not authenticated
    // -----------------------
    if (status === 401) {
      // Prevent multiple 401 toasts in a row
      if (!isShowing401Toast) {
        isShowing401Toast = true;
        const msg =
          err?.response?.data?.message ||
          "Session expired. Please log in again.";

        toast.error(msg);

        // Reset after short delay so only 1 toast appears
        setTimeout(() => {
          isShowing401Toast = false;
        }, 1500);
      }

      // Redirect to /auth unless already there
      if (typeof window !== "undefined") {
        if (!window.location.pathname.startsWith("/auth")) {
          window.location.href = "/auth";
        }
      }
    }

    // -----------------------
    // 403: Forbidden (admin only)
    // -----------------------
    if (status === 403) {
      toast.error("You do not have permission to access this resource.");
    }

    return Promise.reject(err);
  }
);

export default api;
