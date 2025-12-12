// app/company/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/axiosConfig";
import toast from "react-hot-toast";
import { FiSearch, FiPlus, FiTrash2, FiRefreshCw } from "react-icons/fi";
import PageLayout from "@/app/components/PageLayout";
import { Button } from "@/components/ui/button";
import { useWebProvider } from "@/app/context/WebContext";

const SURFACE = "rgba(255,255,255,0.94)";
const SURFACE_BORDER = "rgba(0,0,0,0.06)";
const TEXT_DARK = "#111827";
const MUTED = "#6B7280";
const CHIP_BG = "#F3F4F6";

const BTN = {
  primary: "inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium shadow-sm bg-[#0f172a] text-white",
  outline: "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-white border text-[#111827]",
  danger: "inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium bg-white border border-[#fde2e2] text-[#8b1e1e]",
};

export default function CompanyListDetailPageWrapper() {
  const params = useParams();
  const rawId = params?.id;
  const listId = Array.isArray(rawId) ? rawId[0] : rawId;
  return <CompanyListDetailClient listId={listId} />;
}

function CompanyListDetailClient({ listId }: { listId?: string }) {
  const { setRefreshFlag } = useWebProvider();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<any | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<any | null>(null);

  const [adding, setAdding] = useState(false);
  const [removingIds, setRemovingIds] = useState<Record<string, boolean>>({});

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!listId) return;
    let mounted = true;
    setLoading(true);
    setFetchError(null);

    api.get(`/lists/${listId}`)
      .then((res) => {
        if (!mounted) return;
        const payload = res?.data?.data ?? res?.data;
        setList(payload);
      })
      .catch((err: any) => {
        console.error("Failed to fetch company list:", err);
        setFetchError(err?.response?.data?.message ?? "Failed to fetch list");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [listId]);

  // company search (debounced) — search global company index
  useEffect(() => {
    if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
    if (!query || query.trim().length < 1) { setSuggestions([]); setSuggestionsLoading(false); return; }

    setSuggestionsLoading(true);
    const id = window.setTimeout(async () => {
      try {
        // search companies endpoint — adjust q param per your API
        const res = await api.get("/companies", { params: { q: query, page: 1, limit: 10 } });
        const items = res?.data?.data?.items ?? res?.data ?? [];
        setSuggestions(items);
      } catch (err: any) {
        console.error("Company search failed:", err);
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 250);
    debounceRef.current = id as unknown as number;

    return () => {
      if (debounceRef.current) { window.clearTimeout(debounceRef.current); debounceRef.current = null; }
    };
  }, [query]);

  const members = useMemo(() => {
    if (!list) return [];
    if (Array.isArray(list.members) && list.members.length > 0 && typeof list.members[0] === "object") return list.members;
    return [];
  }, [list]);

  const handleSelectSuggestion = (c: any) => {
    setSelectedToAdd(c);
    setQuery(c.name);
    setSuggestions([]);
  };

  const refreshList = async () => {
    if (!listId) return;
    try {
      const res = await api.get(`/lists/${listId}`);
      const payload = res?.data?.data ?? res?.data;
      setList(payload);
      setRefreshFlag((prev) => !prev);
      toast.success("List refreshed");
    } catch (err: any) {
      console.error("Failed to refresh list:", err);
      toast.error("Failed to refresh list");
    }
  };

  const handleAddCompany = async () => {
  if (!listId) return toast.error("Missing list id");
  if (!selectedToAdd?._id && !selectedToAdd?.id) return toast.error("Select a company to add");
  const companyId = selectedToAdd._id ?? selectedToAdd.id;
  setAdding(true);
  try {
    // add member
    const res = await api.post(`/lists/${listId}/members`, { companyId });
    const payload = res?.data?.data ?? res?.data;

    // Prefer the refreshed, populated list — refreshList() will set the list state.
    await refreshList();

    // Do NOT overwrite with unpopulated payload (commented out)
    // setList(payload);
    setSelectedToAdd(null);
    setQuery("");
    toast.success("Company added");
  } catch (err: any) {
    console.error("Failed to add company:", err);
    toast.error(err?.response?.data?.message ?? "Failed to add company");
  } finally {
    setAdding(false);
  }
};


  const handleRemoveCompany = async (memberId: string) => {
  if (!listId) return toast.error("Missing list id");
  setRemovingIds((s) => ({ ...s, [memberId]: true }));
  try {
    const res = await api.delete(`/lists/${listId}/members/${memberId}`);
    const payload = res?.data?.data ?? res?.data;

    // If backend returned populated objects, you can use it; otherwise refresh.
    const hasPopulatedMembers = Array.isArray(payload?.members) && payload.members.length > 0 && typeof payload.members[0] === "object";
    if (hasPopulatedMembers) {
      setList(payload);
    } else {
      await refreshList();
    }

    setRefreshFlag((prev) => !prev);
    toast.success("Removed from list");
  } catch (err: any) {
    console.error("Failed to remove company:", err);
    toast.error(err?.response?.data?.message ?? "Failed to remove company");
  } finally {
    setRemovingIds((s) => {
      const copy = { ...s };
      delete copy[memberId];
      return copy;
    });
  }
};


  return (
    <PageLayout>
      <div className="min-h-screen p-6" style={{ backgroundColor: SURFACE }}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-xl font-semibold" style={{ color: TEXT_DARK }}>{list?.name ?? "Company list"}</h1>
              <p className="text-sm" style={{ color: MUTED }}>{list ? `Target: ${list.target ?? "company"}` : "List details"}</p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={refreshList} className={BTN.outline}><FiRefreshCw /> Refresh</button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg" style={{ border: `1px solid ${SURFACE_BORDER}` }}>
            <label className="text-xs font-medium" style={{ color: TEXT_DARK }}>Add company to this list</label>

            <div className="mt-3 flex gap-2 items-center">
              <div style={{ flex: 1 }} className="relative">
                <div className="flex items-center px-3 py-2 rounded-md" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white" }}>
                  <FiSearch className="mr-2 text-gray-500" />
                  <input value={query} onChange={(e) => { setQuery(e.target.value); setSelectedToAdd(null); }} placeholder="Search companies by name..." className="w-full outline-none text-sm" style={{ color: TEXT_DARK }} />
                </div>

                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white rounded-md shadow-lg z-30 divide-y" style={{ border: `1px solid ${SURFACE_BORDER}` }}>
                    {suggestions.map((s) => (
                      <div key={s._id ?? s.id} onClick={() => handleSelectSuggestion(s)} className="px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                        <div>
                          <div className="text-sm" style={{ color: TEXT_DARK }}>{s.name}</div>
                          <div className="text-xs" style={{ color: MUTED }}>{s.location ?? s.website ?? ""}</div>
                        </div>
                        <div className="text-xs" style={{ color: MUTED }}>{s.employees ?? ""}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={handleAddCompany} disabled={adding || !selectedToAdd} className={BTN.primary}>
                <FiPlus /> {adding ? "Adding..." : "Add"}
              </button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2" style={{ color: TEXT_DARK }}>Companies ({members.length})</h3>

            {loading ? (
              <div className="p-4 text-sm" style={{ color: MUTED }}>Loading...</div>
            ) : fetchError ? (
              <div className="p-4 text-sm" style={{ color: "#b91c1c" }}>{fetchError}</div>
            ) : members.length === 0 ? (
              <div className="p-4 text-sm" style={{ color: MUTED }}>No companies in this list yet. Add using the search above.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {members.map((m: any) => (
                  <div key={m._id ?? m.id} className="flex items-center justify-between p-3 bg-white rounded-md" style={{ border: `1px solid ${SURFACE_BORDER}` }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div style={{ width: 48, height: 48 }} className="rounded-md flex items-center justify-center overflow-hidden" >
                        {m.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.logo} alt={m.name} className="h-full w-full object-contain" />
                        ) : (
                          <div style={{ backgroundColor: CHIP_BG, width: 48, height: 48 }} className="flex items-center justify-center text-sm font-semibold text-black">
                            {String(m.name || "").slice(0,1).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: TEXT_DARK }}>{m.name}</div>
                        <div className="text-xs truncate" style={{ color: MUTED }}>{m.location ?? m.website ?? "—"}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => handleRemoveCompany(m._id ?? m.id)} disabled={Boolean(removingIds[m._id ?? m.id])} className={BTN.danger}>
                        <FiTrash2 />
                        <span className="ml-2">{removingIds[m._id ?? m.id] ? "Removing..." : "Remove"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
