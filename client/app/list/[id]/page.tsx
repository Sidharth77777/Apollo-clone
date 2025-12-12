// app/list/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/axiosConfig";
import toast from "react-hot-toast";
import { FiSearch, FiPlus, FiTrash2, FiPhone, FiMail, FiExternalLink } from "react-icons/fi";
import { SiLinkedin } from "react-icons/si";
import { Button } from "@/components/ui/button";
import PageLayout from "@/app/components/PageLayout";
import { useWebProvider } from "@/app/context/WebContext";

const SURFACE = "rgba(255,255,255,0.94)";
const SURFACE_BORDER = "rgba(0,0,0,0.06)";
const TEXT_DARK = "#111827";
const MUTED = "#6B7280";
const CHIP_BG = "#F3F4F6";

/**
 * Button style variants (Tailwind classes)
 * - primary: filled dark action (used for Add)
 * - outline: subtle white card button with border (used for Refresh)
 * - danger: red outline for destructive actions (used for Remove)
 *
 * These are intentionally conservative to match the site tokens.
 */
const BTN = {
  primary:
    "inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium shadow-sm " +
    "bg-[#0f172a] text-white hover:bg-[#0b1320] disabled:opacity-60 disabled:cursor-not-allowed " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-300",
  outline:
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium " +
    "bg-white border text-[#111827] hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed " +
    "focus:outline-none focus:ring-2 focus:ring-indigo-200",
  danger:
    "inline-flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium " +
    "bg-white border border-[#fde2e2] text-[#8b1e1e] hover:bg-[#fff5f5] disabled:opacity-60 disabled:cursor-not-allowed " +
    "focus:outline-none focus:ring-2 focus:ring-red-200",
};

export default function ListDetailPage() {
  const params = useParams();

  // normalise ParamValue (string | string[] | undefined) -> string | undefined
  const rawId = params?.id;
  const listId = Array.isArray(rawId) ? rawId[0] : rawId;

  return <ListDetailClient listId={listId} />;
}

