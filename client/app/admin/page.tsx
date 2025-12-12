"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axiosConfig";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { FiDownload } from "react-icons/fi";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import PageLayout from "../components/PageLayout";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus } from "react-icons/fa6";

/* Visual tokens */
const SURFACE = "rgba(255,255,255,0.94)";
const SURFACE_BORDER = "rgba(0,0,0,0.06)";
const TEXT_DARK = "#111827";
const MUTED = "#6B7280";

/* stable company key helper (same as Lists) */
const companyKey = (c: any) => String(c?.externalId ?? c?.id ?? c?._id ?? "");

/* Simple escape for CSV export */
const escapeCsv = (v: unknown) => {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

export default function AdminPage() {
  const router = useRouter();

  // admin guard (client-side)
  useEffect(() => {
    try {
      const isAdmin = localStorage.getItem("user_isAdmin") === "true";
      if (!isAdmin) {
        router.replace("/"); // redirect non-admins
      }
    } catch {
      router.replace("/");
    }
  }, [router]);

  // --- UI state: active tab ---
  const [tab, setTab] = useState<"companies" | "people" | "transaction" | "analytics">("companies");

  // --- companies pagination ---
  const [companies, setCompanies] = useState<any[]>([]);
  const [companiesPage, setCompaniesPage] = useState(1);
  const [companiesLimit, setCompaniesLimit] = useState(20);
  const [companiesTotal, setCompaniesTotal] = useState(0);
  const [companiesLoading, setCompaniesLoading] = useState(false);

  // --- people pagination ---
  const [people, setPeople] = useState<any[]>([]);
  const [peoplePage, setPeoplePage] = useState(1);
  const [peopleLimit, setPeopleLimit] = useState(20);
  const [peopleTotal, setPeopleTotal] = useState(0);
  const [peopleLoading, setPeopleLoading] = useState(false);

  // --- transactions pagination ---
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionsLimit, setTransactionsLimit] = useState(20);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  // Delete states
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});

  // Create company sheet
  const [companySheetOpen, setCompanySheetOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    name: "",
    externalId: "",
    website: "",
    location: "",
    description: "",
    industries: "", // comma-separated in UI, will be converted to string[]
    keywords: "", // comma-separated
    employees: "", // keep as string (e.g. "1,200" or "500+")
    founded: "", // numeric string
    revenueBillion: "", // numeric string
    fundingStage: "", // e.g. "seed", "series-a"
    totalFundingMillion: "", // numeric string
    parentCompany: "",
    subsidiariesCount: "", // numeric string
    logo: ""
  });
  const [creatingCompany, setCreatingCompany] = useState(false);

  // Create person sheet
  const [personSheetOpen, setPersonSheetOpen] = useState(false);
  const [personForm, setPersonForm] = useState({
    name: "",
    designation: "",
    department: "",
    location: "",
    companyId: "",
  });
  const [creatingPerson, setCreatingPerson] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setTransactionsLoading(true);
      try {
        const res = await api.get("/payments/transactions/stripe", { params: { page: transactionsPage, limit: transactionsLimit } });
        const data = res?.data?.data ?? res?.data ?? {};
        const items = data?.items ?? [];
        const total = Number(data?.total ?? (Array.isArray(res?.data) ? res.data.length : 0));
        if (!mounted) return;
        setTransactions(items);
        setTransactionsTotal(total);
      } catch (err: any) {
        console.error("Failed to load transactions:", err);
        toast.error(err?.response?.data?.message ?? "Failed to load transactions");
      } finally {
        if (mounted) setTransactionsLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    }
  }, [transactionsPage, transactionsLimit]);

  // Load companies page
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setCompaniesLoading(true);
      try {
        const res = await api.get("/companies", { params: { page: companiesPage, limit: companiesLimit } });
        const data = res?.data?.data ?? res?.data ?? {};
        const items = data?.items ?? [];
        const total = Number(data?.total ?? (Array.isArray(res?.data) ? res.data.length : 0));
        if (!mounted) return;
        setCompanies(items);
        setCompaniesTotal(total);
      } catch (err: any) {
        console.error("Failed to load companies:", err);
        toast.error(err?.response?.data?.message ?? "Failed to load companies");
      } finally {
        if (mounted) setCompaniesLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [companiesPage, companiesLimit]);

  // Load people page
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setPeopleLoading(true);
      try {
        const res = await api.get("/people", { params: { page: peoplePage, limit: peopleLimit } });
        const data = res?.data?.data ?? res?.data ?? {};
        const items = data?.items ?? [];
        const total = Number(data?.total ?? (Array.isArray(res?.data) ? res.data.length : 0));
        if (!mounted) return;
        setPeople(items);
        setPeopleTotal(total);
      } catch (err: any) {
        console.error("Failed to load people:", err);
        toast.error(err?.response?.data?.message ?? "Failed to load people");
      } finally {
        if (mounted) setPeopleLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [peoplePage, peopleLimit]);

  // Analytics state
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [trafficSeries, setTrafficSeries] = useState<any[]>([]); // e.g. [{ date: '2025-12-01', visits: 120, uniques: 80 }]
  const [summary, setSummary] = useState<{ totalVisits?: number; uniqueVisitors?: number; bounceRate?: number }>({});
  const [deviceBreakdown, setDeviceBreakdown] = useState<any[]>([]); // e.g. [{ name: 'Desktop', value: 120 }, { name: 'Mobile', value: 80 }]
  const ANALYTICS_POLL_INTERVAL = 0; // set >0 to poll periodically (ms), 0 = no poll

  useEffect(() => {
    let mounted = true;
    const loadAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        // you can adapt endpoints to your backend
        const sResp = await api.get("/analytics/summary"); // returns { totalVisits, uniqueVisitors, bounceRate }
        const tResp = await api.get("/analytics/traffic", { params: { range: "30d" } }); // returns array of { date, visits, uniques }
        const dResp = await api.get("/analytics/devices", { params: { range: "30d" } }); // optional

        if (!mounted) return;

        setSummary(sResp?.data?.data ?? sResp?.data ?? {});
        const series = tResp?.data?.data ?? tResp?.data ?? [];
        // safety: ensure date field exists and sort ascending
        const normalized = (Array.isArray(series) ? series : []).map((r: any) => ({
          date: r.date ?? r._id ?? r.day ?? String(r.timestamp ?? "").slice(0, 10),
          visits: Number(r.visits ?? r.count ?? 0),
          uniques: Number(r.uniques ?? r.unique ?? 0),
        })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setTrafficSeries(normalized);

        const devices = dResp?.data?.data ?? dResp?.data ?? [];
        setDeviceBreakdown(Array.isArray(devices) && devices.length ? devices : [
          { name: "Desktop", value: normalized.reduce((s: any, r: any) => s + (r.visits || 0), 0) * 0.6 },
          { name: "Mobile", value: normalized.reduce((s: any, r: any) => s + (r.visits || 0), 0) * 0.35 },
          { name: "Tablet", value: normalized.reduce((s: any, r: any) => s + (r.visits || 0), 0) * 0.05 },
        ]);
      } catch (err: any) {
        console.error("Failed to load analytics:", err);
      } finally {
        if (mounted) setAnalyticsLoading(false);
      }
    };

    loadAnalytics();
    let timer: any = null;
    if (ANALYTICS_POLL_INTERVAL > 0) timer = setInterval(loadAnalytics, ANALYTICS_POLL_INTERVAL);
    return () => { mounted = false; if (timer) clearInterval(timer); };
  }, []);


  // Create company
  const handleCreateCompany = async () => {
    if (!companyForm.name?.trim()) {
      toast.error("Company name is required");
      return;
    }


    setCreatingCompany(true);
    try {
      // normalize arrays from comma-separated inputs
      const industriesArr = String(companyForm.industries ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const keywordsArr = String(companyForm.keywords ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // numeric conversions (only when provided)
      const foundedNum = companyForm.founded ? Number(companyForm.founded) : undefined;
      const revenueNum = companyForm.revenueBillion ? Number(companyForm.revenueBillion) : undefined;
      const totalFundingNum = companyForm.totalFundingMillion ? Number(companyForm.totalFundingMillion) : undefined;
      const subsidiariesCountNum = companyForm.subsidiariesCount ? parseInt(companyForm.subsidiariesCount, 10) : undefined;

      const payload: any = {
        name: companyForm.name.trim(),
        externalId: companyForm.externalId?.trim() || undefined,
        website: companyForm.website?.trim() || undefined,
        location: companyForm.location?.trim() || undefined,
        description: companyForm.description?.trim() || undefined,
        logo: companyForm.logo?.trim() || undefined,

        // arrays
        industries: industriesArr.length > 0 ? industriesArr : undefined,
        keywords: keywordsArr.length > 0 ? keywordsArr : undefined,

        // strings / raw
        employees: companyForm.employees ? String(companyForm.employees).trim() : undefined,
        parentCompany: companyForm.parentCompany?.trim() || undefined,
        fundingStage: companyForm.fundingStage?.trim() || undefined,

        // numbers
        founded: typeof foundedNum === "number" && !Number.isNaN(foundedNum) ? foundedNum : undefined,
        revenueBillion: typeof revenueNum === "number" && !Number.isNaN(revenueNum) ? revenueNum : undefined,
        totalFundingMillion: typeof totalFundingNum === "number" && !Number.isNaN(totalFundingNum) ? totalFundingNum : undefined,
        subsidiariesCount: typeof subsidiariesCountNum === "number" && !Number.isNaN(subsidiariesCountNum) ? subsidiariesCountNum : undefined,
      };

      // remove undefined keys to keep payload small
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      await api.post("/companies", payload);
      toast.success("Company created");
      setCompanySheetOpen(false);

      // reset form
      setCompanyForm({
        name: "",
        externalId: "",
        website: "",
        location: "",
        description: "",
        industries: "",
        keywords: "",
        employees: "",
        founded: "",
        revenueBillion: "",
        fundingStage: "",
        totalFundingMillion: "",
        parentCompany: "",
        subsidiariesCount: "",
        logo: ""
      });

      // refresh first page
      setCompaniesPage(1);
      const r = await api.get("/companies", { params: { page: 1, limit: companiesLimit } });
      setCompanies(r?.data?.data?.items ?? r?.data ?? []);
      setCompaniesTotal(Number(r?.data?.data?.total ?? companiesTotal));
    } catch (err: any) {
      console.error("Create company failed:", err);
      toast.error(err?.response?.data?.message ?? "Failed to create company");
    } finally {
      setCreatingCompany(false);
    }
  };


  // Create person
  const handleCreatePerson = async () => {
    if (!personForm.name?.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!personForm.companyId) {
      toast.error("Select company");
      return;
    }

    setCreatingPerson(true);
    try {
      const comp = companies.find((c) => companyKey(c) === personForm.companyId);
      const payload: any = {
        name: personForm.name.trim(),
        designation: personForm.designation?.trim() || "Unknown",
        department: personForm.department?.trim() || "Unknown",
        location: personForm.location?.trim() || "Unknown",
      };
      if (comp?.externalId) payload.companyExternalId = comp.externalId;
      else if (comp?.id) payload.companyExternalId = comp.id;
      else if (comp?._id) payload.company = comp._id;

      await api.post("/people", payload);
      toast.success("Person created");
      setPersonSheetOpen(false);
      setPersonForm({ name: "", designation: "", department: "", location: "", companyId: "" });

      // refresh people
      const r = await api.get("/people", { params: { page: peoplePage, limit: peopleLimit } });
      setPeople(r?.data?.data?.items ?? r?.data ?? []);
      setPeopleTotal(Number(r?.data?.data?.total ?? peopleTotal));
    } catch (err: any) {
      console.error("Create person failed:", err);
      toast.error(err?.response?.data?.message ?? "Failed to create person");
    } finally {
      setCreatingPerson(false);
    }
  };

  // Delete company / person
  const handleDelete = async (type: "companies" | "people", idRaw: string) => {
    const id = String(idRaw ?? "");
    if (!id) {
      toast.error("Missing id");
      return;
    }
    setDeletingIds((s) => ({ ...s, [id]: true }));
    try {
      await api.delete(`/${type}/${encodeURIComponent(id)}`);
      toast.success("Deleted");
      // refresh current page
      if (type === "companies") {
        const r = await api.get("/companies", { params: { page: companiesPage, limit: companiesLimit } });
        setCompanies(r?.data?.data?.items ?? r?.data ?? []);
        setCompaniesTotal(Number(r?.data?.data?.total ?? companiesTotal));
      } else {
        const r = await api.get("/people", { params: { page: peoplePage, limit: peopleLimit } });
        setPeople(r?.data?.data?.items ?? r?.data ?? []);
        setPeopleTotal(Number(r?.data?.data?.total ?? peopleTotal));
      }
    } catch (err: any) {
      console.error("Delete failed:", err);
      toast.error(err?.response?.data?.message ?? "Delete failed");
    } finally {
      setDeletingIds((s) => {
        const copy = { ...s };
        delete copy[id];
        return copy;
      });
    }
  };

  // CSV export helpers (company & people)
  const downloadCompanyCsv = (companyObj: any) => {
    const key = companyKey(companyObj);
    const members = people.filter((p) => {
      const comp = p.company;
      if (typeof comp === "object" && comp !== null) return companyKey(comp) === key;
      return String(comp) === key || String(comp) === String(companyObj._id) || String(comp) === String(companyObj.id) || String(comp) === String(companyObj.externalId);
    });

    const headers = ["companyId", "companyName", "memberId", "memberName", "memberDesignation", "memberDepartment", "memberLocation"];
    const rows = members.map((m) => [
      escapeCsv(key),
      escapeCsv(companyObj.name),
      escapeCsv(String(m.externalId ?? m.id ?? "")),
      escapeCsv(m.name),
      escapeCsv(m.designation),
      escapeCsv(m.department),
      escapeCsv(m.location),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${companyObj.name}-members.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  // derived page counts
  const companiesPages = Math.max(1, Math.ceil((companiesTotal || 0) / companiesLimit));
  const peoplePages = Math.max(1, Math.ceil((peopleTotal || 0) / peopleLimit));

  // small framer motion presets
  const sheetMotion = { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" }, transition: { type: "spring", stiffness: 300, damping: 30 } } as any;
  const rowMotion = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.18 } };
  
  return (
    <PageLayout>
      <div className="min-h-screen p-6" style={{ backgroundColor: SURFACE }}>
        {/* header area */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold" style={{ color: TEXT_DARK }}>Admin dashboard</h1>
            <p className="text-sm" style={{ color: MUTED }}>Manage companies, people and transactions (admin only).</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <button
                onClick={() => setTab("analytics")}
                className={`px-3 py-1 rounded-md cursor-pointer text-sm font-medium ${tab === "analytics" ? "shadow-sm" : "border"}`}
                style={{
                  border: `1px solid ${SURFACE_BORDER}`,
                  backgroundColor: tab === "analytics" ? "#fff" : "transparent",
                  color: TEXT_DARK,
                }}
              >
                Analytics
              </button>

              <button
                onClick={() => setTab("companies")}
                className={`px-3 py-1 rounded-md cursor-pointer text-sm font-medium ${tab === "companies" ? "shadow-sm" : "border"}`}
                style={{
                  border: `1px solid ${SURFACE_BORDER}`,
                  backgroundColor: tab === "companies" ? "#fff" : "transparent",
                  color: TEXT_DARK,
                }}
              >
                Companies
              </button>

              <button
                onClick={() => setTab("people")}
                className={`px-3 py-1 rounded-md cursor-pointer text-sm font-medium ${tab === "people" ? "shadow-sm" : "border"}`}
                style={{
                  border: `1px solid ${SURFACE_BORDER}`,
                  backgroundColor: tab === "people" ? "#fff" : "transparent",
                  color: TEXT_DARK,
                }}
              >
                People
              </button>

              <button
                onClick={() => setTab("transaction")}
                className={`px-3 py-1 rounded-md cursor-pointer text-sm font-medium ${tab === "transaction" ? "shadow-sm" : "border"}`}
                style={{
                  border: `1px solid ${SURFACE_BORDER}`,
                  backgroundColor: tab === "people" ? "#fff" : "transparent",
                  color: TEXT_DARK,
                }}
              >
                Transactions
              </button>
            </div>

            {/* Create Company (Sheet) */}
            <Sheet open={companySheetOpen} onOpenChange={setCompanySheetOpen}>
              <SheetTrigger asChild>

                <button
                  onClick={() => setCompanySheetOpen(true)}
                  className="px-3 py-1 rounded-md text-sm font-medium cursor-pointer"
                  style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                >
                  Create Company <FaPlus className="inline" />
                </button>

              </SheetTrigger>

              <AnimatePresence>
                {companySheetOpen && (
                  <SheetContent side="right" className="max-w-md p-0" forceMount>
                    <motion.div
                      {...sheetMotion}
                      style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        minHeight: 0, // allow children to shrink for overflow to work
                      }}
                    >
                      {/* header (fixed height) */}
                      <SheetHeader className="p-6" style={{ flex: "0 0 auto" }}>
                        <SheetTitle style={{ fontSize: 18, color: TEXT_DARK }}>Create company</SheetTitle>
                      </SheetHeader>

                      {/* scrollable body */}
                      <div
                        className="p-6 space-y-3 flex-1"
                        style={{
                          backgroundColor: SURFACE,
                          overflowY: "auto",
                          WebkitOverflowScrolling: "touch",
                        }}
                      >
                        {/* --- your form fields (unchanged) --- */}
                        <div>
                          <label className="text-xs" style={{ color: TEXT_DARK }}>Name</label>
                          <input
                            value={companyForm.name}
                            onChange={(e) => setCompanyForm((s) => ({ ...s, name: e.target.value }))}
                            className="w-full mt-2 p-2 rounded"
                            style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                          />
                        </div>

                        {/* <div>
                          <label className="text-xs" style={{ color: TEXT_DARK }}>External ID (optional)</label>
                          <input
                            value={companyForm.externalId}
                            onChange={(e) => setCompanyForm((s) => ({ ...s, externalId: e.target.value }))}
                            className="w-full mt-2 p-2 rounded"
                            style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                          />
                        </div> */}

                        <div>
                          <label className="text-xs" style={{ color: TEXT_DARK }}>Website</label>
                          <input
                            value={companyForm.website}
                            onChange={(e) => setCompanyForm((s) => ({ ...s, website: e.target.value }))}
                            className="w-full mt-2 p-2 rounded"
                            style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs" style={{ color: TEXT_DARK }}>Location</label>
                            <input
                              value={companyForm.location}
                              onChange={(e) => setCompanyForm((s) => ({ ...s, location: e.target.value }))}
                              className="w-full mt-2 p-2 rounded"
                              style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                            />
                          </div>

                          <div>
                            <label className="text-xs" style={{ color: TEXT_DARK }}>Employees</label>
                            <input
                              value={companyForm.employees}
                              onChange={(e) => setCompanyForm((s) => ({ ...s, employees: e.target.value }))}
                              placeholder="e.g. 500, 1,200, 50+"
                              className="w-full mt-2 p-2 rounded"
                              style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs" style={{ color: TEXT_DARK }}>Founded (year)</label>
                            <input
                              value={companyForm.founded}
                              onChange={(e) => setCompanyForm((s) => ({ ...s, founded: e.target.value }))}
                              type="number"
                              className="w-full mt-2 p-2 rounded"
                              style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                            />
                          </div>

                          <div>
                            <label className="text-xs" style={{ color: TEXT_DARK }}>Revenue (Billion USD)</label>
                            <input
                              value={companyForm.revenueBillion}
                              onChange={(e) => setCompanyForm((s) => ({ ...s, revenueBillion: e.target.value }))}
                              type="number"
                              step="0.01"
                              className="w-full mt-2 p-2 rounded"
                              style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs" style={{ color: TEXT_DARK }}>Funding stage</label>
                            <input
                              value={companyForm.fundingStage}
                              onChange={(e) => setCompanyForm((s) => ({ ...s, fundingStage: e.target.value }))}
                              className="w-full mt-2 p-2 rounded"
                              style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                              placeholder="e.g. seed, series-a, public"
                            />
                          </div>

                          <div>
                            <label className="text-xs" style={{ color: TEXT_DARK }}>Total funding (M USD)</label>
                            <input
                              value={companyForm.totalFundingMillion}
                              onChange={(e) => setCompanyForm((s) => ({ ...s, totalFundingMillion: e.target.value }))}
                              type="number"
                              step="0.01"
                              className="w-full mt-2 p-2 rounded"
                              style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs" style={{ color: TEXT_DARK }}>Parent company</label>
                            <input
                              value={companyForm.parentCompany}
                              onChange={(e) => setCompanyForm((s) => ({ ...s, parentCompany: e.target.value }))}
                              className="w-full mt-2 p-2 rounded"
                              style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                            />
                          </div>

                          <div>
                            <label className="text-xs" style={{ color: TEXT_DARK }}>Subsidiaries count</label>
                            <input
                              value={companyForm.subsidiariesCount}
                              onChange={(e) => setCompanyForm((s) => ({ ...s, subsidiariesCount: e.target.value }))}
                              type="number"
                              className="w-full mt-2 p-2 rounded"
                              style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs" style={{ color: TEXT_DARK }}>Industries (comma separated)</label>
                          <input
                            value={companyForm.industries}
                            onChange={(e) => setCompanyForm((s) => ({ ...s, industries: e.target.value }))}
                            className="w-full mt-2 p-2 rounded"
                            placeholder="Software, Finance, Healthcare"
                            style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                          />
                        </div>

                        <div>
                          <label className="text-xs" style={{ color: TEXT_DARK }}>Keywords (comma separated)</label>
                          <input
                            value={companyForm.keywords}
                            onChange={(e) => setCompanyForm((s) => ({ ...s, keywords: e.target.value }))}
                            className="w-full mt-2 p-2 rounded"
                            placeholder="AI, payments, fintech"
                            style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                          />
                        </div>

                        <div>
                          <label className="text-xs" style={{ color: TEXT_DARK }}>Logo URL (optional)</label>
                          <input
                            value={companyForm.logo}
                            onChange={(e) => setCompanyForm((s) => ({ ...s, logo: e.target.value }))}
                            className="w-full mt-2 p-2 rounded"
                            placeholder="https://..."
                            style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                          />
                        </div>

                        <div>
                          <label className="text-xs" style={{ color: TEXT_DARK }}>Description</label>
                          <textarea
                            value={companyForm.description}
                            onChange={(e) => setCompanyForm((s) => ({ ...s, description: e.target.value }))}
                            className="w-full mt-2 p-2 rounded"
                            style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                          />
                        </div>
                        {/* --- end of form fields --- */}
                      </div>

                      {/* footer (sticky) */}
                      <SheetFooter
                        className="p-6 flex justify-end gap-3"
                        style={{
                          flex: "0 0 auto",
                          position: "sticky",
                          bottom: 0,
                          background: SURFACE,
                          borderTop: `1px solid ${SURFACE_BORDER}`,
                        }}
                      >
                        <button onClick={() => setCompanySheetOpen(false)} className="px-3 py-2 rounded-md" style={{ border: `1px solid ${SURFACE_BORDER}`, background: "white" }}>
                          Cancel
                        </button>
                        <motion.button
                          onClick={handleCreateCompany}
                          whileTap={{ scale: 0.98 }}
                          disabled={creatingCompany}
                          className="px-4 py-2 rounded-md text-white disabled:opacity-50"
                          style={{ backgroundColor: "#0f172a" }}
                        >
                          {creatingCompany ? "Creating..." : "Create company"}
                        </motion.button>
                      </SheetFooter>
                    </motion.div>
                  </SheetContent>

                )}
              </AnimatePresence>
            </Sheet>


            {/* Create Person (Sheet) */}
            <Sheet open={personSheetOpen} onOpenChange={setPersonSheetOpen}>
              <SheetTrigger asChild>
                <button
                  onClick={() => setPersonSheetOpen(true)}
                  className="px-3 py-1 rounded-md text-sm font-medium cursor-pointer"
                  style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}
                >
                  Create person <FaPlus className="inline" />
                </button>
              </SheetTrigger>

              <AnimatePresence>
                {personSheetOpen && (
                  <SheetContent side="right" className="max-w-md p-0" forceMount>
                    <motion.div {...sheetMotion} style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                      <SheetHeader className="p-6">
                        <SheetTitle style={{ fontSize: 18, color: TEXT_DARK }}>Create person</SheetTitle>
                      </SheetHeader>

                      <div className="p-6 space-y-3 flex-1" style={{ backgroundColor: SURFACE }}>
                        <div>
                          <label className="text-xs" style={{ color: TEXT_DARK }}>Full name</label>
                          <input value={personForm.name} onChange={(e) => setPersonForm((s) => ({ ...s, name: e.target.value }))} className="w-full mt-2 p-2 rounded" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }} />
                        </div>

                        <div>
                          <label className="text-xs" style={{ color: TEXT_DARK }}>Company</label>
                          <select value={personForm.companyId} onChange={(e) => setPersonForm((s) => ({ ...s, companyId: e.target.value }))} className="w-full mt-2 p-2 rounded" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}>
                            <option value="">Select company</option>
                            {companies.map((c) => <option key={companyKey(c)} value={companyKey(c)}>{c.name}</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs" style={{ color: TEXT_DARK }}>Designation</label>
                            <input value={personForm.designation} onChange={(e) => setPersonForm((s) => ({ ...s, designation: e.target.value }))} className="w-full mt-2 p-2 rounded" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }} />
                          </div>

                          <div>
                            <label className="text-xs" style={{ color: TEXT_DARK }}>Department</label>
                            <input value={personForm.department} onChange={(e) => setPersonForm((s) => ({ ...s, department: e.target.value }))} className="w-full mt-2 p-2 rounded" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }} />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs" style={{ color: TEXT_DARK }}>Location</label>
                          <input value={personForm.location} onChange={(e) => setPersonForm((s) => ({ ...s, location: e.target.value }))} className="w-full mt-2 p-2 rounded" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }} />
                        </div>
                      </div>

                      <SheetFooter className="p-6 flex justify-end gap-3">
                        <button onClick={() => setPersonSheetOpen(false)} className="px-3 py-2 rounded-md" style={{ border: `1px solid ${SURFACE_BORDER}`, background: "white" }}>
                          Cancel
                        </button>
                        <motion.button
                          onClick={handleCreatePerson}
                          whileTap={{ scale: 0.98 }}
                          disabled={creatingPerson}
                          className="px-4 py-2 rounded-md text-white"
                          style={{ backgroundColor: "#0f172a" }}
                        >
                          {creatingPerson ? "Creating..." : "Create person"}
                        </motion.button>
                      </SheetFooter>
                    </motion.div>
                  </SheetContent>
                )}
              </AnimatePresence>
            </Sheet>
          </div>
        </div>

        {/* Content */}
        <div className="mt-4 bg-white" style={{ border: `1px solid ${SURFACE_BORDER}`, borderRadius: 8, overflow: "hidden" }}>

          {/* Analytics tab - styled */}
{tab === "analytics" && (
  <div className="p-4">
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: TEXT_DARK }}>Analytics</h2>
        <p className="text-sm mt-1" style={{ color: MUTED }}>Traffic, users and device breakdown — last 30 days</p>
      </div>

      <div className="flex items-center gap-3">
        {/* simple range control (non-functional placeholder if you don't wire it) */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white" }}>
          <label className="text-xs" style={{ color: TEXT_DARK }}>Range</label>
          <select
            className="ml-2 text-xs"
            style={{ border: "none", outline: "none", color: TEXT_DARK, background: "transparent" }}
            value={"30d"}
            onChange={() => {}}
          >
            <option value="7d">7d</option>
            <option value="14d">14d</option>
            <option value="30d">30d</option>
          </select>
        </div>

        <div className="text-xs" style={{ color: MUTED, minWidth: 160, textAlign: "right" }}>
          {analyticsLoading ? "Loading..." : (
            <div>
              <div style={{ color: TEXT_DARK, fontWeight: 600 }}>{summary.totalVisits ?? (trafficSeries.reduce((s, r) => s + (r.visits || 0), 0) || 0)}</div>
              <div style={{ color: MUTED }}>Visits • Uniques: {summary.uniqueVisitors ?? "—"}</div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Summary cards */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
      <div className="p-4 rounded-2xl" style={{ backgroundColor: "white", border: `1px solid ${SURFACE_BORDER}`, boxShadow: "0 6px 20px rgba(12,15,20,0.04)" }}>
        <div className="text-xs" style={{ color: MUTED }}>Total visits (30d)</div>
        <div className="mt-2 text-2xl font-semibold" style={{ color: TEXT_DARK }}>
          {summary.totalVisits ?? (trafficSeries.reduce((s, r) => s + (r.visits || 0), 0) || 0)}
        </div>
        <div className="mt-1 text-xs" style={{ color: MUTED }}>Trend compared to previous period: <span style={{ color: "#059669" }}>+6.2%</span></div>
      </div>

      <div className="p-4 rounded-2xl" style={{ backgroundColor: "white", border: `1px solid ${SURFACE_BORDER}`, boxShadow: "0 6px 20px rgba(12,15,20,0.04)" }}>
        <div className="text-xs" style={{ color: MUTED }}>Unique visitors (30d)</div>
        <div className="mt-2 text-2xl font-semibold" style={{ color: TEXT_DARK }}>
          {summary.uniqueVisitors ?? "—"}
        </div>
        <div className="mt-1 text-xs" style={{ color: MUTED }}>Returning vs new: <span style={{ color: "#0ea5e9" }}>58% returning</span></div>
      </div>

      <div className="p-4 rounded-2xl" style={{ backgroundColor: "white", border: `1px solid ${SURFACE_BORDER}`, boxShadow: "0 6px 20px rgba(12,15,20,0.04)" }}>
        <div className="text-xs" style={{ color: MUTED }}>Bounce rate</div>
        <div className="mt-2 text-2xl font-semibold" style={{ color: TEXT_DARK }}>
          {(summary.bounceRate != null) ? `${Number(summary.bounceRate).toFixed(1)}%` : "—"}
        </div>
        <div className="mt-1 text-xs" style={{ color: MUTED }}>Lower is better</div>
      </div>
    </div>

    {/* Charts row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Visits over time */}
      <div className="p-4 rounded-2xl" style={{ backgroundColor: "white", border: `1px solid ${SURFACE_BORDER}`, minHeight: 320, boxShadow: "0 6px 20px rgba(12,15,20,0.04)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium" style={{ color: TEXT_DARK }}>Visits (last 30 days)</div>
          <div className="text-xs" style={{ color: MUTED }}>{analyticsLoading ? "Loading…" : `${trafficSeries.length} days`}</div>
        </div>

        {/* gradient defs */}
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trafficSeries} margin={{ top: 6, right: 12, left: -6, bottom: 8 }}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f172a" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#0f172a" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#64748b" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#64748b" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#EEF2F6" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(d) => String(d).slice(5)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 6px 18px rgba(20,20,30,0.08)", color: TEXT_DARK }}
              labelFormatter={(val) => `Date: ${val}`}
            />
            <Legend verticalAlign="top" height={28} />

            <Area type="monotone" dataKey="visits" stroke="none" fill="url(#g1)" isAnimationActive={false} />
            <Line type="monotone" dataKey="visits" name="Visits" stroke="#0f172a" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="uniques" name="Uniques" stroke="#64748b" strokeWidth={1.6} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Right column: device pie + daily uniques sparkbar */}
      <div className="flex flex-col gap-4">
        <div className="p-4 rounded-2xl" style={{ backgroundColor: "white", border: `1px solid ${SURFACE_BORDER}`, minHeight: 180, boxShadow: "0 6px 18px rgba(12,15,20,0.03)" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium" style={{ color: TEXT_DARK }}>Device breakdown</div>
            <div className="text-xs" style={{ color: MUTED }}>By hits</div>
          </div>

          <div className="flex items-center gap-4">
            <div style={{ width: 160, height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceBreakdown}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={48}
                    innerRadius={30}
                    paddingAngle={4}
                    labelLine={false}
                    label={(entry) => `${entry.name} ${Math.round((entry.value / Math.max(1, deviceBreakdown.reduce((s: any, r: any) => s + (r.value || 0), 0))) * 100)}%`}
                  >
                    {(deviceBreakdown || []).map((entry, index) => {
                      const COLORS = ["#0f172a", "#0ea5e9", "#94a3b8", "#f59e0b"];
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex-1">
              <div className="text-xs" style={{ color: MUTED }}>Top device</div>
              <div className="mt-2 text-base font-semibold" style={{ color: TEXT_DARK }}>
                {(deviceBreakdown && deviceBreakdown.length) ? deviceBreakdown[0].name : "—"}
              </div>

              <div className="mt-4 text-xs" style={{ color: MUTED }}>
                Top pages:
              </div>
              <ul className="mt-2 text-sm" style={{ color: TEXT_DARK }}>
                {/* you can replace with actual top pages data */}
                <li>/ (home) — 1,234</li>
                <li>/list — 876</li>
                <li>/company — 520</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl" style={{ backgroundColor: "white", border: `1px solid ${SURFACE_BORDER}`, minHeight: 120, boxShadow: "0 6px 18px rgba(12,15,20,0.03)" }}>
          <div className="text-sm font-medium" style={{ color: TEXT_DARK }}>Daily uniques (spark)</div>
          <ResponsiveContainer width="100%" height={84}>
            <BarChart data={trafficSeries} margin={{ left: -10, right: -10 }}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="uniques" name="Uniques" barSize={10} radius={[6,6,0,0]} fill="#0f172a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </div>
)}

          {/* Companies table */}
          {tab === "companies" && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: TEXT_DARK }}>Companies</h2>
                  <p className="text-xs" style={{ color: MUTED }}>Total: {companiesTotal}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 p-2 border rounded-md" style={{ borderColor: SURFACE_BORDER }}>
                    <label className="text-xs text-black" >Per page</label>
                    <select value={String(companiesLimit)} onChange={(e) => { setCompaniesLimit(Number(e.target.value)); setCompaniesPage(1); }} className="ml-2 p-1 rounded text-black" style={{ borderColor: SURFACE_BORDER }}>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "separate" }}>
                  <thead style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${SURFACE_BORDER}` }}>
                    <tr>
                      <th className="text-left px-4 py-2" style={{ color: MUTED }}>Name</th>
                      <th className="text-left px-4 py-2" style={{ color: MUTED }}>Location</th>
                      <th className="text-left px-4 py-2" style={{ color: MUTED }}>Website</th>
                      <th className="text-right px-4 py-2" style={{ color: MUTED }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    <AnimatePresence>
                      {companiesLoading ? (
                        <tr key="loading"><td colSpan={4} className="p-4 text-sm" style={{ color: MUTED }}>Loading...</td></tr>
                      ) : companies.length === 0 ? (
                        <tr key="empty"><td colSpan={4} className="p-4 text-sm" style={{ color: MUTED }}>No companies</td></tr>
                      ) : companies.map((c: any) => {
                        const id = String(c._id ?? c.id ?? c.externalId ?? "");
                        return (
                          <motion.tr key={id} layout initial="initial" animate="animate" exit="exit" variants={rowMotion} style={{ borderBottom: `1px solid ${SURFACE_BORDER}` }}>
                            <td className="px-4 py-3" style={{ color: TEXT_DARK }}>{c.name}</td>
                            <td className="px-4 py-3" style={{ color: MUTED }}>{c.location ?? "—"}</td>
                            <td className="px-4 py-3" style={{ color: MUTED }}>{c.website ? c.website.replace(/^https?:\/\//, "") : "—"}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button onClick={() => downloadCompanyCsv(c)} className="px-2 py-1 text-sm" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}>
                                  <FiDownload />
                                </Button>

                                <Button onClick={() => router.push(`/company/${encodeURIComponent(id)}`)} className="px-3 py-1 text-sm" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}>
                                  View
                                </Button>

                                <Button onClick={() => handleDelete("companies", id)} disabled={Boolean(deletingIds[id])} className="px-3 py-1 text-sm" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}>
                                  {deletingIds[id] ? "Deleting..." : "Delete"}
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* pagination */}
              <div className="flex items-center justify-between mt-3 px-2 py-3">
                <div className="text-xs text-black">Page {companiesPage} of {companiesPages}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCompaniesPage((p) => Math.max(1, p - 1))} disabled={companiesPage === 1} className="px-3 py-1 rounded-md text-black cursor-pointer" style={{ border: `1px solid ${SURFACE_BORDER}`, background: "white" }}>
                    Prev
                  </button>

                  {/* simple numbered pages (show nearby pages) */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: companiesPages }).map((_, idx) => {
                      const page = idx + 1;
                      if (companiesPages > 7 && Math.abs(page - companiesPage) > 3 && page !== 1 && page !== companiesPages) {
                        // compress long ranges (only show first, last, and near current)
                        if (page === 2 || page === companiesPages - 1) {
                          return <span key={page} className="px-2 text-sm" style={{ color: MUTED }}>…</span>;
                        }
                        return null;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setCompaniesPage(page)}
                          className={`px-2 py-1 rounded-md text-sm ${page === companiesPage ? "font-semibold" : ""}`}
                          style={{
                            border: `1px solid ${SURFACE_BORDER}`,
                            backgroundColor: page === companiesPage ? "#0f172a" : "white",
                            color: page === companiesPage ? "white" : TEXT_DARK,
                          }}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => setCompaniesPage((p) => Math.min(companiesPages, p + 1))} disabled={companiesPage === companiesPages} className="px-3 py-1 rounded-md text-black cursor-pointer" style={{ border: `1px solid ${SURFACE_BORDER}`, background: "white" }}>
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* People table */}
          {tab === "people" && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: TEXT_DARK }}>People</h2>
                  <p className="text-xs" style={{ color: MUTED }}>Total: {peopleTotal}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 p-2 border rounded-md" style={{ borderColor: SURFACE_BORDER }}>
                    <label className="text-xs text-black" >Per page</label>
                    <select value={String(peopleLimit)} onChange={(e) => { setPeopleLimit(Number(e.target.value)); setPeoplePage(1); }} className="ml-2 p-1 rounded text-black" style={{ borderColor: SURFACE_BORDER }}>
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "separate" }}>
                  <thead style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${SURFACE_BORDER}` }}>
                    <tr>
                      <th className="text-left px-4 py-2" style={{ color: MUTED }}>Name</th>
                      <th className="text-left px-4 py-2" style={{ color: MUTED }}>Designation</th>
                      <th className="text-left px-4 py-2" style={{ color: MUTED }}>Company</th>
                      <th className="text-left px-4 py-2" style={{ color: MUTED }}>Location</th>
                      <th className="text-right px-4 py-2" style={{ color: MUTED }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    <AnimatePresence>
                      {peopleLoading ? (
                        <tr key="loading-people"><td colSpan={5} className="p-4 text-sm" style={{ color: MUTED }}>Loading...</td></tr>
                      ) : people.length === 0 ? (
                        <tr key="empty-people"><td colSpan={5} className="p-4 text-sm" style={{ color: MUTED }}>No people</td></tr>
                      ) : people.map((p: any) => {
                        const id = String(p._id ?? p.id ?? p.externalId ?? "");
                        const companyName = (typeof p.company === "object" && p.company) ? p.company.name : (p.company ?? "—");
                        return (
                          <motion.tr key={id} layout initial="initial" animate="animate" exit="exit" variants={rowMotion} style={{ borderBottom: `1px solid ${SURFACE_BORDER}` }}>
                            <td className="px-4 py-3" style={{ color: TEXT_DARK }}>{p.name}</td>
                            <td className="px-4 py-3" style={{ color: MUTED }}>{p.designation ?? "—"}</td>
                            <td className="px-4 py-3" style={{ color: MUTED }}>{companyName}</td>
                            <td className="px-4 py-3" style={{ color: MUTED }}>{p.location ?? "—"}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button onClick={() => router.push(`/person/${encodeURIComponent(id)}`)} className="px-3 py-1 text-sm" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}>
                                  View
                                </Button>

                                <Button onClick={() => handleDelete("people", id)} disabled={Boolean(deletingIds[id])} className="px-3 py-1 text-sm" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}>
                                  {deletingIds[id] ? "Deleting..." : "Delete"}
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* pagination */}
              <div className="flex items-center justify-between mt-3 px-2 py-3">
                <div className="text-xs" style={{ color: MUTED }}>Page {peoplePage} of {peoplePages}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPeoplePage((p) => Math.max(1, p - 1))} disabled={peoplePage === 1} className="px-3 py-1 rounded-md text-black cursor-pointer" style={{ border: `1px solid ${SURFACE_BORDER}`, background: "white" }}>
                    Prev
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: peoplePages }).map((_, idx) => {
                      const page = idx + 1;
                      if (peoplePages > 7 && Math.abs(page - peoplePage) > 3 && page !== 1 && page !== peoplePages) {
                        if (page === 2 || page === peoplePages - 1) {
                          return <span key={page} className="px-2 text-sm" style={{ color: MUTED }}>…</span>;
                        }
                        return null;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setPeoplePage(page)}
                          className={`px-2 py-1 rounded-md text-sm ${page === peoplePage ? "font-semibold" : ""}`}
                          style={{
                            border: `1px solid ${SURFACE_BORDER}`,
                            backgroundColor: page === peoplePage ? "#0f172a" : "white",
                            color: page === peoplePage ? "white" : TEXT_DARK,
                          }}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => setPeoplePage((p) => Math.min(peoplePages, p + 1))} disabled={peoplePage === peoplePages} className="px-3 py-1 rounded-md text-black cursor-pointer" style={{ border: `1px solid ${SURFACE_BORDER}`, background: "white" }}>
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Transactions table */}
          {tab === "transaction" && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: TEXT_DARK }}>Transactions</h2>
                  <p className="text-xs" style={{ color: MUTED }}>Total: {transactionsTotal}</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 p-2 border rounded-md" style={{ borderColor: SURFACE_BORDER }}>
                    <label className="text-xs text-black">Per page</label>
                    <select
                      value={String(transactionsLimit)}
                      onChange={(e) => { setTransactionsLimit(Number(e.target.value)); setTransactionsPage(1); }}
                      className="ml-2 p-1 rounded text-black"
                      style={{ borderColor: SURFACE_BORDER }}
                    >
                      <option value="10">10</option>
                      <option value="20">20</option>
                      <option value="50">50</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm" style={{ borderCollapse: "separate" }}>
                  <thead style={{ backgroundColor: SURFACE, borderBottom: `1px solid ${SURFACE_BORDER}` }}>
                    <tr>
                      <th className="text-left px-4 py-2" style={{ color: MUTED }}>Date</th>
                      <th className="text-left px-4 py-2" style={{ color: MUTED }}>User</th>
                      <th className="text-left px-4 py-2" style={{ color: MUTED }}>Change</th>
                      <th className="text-left px-4 py-2" style={{ color: MUTED }}>Reason</th>
                      <th className="text-left px-4 py-2" style={{ color: MUTED }}>Amount</th>
                      <th className="text-left px-4 py-2" style={{ color: MUTED }}>Session</th>
                      <th className="text-right px-4 py-2" style={{ color: MUTED }}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    <AnimatePresence>
                      {transactionsLoading ? (
                        <tr key="loading"><td colSpan={7} className="p-4 text-sm" style={{ color: MUTED }}>Loading...</td></tr>
                      ) : transactions.length === 0 ? (
                        <tr key="empty"><td colSpan={7} className="p-4 text-sm" style={{ color: MUTED }}>No transactions</td></tr>
                      ) : transactions.map((t: any) => {
                        const id = String(t._id ?? "");
                        const userEmail = t.user?.email ?? (typeof t.user === "string" ? t.user : "—");
                        const dateStr = t.createdAt ? new Date(t.createdAt).toLocaleString() : "—";

                        // helpers (local)
                        const renderMaybeId = (v: any) => {
                          if (v == null) return "—";
                          if (typeof v === "string" || typeof v === "number") return String(v);
                          if (typeof v === "object") {
                            if (v.id) return String(v.id);
                            try {
                              const s = JSON.stringify(v);
                              return s.length > 120 ? s.slice(0, 120) + "…" : s;
                            } catch {
                              return "object";
                            }
                          }
                          return String(v);
                        };

                        const formatCurrency = (cents?: number, currency?: string) => {
                          if (cents == null) return "—";
                          try {
                            return new Intl.NumberFormat(undefined, { style: "currency", currency: (currency ?? "USD").toUpperCase() }).format(cents / 100);
                          } catch {
                            return `${(cents / 100).toFixed(2)} ${currency ?? "USD"}`;
                          }
                        };

                        const sessionId = t.meta?.sessionId ?? t.meta?.session_id ?? null;
                        const amountTotal = t.meta?.amount_total ?? t.meta?.amount ?? null;
                        const currency = t.meta?.currency ?? "USD";

                        const handleDownloadTxn = () => {
                          const receipt = {
                            txnId: id,
                            user: t.user,
                            change: t.change,
                            reason: t.reason,
                            meta: t.meta,
                            createdAt: t.createdAt,
                            raw: t,
                          };
                          const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `txn_${id}.json`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          URL.revokeObjectURL(url);
                        };

                        return (
                          <motion.tr key={id} layout initial="initial" animate="animate" exit="exit" variants={rowMotion} style={{ borderBottom: `1px solid ${SURFACE_BORDER}` }}>
                            <td className="px-4 py-3" style={{ color: TEXT_DARK, width: 180 }}>{dateStr}</td>
                            <td className="px-4 py-3" style={{ color: MUTED }}>{userEmail}</td>
                            <td className="px-4 py-3" style={{ color: TEXT_DARK }}>{t.change > 0 ? `+${t.change}` : String(t.change)}</td>
                            <td className="px-4 py-3" style={{ color: MUTED }}>{t.reason}</td>
                            <td className="px-4 py-3" style={{ color: MUTED }}>{amountTotal != null ? formatCurrency(Number(amountTotal), currency) : "—"}</td>
                            <td className="px-4 py-3" style={{ color: MUTED, maxWidth: 220, wordBreak: "break-word" }}>{renderMaybeId(sessionId)}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button onClick={handleDownloadTxn} className="px-2 py-1 text-sm" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}>
                                  <FiDownload />
                                </Button>

                                {sessionId ? (
                                  <Button onClick={() => window.open(`/payments/success?session_id=${encodeURIComponent(sessionId)}`, "_blank")} className="px-3 py-1 text-sm" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}>
                                    View Session
                                  </Button>
                                ) : (
                                  <Button disabled className="px-3 py-1 text-sm" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: MUTED }}>
                                    No Session
                                  </Button>
                                )}
                              </div>
                            </td>
                          </motion.tr>

                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* pagination */}
              <div className="flex items-center justify-between mt-3 px-2 py-3">
                {/*
        derive pages count (computed below in this file if you prefer)
        const transactionsPages = Math.max(1, Math.ceil((transactionsTotal || 0) / transactionsLimit));
      */}
                <div className="text-xs" style={{ color: MUTED }}>Page {transactionsPage} of {Math.max(1, Math.ceil((transactionsTotal || 0) / transactionsLimit))}</div>

                <div className="flex items-center gap-2">
                  <button onClick={() => setTransactionsPage((p) => Math.max(1, p - 1))} disabled={transactionsPage === 1} className="px-3 py-1 rounded-md text-black cursor-pointer" style={{ border: `1px solid ${SURFACE_BORDER}`, background: "white" }}>
                    Prev
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.max(1, Math.ceil((transactionsTotal || 0) / transactionsLimit)) }).map((_, idx) => {
                      const page = idx + 1;
                      const pages = Math.max(1, Math.ceil((transactionsTotal || 0) / transactionsLimit));
                      if (pages > 7 && Math.abs(page - transactionsPage) > 3 && page !== 1 && page !== pages) {
                        if (page === 2 || page === pages - 1) return <span key={page} className="px-2 text-sm" style={{ color: MUTED }}>…</span>;
                        return null;
                      }
                      return (
                        <button
                          key={page}
                          onClick={() => setTransactionsPage(page)}
                          className={`px-2 py-1 rounded-md text-sm ${page === transactionsPage ? "font-semibold" : ""}`}
                          style={{
                            border: `1px solid ${SURFACE_BORDER}`,
                            backgroundColor: page === transactionsPage ? "#0f172a" : "white",
                            color: page === transactionsPage ? "white" : TEXT_DARK,
                          }}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <button onClick={() => setTransactionsPage((p) => Math.min(Math.max(1, Math.ceil((transactionsTotal || 0) / transactionsLimit)), p + 1))} disabled={transactionsPage === Math.max(1, Math.ceil((transactionsTotal || 0) / transactionsLimit))} className="px-3 py-1 rounded-md text-black cursor-pointer" style={{ border: `1px solid ${SURFACE_BORDER}`, background: "white" }}>
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}


        </div>
      </div>
    </PageLayout>
  );
}
