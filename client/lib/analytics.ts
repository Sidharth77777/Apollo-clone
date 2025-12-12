import { v4 as uuidv4 } from "uuid";
import api from "./axiosConfig";

export const getVisitorId = () => {
  try {
    let id = localStorage.getItem("visitor_id");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("visitor_id", id);
    }
    return id;
  } catch {
    return undefined;
  }
};

export const sendPageview = (path: string) => {
  try {
    const payload = {
      path,
      visitorId: getVisitorId(),
      referrer: typeof document !== "undefined" ? document.referrer : "",
      ts: new Date().toISOString(),
    };

    api
      .post("/analytics/track", payload, {
        headers: { "Content-Type": "application/json" },
      })
      .catch(() => {});
  } catch (e) {}
};
