"use client";

import { useMemo, useState, useEffect } from "react";
import api from "@/lib/axiosConfig";
import type { Company } from "@/lib/types";
import CompanyBodyHeader from "./CompanyBodyHeader";
import type { Filters } from "./CompanyFiltersDialog";

/* UI surface tokens (soft shaded white) */
const SURFACE = "rgba(255,255,255,0.94)";
const SURFACE_BORDER = "rgba(0,0,0,0.06)";
const TEXT_DARK = "#111827";
const MUTED = "#6B7280";
const ROW_HOVER = "rgba(15,23,42,0.04)"; // subtle hover

const CompaniesBody = () => {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({ industries: [] });
  const [selected, setSelected] = useState<Company | null>(null);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // fetch companies from backend
  useEffect(() => {
    let mounted = true;
    const fetchCompanies = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/companies", { params: { q: "", page: 1, limit: 200 } });
        // backend returns { data: { items: [...] } }
        const items = res?.data?.data?.items ?? res?.data ?? [];
        if (!mounted) return;
        setCompanies(items);
      } catch (err: any) {
        console.error("Failed to fetch companies", err?.response?.data ?? err.message ?? err);
        if (mounted) setError(err?.response?.data?.message ?? String(err?.message ?? "Failed to load companies"));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchCompanies();
    return () => {
      mounted = false;
    };
  }, []);

  // derive list of industries from fetched companies
  const ALL_INDUSTRIES = useMemo(() => {
    const set = new Set<string>();
    for (const c of companies) {
      if (Array.isArray(c.industries)) {
        for (const ind of c.industries) set.add(String(ind));
      }
    }
    return Array.from(set).sort();
  }, [companies]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return companies
      .filter((company) => {
        if (filters.employeesRange) {
          const empStr = String(company.employees ?? "")
            .replace("+", "")
            .replace(/,/g, "")
            .trim();
          const empNum = parseInt(empStr, 10);

          if (Number.isNaN(empNum)) return false;

          if (filters.employeesRange === "0-50" && !(empNum >= 0 && empNum <= 50)) return false;
          if (filters.employeesRange === "51-200" && !(empNum >= 51 && empNum <= 200)) return false;
          if (filters.employeesRange === "201-500" && !(empNum >= 201 && empNum <= 500)) return false;
          if (filters.employeesRange === "501-1000" && !(empNum >= 501 && empNum <= 1000)) return false;
        }

        // Filter by revenue
        if (filters.revenueRange) {
          const rev = Number(company.revenueBillion ?? 0);

          if (filters.revenueRange === "lt-10b" && !(rev < 10)) return false;
          if (filters.revenueRange === "10-50b" && !(rev >= 10 && rev <= 50)) return false;
          if (filters.revenueRange === "50-100b" && !(rev >= 50 && rev <= 100)) return false;
          if (filters.revenueRange === "100-300b" && !(rev >= 100 && rev <= 300)) return false;
          if (filters.revenueRange === "gt-300b" && !(rev > 300)) return false;
        }

        //Filter by Funding
        if (filters.fundingStage) {
          if (!company.fundingStage) return false;
          if (company.fundingStage !== filters.fundingStage) return false;
        }

        // Founded year (range-based filtering)
        if (filters.fundedYear) {
          const year = Number(company.founded ?? 0);

          switch (filters.fundedYear) {
            case "before-1900":
              if (!(year < 1900)) return false;
              break;
            case "1900-1950":
              if (!(year >= 1900 && year <= 1950)) return false;
              break;
            case "1951-1980":
              if (!(year >= 1951 && year <= 1980)) return false;
              break;
            case "1981-2000":
              if (!(year >= 1981 && year <= 2000)) return false;
              break;
            case "after-2000":
              if (!(year > 2000)) return false;
              break;
            default:
              break;
          }
        }

        // Industries filter
        if (filters.industries.length > 0) {
          const hasAnyIndustry = filters.industries.some((ind) => (company.industries ?? []).includes(ind));
          if (!hasAnyIndustry) return false;
        }

        return true;
      })
      .filter((c) => c.name.toLowerCase().includes(term));
  }, [companies, search, filters]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: SURFACE }}>
        <div>Loading companies…</div>
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
    <div style={{ backgroundColor: SURFACE }}>
      {/* Header now controls filters + search */}
      <CompanyBodyHeader
        filters={filters}
        setFilters={setFilters}
        search={search}
        setSearch={setSearch}
        companies={companies}
        industries={ALL_INDUSTRIES}
      />

      <div className="flex h-full" style={{ backgroundColor: SURFACE }}>
        {/* CENTER: list */}
        <section className="flex-1 min-h-screen flex flex-col border-r" style={{ borderColor: SURFACE_BORDER }}>
          {/* Top bar */}
          <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: SURFACE_BORDER }}>
            <div>
              <h1 className="text-sm font-semibold tracking-tight" style={{ color: TEXT_DARK }}>
                Find companies
              </h1>
              <p className="text-[11px]" style={{ color: MUTED }}>
                Use filters and search to find the right prospects.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                className="px-3 py-1 rounded-md"
                style={{
                  backgroundColor: "white",
                  border: `1px solid ${SURFACE_BORDER}`,
                  color: TEXT_DARK,
                }}
              >
                Save as new search
              </button>
              <button
                className="px-3 py-1 rounded-md"
                style={{
                  backgroundColor: "white",
                  border: `1px solid ${SURFACE_BORDER}`,
                  color: TEXT_DARK,
                }}
              >
                Sort
              </button>
            </div>
          </div>

          {/* Inline search + count */}
          <div className="px-5 py-2 border-b flex items-center gap-3" style={{ borderColor: SURFACE_BORDER }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies"
              className="flex-1 rounded-md px-3 py-1.5 text-xs focus:outline-none"
              style={{
                backgroundColor: "white",
                border: `1px solid ${SURFACE_BORDER}`,
                color: TEXT_DARK,
              }}
            />
            <span className="text-[11px]" style={{ color: MUTED }}>
              {filtered.length} result{filtered.length !== 1 && "s"}
            </span>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-xs" style={{ borderCollapse: "separate" }}>
              <thead
                className="sticky top-0 z-10"
                style={{
                  backgroundColor: "white",
                  borderBottom: `1px solid ${SURFACE_BORDER}`,
                }}
              >
                <tr>
                  <th className="text-left font-medium px-5 py-2" style={{ color: MUTED }}>
                    Company
                  </th>
                  <th className="text-left font-medium px-2 py-2" style={{ color: MUTED }}>
                    Industry
                  </th>
                  <th className="text-left font-medium px-2 py-2" style={{ color: MUTED }}>
                    Location
                  </th>
                  <th className="text-left font-medium px-2 py-2" style={{ color: MUTED }}>
                    Employees
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((c) => {
                  const isActive = selected?.id === c.id;
                  return (
                    <tr
                      key={c.externalId ?? c.id}
                      onClick={() => setSelected(c)}
                      className="cursor-pointer"
                      style={{
                        backgroundColor: isActive ? ROW_HOVER : "transparent",
                        borderBottom: `1px solid ${SURFACE_BORDER}`,
                      }}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-7 w-7 rounded-md flex items-center justify-center overflow-hidden"
                            style={{
                              backgroundColor: "white",
                              border: `1px solid ${SURFACE_BORDER}`,
                            }}
                          >
                            {c.logo ? (
                              <img src={c.logo} alt={c.name} className="h-7 w-7 object-contain" />
                            ) : (
                              <span className="text-[10px] font-semibold" style={{ color: TEXT_DARK }}>
                                {c.name[0]}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-medium" style={{ color: TEXT_DARK }}>
                              {c.name}
                            </p>
                            <p className="text-[11px]" style={{ color: MUTED }}>
                              {c.website?.replace("https://", "")}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-2 py-3 text-[11px]" style={{ color: MUTED }}>
                        {Array.isArray(c.industries) && c.industries[0]}
                      </td>
                      <td className="px-2 py-3 text-[11px]" style={{ color: MUTED }}>
                        {c.location}
                      </td>
                      <td className="px-2 py-3 text-[11px]" style={{ color: MUTED }}>
                        {c.employees}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="p-6 text-xs" style={{ color: MUTED }}>
                No companies match this search / filters.
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: details */}
        <aside
          style={{
            backgroundColor: SURFACE,
            borderLeft: `1px solid ${SURFACE_BORDER}`,
          }}
          className="w-[32rem] p-5 overflow-y-auto"
        >
          {selected ? (
            <>
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center overflow-hidden"
                  style={{ backgroundColor: "#F3F4F6" }}
                >
                  <span className="text-xs font-semibold" style={{ color: TEXT_DARK }}>
                    {selected.name[0]}
                  </span>
                </div>
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: TEXT_DARK }}>
                    {selected.name}
                  </h2>
                  <p className="text-[11px]" style={{ color: MUTED }}>
                    {selected.industries?.[0]} · {selected.location}
                  </p>
                </div>
              </div>

              <section className="mb-4">
                <h3 className="text-[11px] font-semibold mb-1" style={{ color: MUTED }}>
                  Company details
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: TEXT_DARK }}>
                  {selected.description}
                </p>
              </section>

              <section className="mb-4">
                <p className="text-[11px] uppercase mb-1" style={{ color: MUTED }}>
                  Industries
                </p>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {selected.industries?.map((ind) => (
                    <span
                      key={ind}
                      className="px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: "white",
                        border: `1px solid ${SURFACE_BORDER}`,
                        color: TEXT_DARK,
                      }}
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </section>

              <section className="mb-4">
                <p className="text-[11px] uppercase mb-1" style={{ color: MUTED }}>
                  Keywords
                </p>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {selected.keywords?.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-1 rounded-full"
                      style={{
                        backgroundColor: "white",
                        border: `1px solid ${SURFACE_BORDER}`,
                        color: TEXT_DARK,
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </section>

              <section className="grid grid-cols-2 gap-4 text-xs mb-4">
                <div>
                  <p className="text-[11px] uppercase mb-1" style={{ color: MUTED }}>
                    Subsidiary of
                  </p>
                  <p style={{ color: TEXT_DARK }}>{selected.parentCompany}</p>
                </div>

                <div>
                  <p className="text-[11px] uppercase mb-1" style={{ color: MUTED }}>
                    Subsidiaries
                  </p>
                  <p style={{ color: TEXT_DARK }}>{selected.subsidiariesCount} subsidiaries</p>
                </div>

                <div>
                  <p className="text-[11px] uppercase mb-1" style={{ color: MUTED }}>
                    Founded
                  </p>
                  <p style={{ color: TEXT_DARK }}>{selected.founded}</p>
                </div>

                <div>
                  <p className="text-[11px] uppercase mb-1" style={{ color: MUTED }}>
                    Employees
                  </p>
                  <p style={{ color: TEXT_DARK }}>{selected.employees}</p>
                </div>

                <div>
                  <p className="text-[11px] uppercase mb-1" style={{ color: MUTED }}>
                    Revenue
                  </p>
                  <p style={{ color: TEXT_DARK }}>
                    {selected.revenueBillion != null ? `$${selected.revenueBillion.toLocaleString()}B` : "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase mb-1" style={{ color: MUTED }}>
                    Funding stage
                  </p>
                  <p style={{ color: TEXT_DARK }}>
                    {selected.fundingStage ? selected.fundingStage.charAt(0).toUpperCase() + selected.fundingStage.slice(1) : "Not available"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] uppercase mb-1" style={{ color: MUTED }}>
                    Total funding
                  </p>
                  <p style={{ color: TEXT_DARK }}>
                    {selected.totalFundingMillion != null ? `$${selected.totalFundingMillion.toLocaleString()}M` : "Not available"}
                  </p>
                </div>
              </section>

              <section className="mb-2">
                <p className="text-[11px] uppercase mb-1" style={{ color: MUTED }}>
                  Links
                </p>
                <div className="flex gap-3 text-xs">
                  <a href={selected.website} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "#2563EB" }}>
                    Website
                  </a>
                </div>
              </section>
            </>
          ) : (
            <p className="text-xs" style={{ color: MUTED }}>
              Select a company in the table to view details here.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
};

export default CompaniesBody;