function ListDetailClient({ listId }: { listId?: string }) {
  const { setRefreshFlag } = useWebProvider();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<any | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // search/suggestions state
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<any | null>(null);

  // add/remove in-progress flags
  const [adding, setAdding] = useState(false);
  const [removingIds, setRemovingIds] = useState<Record<string, boolean>>({});

  // debounce timer (store id so we can clear)
  const debounceRef = useRef<number | null>(null);

  // fetch list when listId is available
  useEffect(() => {
    if (!listId) return;
    let mounted = true;
    setLoading(true);
    setFetchError(null);

    api
      .get(`/lists/${listId}`)
      .then((res) => {
        if (!mounted) return;
        const payload = res?.data?.data ?? res?.data;
        console.log("LIST FETCH:", payload);
        setList(payload);
      })
      .catch((err: any) => {
        console.error("Failed to fetch list:", err);
        setFetchError(err?.response?.data?.message ?? "Failed to fetch list");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [listId]);

  // live search for people (debounced)
  useEffect(() => {
    // clear existing timer
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (!query || query.trim().length < 1) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    setSuggestionsLoading(true);
    const id = window.setTimeout(async () => {
      try {
        const res = await api.get("/people", { params: { q: query, page: 1, limit: 10 } });
        const items = res?.data?.data?.items ?? res?.data ?? [];
        setSuggestions(items);
      } catch (err: any) {
        console.error("People search failed:", err);
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }, 250);

    debounceRef.current = id as unknown as number;

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [query]);

  const members = useMemo(() => {
    if (!list) return [];
    if (Array.isArray(list.members) && list.members.length > 0 && typeof list.members[0] === "object") {
      return list.members;
    }
    return [];
  }, [list]);

  const handleSelectSuggestion = (person: any) => {
    setSelectedToAdd(person);
    setQuery(person.name);
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

  const handleAddMember = async () => {
    if (!listId) return toast.error("Missing list id");
    if (!selectedToAdd?._id && !selectedToAdd?.id) return toast.error("Select a person to add");
    const personId = selectedToAdd._id ?? selectedToAdd.id;
    setAdding(true);
    try {
      const res = await api.post(`/lists/${listId}/members`, { personId });
      const payload = res?.data?.data ?? res?.data;
      setList(payload);
      setSelectedToAdd(null);
      setQuery("");
      setRefreshFlag((prev) => !prev);
      toast.success("Member added");
    } catch (err: any) {
      console.error("Failed to add member:", err);
      const msg = err?.response?.data?.message ?? "Failed to add member";
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!listId) return toast.error("Missing list id");
    setRemovingIds((s) => ({ ...s, [memberId]: true }));
    try {
      const res = await api.delete(`/lists/${listId}/members/${memberId}`);
      const payload = res?.data?.data ?? res?.data;
      setList(payload);
      setRefreshFlag((prev) => !prev);
      toast.success("Member removed");
    } catch (err: any) {
      console.error("Failed to remove member:", err);
      toast.error(err?.response?.data?.message ?? "Failed to remove member");
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
              <h1 className="text-xl font-semibold" style={{ color: TEXT_DARK }}>
                {list?.name ?? "List"}
              </h1>
              <p className="text-sm" style={{ color: MUTED }}>
                {list ? `Target: ${list.target ?? "people"}` : "List details"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Outline button for neutral actions */}
              <button
                onClick={refreshList}
                className={BTN.outline}
                aria-label="Refresh list"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Add member area */}
          <div className="bg-white p-4 rounded-lg" style={{ border: `1px solid ${SURFACE_BORDER}` }}>
            <label className="text-xs font-medium" style={{ color: TEXT_DARK }}>
              Add person to this list
            </label>

            <div className="mt-3 flex gap-2 items-center">
              <div style={{ flex: 1 }} className="relative">
                <div
                  className="flex items-center px-3 py-2 rounded-md"
                  style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white" }}
                >
                  <FiSearch className="mr-2 text-gray-500" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedToAdd(null);
                    }}
                    placeholder="Search people by name..."
                    className="w-full outline-none text-sm"
                    style={{ color: TEXT_DARK }}
                    aria-label="Search people"
                  />
                </div>

                {/* suggestions dropdown */}
                {suggestions.length > 0 && (
                  <div
                    className="absolute left-0 right-0 mt-1 bg-white rounded-md shadow-lg z-30 divide-y"
                    style={{ border: `1px solid ${SURFACE_BORDER}` }}
                  >
                    {suggestions.map((s) => (
                      <div
                        key={s._id ?? s.id}
                        onClick={() => handleSelectSuggestion(s)}
                        className="px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm" style={{ color: TEXT_DARK }}>{s.name}</div>
                          <div className="text-xs" style={{ color: MUTED }}>{s.designation ?? s.location ?? ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Primary add button */}
              <button
                onClick={handleAddMember}
                disabled={adding || !selectedToAdd}
                className={`${BTN.primary} ${adding ? "opacity-70" : ""}`}
                aria-label="Add member"
              >
                <FiPlus />
                <span>{adding ? "Adding..." : "Add"}</span>
              </button>
            </div>
          </div>

          {/* Members list */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2" style={{ color: TEXT_DARK }}>
              Members ({members.length})
            </h3>

            {loading ? (
              <div className="p-4 text-sm" style={{ color: MUTED }}>Loading...</div>
            ) : fetchError ? (
              <div className="p-4 text-sm" style={{ color: "#b91c1c" }}>{fetchError}</div>
            ) : members.length === 0 ? (
              <div className="p-4 text-sm" style={{ color: MUTED }}>No members yet. Add people using the search above.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {members.map((m: any) => {
                  const id = m._id ?? m.id;
                  const phone = m.phone ?? m.contactPhone ?? null;
                  const personalEmail = m.email ?? null;
                  const companyEmail = m.companyEmail ?? m.corporateEmail ?? null;
                  const linkedin = m.social?.linkedin ?? m.social?.LinkedIn ?? null;
                  return (
                    <div
                      key={id}
                      className="flex items-start justify-between p-3 bg-white rounded-md"
                      style={{ border: `1px solid ${SURFACE_BORDER}` }}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div style={{ width: 48, height: 48 }} className="rounded-md flex items-center justify-center text-xs font-semibold" >
                          <div
                            style={{ backgroundColor: CHIP_BG, width: 48, height: 48, borderRadius: 10 }}
                            className="flex items-center justify-center text-black text-sm font-semibold"
                          >
                            {(String(m.name || "").split(" ").map((s: string) => s[0] ?? "").join("").slice(0,2) || "?").toUpperCase()}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: TEXT_DARK }}>{m.name}</div>
                          <div className="text-xs truncate" style={{ color: MUTED }}>{m.designation ?? m.department ?? m.location ?? "—"}</div>

                          {/* additional info block */}
                          <div className="mt-2 text-xs" style={{ color: MUTED }}>
                            {phone && (
                              <div className="flex items-center gap-2">
                                <FiPhone />
                                <a href={`tel:${phone}`} className="truncate" style={{ color: TEXT_DARK, textDecoration: "none" }}>{phone}</a>
                              </div>
                            )}

                            {personalEmail && (
                              <div className="flex items-center gap-2 mt-1">
                                <FiMail />
                                <a href={`mailto:${personalEmail}`} className="truncate" style={{ color: TEXT_DARK, textDecoration: "none" }}>{personalEmail}</a>
                              </div>
                            )}

                            {companyEmail && !personalEmail && ( // show company email if personal not present, else show both
                              <div className="flex items-center gap-2 mt-1">
                                <FiMail />
                                <a href={`mailto:${companyEmail}`} className="truncate" style={{ color: TEXT_DARK, textDecoration: "none" }}>{companyEmail}</a>
                              </div>
                            )}

                            {/* if both present, show company email below */}
                            {companyEmail && personalEmail && (
                              <div className="flex items-center gap-2 mt-1">
                                <FiMail />
                                <a href={`mailto:${companyEmail}`} className="truncate" style={{ color: MUTED, textDecoration: "none" }}>{companyEmail}</a>
                              </div>
                            )}

                            {/* social / linkedin */}
                            {linkedin && (
                              <div className="flex items-center gap-2 mt-1">
                                <SiLinkedin className="text-sm" />
                                <a href={linkedin} target="_blank" rel="noreferrer" className="truncate" style={{ color: TEXT_DARK, textDecoration: "none" }}>
                                  View profile <FiExternalLink className="inline ml-1" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRemoveMember(id)}
                          disabled={Boolean(removingIds[id])}
                          className={BTN.danger}
                          aria-label={`Remove ${m.name}`}
                        >
                          <FiTrash2 />
                          <span className="ml-2">{removingIds[id] ? "Removing..." : "Remove"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
