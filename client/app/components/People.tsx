"use client";
import { useMemo, useState, useEffect } from "react";
import api from "@/lib/axiosConfig";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

/* Soft shaded white used across the page */
const SURFACE = "rgba(255,255,255,0.94)";
const SURFACE_BORDER = "rgba(0,0,0,0.06)";
const TEXT_DARK = "#111827";
const MUTED = "#6B7280";

type Filters = {
  designation: string;
  department: string;
  companyId: string;
  location: string;
};

const PAGE_SIZE = 10;
// how many records to fetch in one go - adjust if you have many records
const FETCH_LIMIT = 1000;

export default function People() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({
    designation: "all",
    department: "all",
    companyId: "all",
    location: "all",
  });
  const [page, setPage] = useState(1);

  const [people, setPeople] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // fetch companies + people on mount
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchAll = async () => {
      try {
        // fetch companies (get many)
        const compRes = await api.get("/companies", { params: { q: "", page: 1, limit: 200 } });
        const compItems = compRes?.data?.data?.items ?? compRes?.data ?? [];
        // fetch people (we ask backend for a large limit and rely on client-side filtering)
        const pplRes = await api.get("/people", { params: { q: "", page: 1, limit: FETCH_LIMIT } });
        const pplItems = pplRes?.data?.data?.items ?? pplRes?.data ?? [];

        if (!mounted) return;
        setCompanies(compItems);
        setPeople(pplItems);
      } catch (err: any) {
        console.error("Failed to fetch people/companies", err?.response?.data ?? err.message ?? err);
        if (mounted) setError(err?.response?.data?.message ?? err.message ?? "Failed to load data");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchAll();
    return () => {
      mounted = false;
    };
  }, []);

  // companyMap: map externalId -> { name, logo }
  const companyMap = useMemo(() => {
    const map: Record<string, { name: string; logo?: string }> = {};
    // companies may be returned with externalId field
    for (const c of companies) {
      const key = String(c.externalId ?? c.id ?? "").trim();
      if (!key) continue;
      map[key] = { name: c.name, logo: c.logo };
    }
    return map;
  }, [companies]);

  // unique options for filters - computed from fetched people / companies
  const designations = useMemo(() => {
    const s = new Set<string>();
    for (const p of people) {
      const d = String(p.designation ?? "").trim();
      if (d) s.add(d);
    }
    return Array.from(s).sort();
  }, [people]);

  const departments = useMemo(() => {
    const s = new Set<string>();
    for (const p of people) {
      const d = String(p.department ?? "").trim();
      if (d) s.add(d);
    }
    return Array.from(s).sort();
  }, [people]);

  const companyOptions = useMemo(() => {
    return companies.map((c) => ({ id: String(c.externalId ?? c.id ?? ""), name: c.name }));
  }, [companies]);

  const locations = useMemo(() => {
    const s = new Set<string>();
    for (const p of people) {
      const loc = String(p.location ?? "").trim();
      if (loc) s.add(loc);
    }
    return Array.from(s).sort();
  }, [people]);

  // reset to page 1 when filters/search change
  useEffect(() => {
    setPage(1);
  }, [search, filters]);

  // helper to extract a canonical companyId (externalId) from server person object
  const getPersonCompanyExternalId = (p: any) => {
    // p.company may be populated object with externalId OR an ObjectId string OR legacy companyId field
    if (!p) return "";
    if (typeof p.company === "string") return p.company; // ObjectId or string
    if (typeof p.company === "object" && p.company !== null) {
      // populated object from populate("company", "name externalId")
      return String(p.company.externalId ?? p.company.id ?? "");
    }
    // fallback to companyId field from frontend data
    return String(p.companyId ?? "");
  };

  // filtered people (client-side)
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return people.filter((p) => {
      const name = String(p.name ?? "").toLowerCase();
      if (term && !name.includes(term)) return false;

      if (filters.designation !== "all" && String(p.designation ?? "") !== filters.designation)
        return false;

      if (filters.department !== "all" && String(p.department ?? "") !== filters.department)
        return false;

      const personCompanyExt = getPersonCompanyExternalId(p);
      if (filters.companyId !== "all" && personCompanyExt !== filters.companyId) return false;

      if (filters.location !== "all" && String(p.location ?? "") !== filters.location) return false;

      return true;
    });
  }, [people, search, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: SURFACE }}>
        <div>Loading people…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: SURFACE }}>
        <div style={{ color: MUTED }}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: SURFACE }}>
      {/* HEADER */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{
          borderBottom: `1px solid ${SURFACE_BORDER}`,
          backgroundColor: SURFACE,
        }}
      >
        <div>
          <h1 className="text-lg font-semibold" style={{ color: TEXT_DARK }}>
            People
          </h1>
          <p className="text-sm" style={{ color: MUTED }}>
            Browse key contacts across companies. Use filters to narrow down.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Button
            variant="outline"
            className="px-3 py-1 text-sm"
            style={{
              borderColor: SURFACE_BORDER,
              backgroundColor: "transparent",
              color: TEXT_DARK,
            }}
            onClick={async () => {
              // Export CSV quickly (client-side)
              const rows = filtered.map((p) => {
                const cid = getPersonCompanyExternalId(p);
                const cname = companyMap[cid]?.name ?? (p.company?.name ?? cid);
                return {
                  id: p.externalId ?? p.id ?? "",
                  name: p.name,
                  designation: p.designation,
                  department: p.department,
                  company: cname,
                  location: p.location,
                };
              });
              const csv = [
                ["id", "name", "designation", "department", "company", "location"].join(","),
                ...rows.map((r) =>
                  [
                    `"${String(r.id ?? "")}"`,
                    `"${String(r.name ?? "")}"`,
                    `"${String(r.designation ?? "")}"`,
                    `"${String(r.department ?? "")}"`,
                    `"${String(r.company ?? "")}"`,
                    `"${String(r.location ?? "")}"`,
                  ].join(",")
                ),
              ].join("\n");

              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "people.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export
          </Button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div
        className="px-6 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        style={{ borderBottom: `1px solid ${SURFACE_BORDER}` }}
      >
        {/* Left: search */}
        <div className="flex-1 flex items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people by name"
            className="text-sm"
            style={{
              backgroundColor: "white",
              borderColor: SURFACE_BORDER,
              color: TEXT_DARK,
            }}
          />
          <span className="text-sm" style={{ color: MUTED }}>
            {filtered.length} result{filtered.length !== 1 && "s"}
          </span>
        </div>

        {/* Right: filters */}
        <div className="flex flex-wrap gap-2 md:justify-end">
          {/* Designation filter */}
          <Select
            value={filters.designation}
            onValueChange={(value) => handleFilterChange("designation", value)}
          >
            <SelectTrigger
              className="w-[160px] text-sm"
              style={{
                backgroundColor: "white",
                borderColor: SURFACE_BORDER,
                color: TEXT_DARK,
              }}
            >
              <SelectValue placeholder="Designation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All designations</SelectItem>
              {designations.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Department filter */}
          <Select
            value={filters.department}
            onValueChange={(value) => handleFilterChange("department", value)}
          >
            <SelectTrigger
              className="w-[160px] text-sm"
              style={{
                backgroundColor: "white",
                borderColor: SURFACE_BORDER,
                color: TEXT_DARK,
              }}
            >
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Company filter */}
          <Select
            value={filters.companyId}
            onValueChange={(value) => handleFilterChange("companyId", value)}
          >
            <SelectTrigger
              className="w-[180px] text-sm"
              style={{
                backgroundColor: "white",
                borderColor: SURFACE_BORDER,
                color: TEXT_DARK,
              }}
            >
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companyOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Location filter */}
          <Select
            value={filters.location}
            onValueChange={(value) => handleFilterChange("location", value)}
          >
            <SelectTrigger
              className="w-[180px] text-sm"
              style={{
                backgroundColor: "white",
                borderColor: SURFACE_BORDER,
                color: TEXT_DARK,
              }}
            >
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* TABLE + PAGINATION */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "separate" }}>
            <thead
              className="sticky top-0 z-10"
              style={{
                backgroundColor: "white",
                borderBottom: `1px solid ${SURFACE_BORDER}`,
              }}
            >
              <tr>
                <th className="text-left font-medium px-6 py-3" style={{ color: MUTED }}>
                  Name
                </th>
                <th className="text-left font-medium px-2 py-3" style={{ color: MUTED }}>
                  Designation
                </th>
                <th className="text-left font-medium px-2 py-3" style={{ color: MUTED }}>
                  Department
                </th>
                <th className="text-left font-medium px-2 py-3" style={{ color: MUTED }}>
                  Company
                </th>
                <th className="text-left font-medium px-2 py-3" style={{ color: MUTED }}>
                  Location
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => {
                const cid = getPersonCompanyExternalId(p);
                const cmp = companyMap[cid];
                const initials = String(p.name ?? "")
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <tr
                    key={p.externalId ?? p.id}
                    className="cursor-pointer"
                    style={{
                      borderBottom: `1px solid ${SURFACE_BORDER}`,
                      backgroundColor: SURFACE,
                    }}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold"
                          style={{
                            backgroundColor: "#E6E7EA",
                            color: TEXT_DARK,
                            border: `1px solid ${SURFACE_BORDER}`,
                          }}
                        >
                          {initials}
                        </div>
                        <div>
                          <p style={{ color: TEXT_DARK }} className="font-medium">
                            {p.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3" style={{ color: TEXT_DARK }}>
                      {p.designation}
                    </td>
                    <td className="px-2 py-3" style={{ color: TEXT_DARK }}>
                      {p.department}
                    </td>
                    <td className="px-2 py-3" style={{ color: TEXT_DARK }}>
                      <div className="flex items-center gap-2">
                        {cmp?.logo && <img src={cmp.logo} alt={cmp.name} className="h-4 w-4 object-contain" />}
                        <span>{cmp?.name ?? p.company?.name ?? cid}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3" style={{ color: TEXT_DARK }}>
                      {p.location}
                    </td>
                  </tr>
                );
              })}

              {paginated.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-sm" style={{ color: MUTED }}>
                    No people match this search / filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div
          className="py-3 flex items-center justify-center"
          style={{ borderTop: `1px solid ${SURFACE_BORDER}`, backgroundColor: SURFACE }}
        >
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage - 1);
                  }}
                  className="px-3 py-1 rounded-l-md border"
                  style={
                    {
                      backgroundColor: "white",
                      border: `1px solid ${SURFACE_BORDER}`,
                      color: TEXT_DARK,
                    } as any
                  }
                />
              </PaginationItem>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                const isActive = pageNum === currentPage;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      href="#"
                      isActive={isActive}
                      onClick={(e) => {
                        e.preventDefault();
                        handlePageChange(pageNum);
                      }}
                      className={`px-3 py-1 mx-1 rounded-md text-sm ${isActive ? "" : ""}`}
                      style={
                        isActive
                          ? {
                              backgroundColor: TEXT_DARK,
                              color: "white",
                              border: `1px solid ${SURFACE_BORDER}`,
                            }
                          : {
                              backgroundColor: "white",
                              color: TEXT_DARK,
                              border: `1px solid ${SURFACE_BORDER}`,
                            }
                      }
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    handlePageChange(currentPage + 1);
                  }}
                  className="px-3 py-1 rounded-r-md border"
                  style={
                    {
                      backgroundColor: "white",
                      border: `1px solid ${SURFACE_BORDER}`,
                      color: TEXT_DARK,
                    } as any
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}
