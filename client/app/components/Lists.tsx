// app/components/Lists.tsx  (or wherever your Lists component lives)
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FiDownload } from "react-icons/fi";
import { FaList } from "react-icons/fa6";
import api from "@/lib/axiosConfig";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

import toast from "react-hot-toast";
import { useWebProvider } from "../context/WebContext";

const SURFACE = "rgba(255,255,255,0.94)";
const SURFACE_BORDER = "rgba(0,0,0,0.06)";
const TEXT_DARK = "#111827";
const MUTED = "#6B7280";
const CHIP_BG = "#F3F4F6";

const companyKey = (c: any) => String(c?.externalId ?? c?.id ?? c?._id ?? "");

export default function Lists() {
  const router = useRouter();
  const { setRefreshFlag } = useWebProvider();

  const [companies, setCompanies] = useState<any[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  const [people, setPeople] = useState<any[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);

  const [lists, setLists] = useState<any[]>([]);
  const [listsLoading, setListsLoading] = useState(true);

  const [listFilterTarget, setListFilterTarget] = useState<"people" | "company">("people");

  // dialog / create list
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListTarget, setNewListTarget] = useState<"people" | "company">("people");
  const [creatingList, setCreatingList] = useState(false);

  // delete handling
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});

  // sheet for adding people (kept minimal here)
  const [sheetOpen, setSheetOpen] = useState(false);

  // fetch companies
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setCompaniesLoading(true);
      try {
        const res = await api.get("/companies", { params: { page: 1, limit: 500 } });
        const items = res?.data?.data?.items ?? res?.data ?? [];
        if (!mounted) return;
        setCompanies(items);
      } catch (err: any) {
        console.error("Failed to load companies:", err);
      } finally {
        if (mounted) setCompaniesLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // fetch people
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setPeopleLoading(true);
      try {
        const res = await api.get("/people", { params: { page: 1, limit: 2000 } });
        const items = res?.data?.data?.items ?? res?.data ?? [];
        if (!mounted) return;
        setPeople(items);
      } catch (err: any) {
        console.error("Failed to load people:", err);
      } finally {
        if (mounted) setPeopleLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // fetch lists
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setListsLoading(true);
      try {
        const res = await api.get("/lists", { params: { page: 1, limit: 200 } });
        const items = res?.data?.data?.items ?? res?.data ?? [];
        if (!mounted) return;
        setLists(items);
      } catch (err: any) {
        console.error("Failed to load lists:", err);
      } finally {
        if (mounted) setListsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Create list
  const handleCreateList = async () => {
    if (!newListName?.trim()) {
      toast.error("List name is required");
      return;
    }
    if (!["people", "company"].includes(newListTarget)) {
      toast.error("Invalid target");
      return;
    }
    setCreatingList(true);
    try {
      const res = await api.post("/lists", { name: newListName.trim(), target: newListTarget });
      const created = res?.data?.data ?? res?.data ?? null;
      if (created) {
        setLists((p) => [created, ...p]);
        toast.success("List created");
        setNewListName("");
        setNewListTarget("people");
        setDialogOpen(false);
        setRefreshFlag((prev) => !prev);
      } else {
        // fallback refresh
        const r = await api.get("/lists", { params: { page: 1, limit: 200 } });
        setLists(r?.data?.data?.items ?? r?.data ?? []);
        setDialogOpen(false);
        toast.success("List created");
      }
    } catch (err: any) {
      console.error("Failed to create list:", err);
      toast.error(err?.response?.data?.message ?? "Failed to create list");
    } finally {
      setCreatingList(false);
    }
  };

  const openDeleteDialog = (idRaw?: string | null, name?: string) => {
    const id = String(idRaw ?? "");
    if (!id) return toast.error("Missing list id");
    setDeleteTarget({ id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      return;
    }
    const id = deleteTarget.id;
    setDeletingIds((s) => ({ ...s, [id]: true }));
    try {
      await api.delete(`/lists/${encodeURIComponent(id)}`);
      setLists((p) => p.filter((it) => String(it._id ?? it.id ?? "") !== id));
      toast.success("List deleted");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      setRefreshFlag((prev) => !prev);
      try { router.refresh(); } catch { }
    } catch (err: any) {
      console.error("Failed to delete list:", err);
      toast.error(err?.response?.data?.message ?? "Failed to delete list");
    } finally {
      setDeletingIds((s) => {
        const copy = { ...s };
        delete copy[id];
        return copy;
      });
    }
  };

  // derived companies membership counts (using front-end people list)
  const companiesWithCounts = useMemo(() => {
    return companies.map((c) => {
      const key = companyKey(c);
      const members = people.filter((p) => {
        const comp = p.company;
        if (typeof comp === "object" && comp !== null) return companyKey(comp) === key;
        return String(comp) === key || String(comp) === String(c._id) || String(comp) === String(c.id) || String(comp) === String(c.externalId);
      });
      return { company: c, members };
    });
  }, [companies, people]);

  const handleDownloadCsv = (companyObj: any) => {
    // same CSV utility as before (kept minimal)
    const key = companyKey(companyObj);
    const members = people.filter((p) => {
      const comp = p.company;
      if (typeof comp === "object" && comp !== null) return companyKey(comp) === key;
      return String(comp) === key || String(comp) === String(companyObj._id) || String(comp) === String(companyObj.id) || String(comp) === String(companyObj.externalId);
    });

    const headers = ["companyId", "companyName", "memberId", "memberName", "memberDesignation", "memberLocation"];
    const escape = (v: any) => {
      if (v == null) return "";
      const s = String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const rows = members.map((m) => [key, companyObj.name, String(m.externalId ?? m.id ?? ""), m.name, m.designation, m.location]);
    const csv = [headers.join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${companyObj.name}-people.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const filteredLists = useMemo(() => {
    return lists.filter((l) => String(l.target) === listFilterTarget);
  }, [lists, listFilterTarget]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: SURFACE }}>
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${SURFACE_BORDER}`, backgroundColor: SURFACE }}>
        <div>
          <h1 className="text-lg font-semibold" style={{ color: TEXT_DARK }}>People & Companies</h1>
          <p className="text-sm" style={{ color: MUTED }}>Lists, people and companies — create lists for people or companies.</p>
        </div>

        <div className="flex items-center gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-md text-sm text-black font-medium" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", padding: "6px 12px" }}>
                Create a List <FaList />
              </button>
            </DialogTrigger>

            <DialogContent className="max-w-md" style={{ padding: 24 }}>
              <DialogHeader>
                <DialogTitle style={{ fontSize: 18, color: TEXT_DARK }}>Create list</DialogTitle>
                <p className="text-sm" style={{ color: MUTED }}>Give the list a name and choose a target (People or Company).</p>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <label className="text-xs" style={{ color: TEXT_DARK }}>List name</label>
                  <input value={newListName} onChange={(e) => setNewListName(e.target.value)} className="w-full mt-2 px-3 py-2 rounded-md" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }} placeholder="e.g. Product folks — Bengaluru" />
                </div>

                <div>
                  <label className="text-xs" style={{ color: TEXT_DARK }}>Target</label>
                  <select value={newListTarget} onChange={(e) => setNewListTarget(e.target.value as any)} className="w-full mt-2 px-3 py-2 rounded-md" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", color: TEXT_DARK }}>
                    <option value="people">People</option>
                    <option value="company">Company</option>
                  </select>
                </div>
              </div>

              <DialogFooter className="flex justify-end gap-3" style={{ paddingTop: 12 }}>
                <Button variant="outline" onClick={() => setDialogOpen(false)} style={{ borderColor: SURFACE_BORDER }}>Cancel</Button>
                <Button onClick={handleCreateList} disabled={creatingList} style={{ backgroundColor: "#0f172a", color: "white" }}>
                  {creatingList ? "Creating..." : "Create list"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Lists table */}
      <section className="px-6 py-6" style={{ borderBottom: `1px solid ${SURFACE_BORDER}`, backgroundColor: SURFACE }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: TEXT_DARK }}>Lists</h2>
            <p className="text-xs" style={{ color: MUTED }}>Saved lists you created</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Toggle People / Company */}
            <ToggleGroup
              type="single"
              value={listFilterTarget}
              onValueChange={(v) => v && setListFilterTarget(v as any)}
              className="flex items-center bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm"
            >
              <ToggleGroupItem
                value="people"
                className={`
      px-4 py-1.5 text-xs font-medium transition-all cursor-pointer
      data-[state=on]:bg-gray-900 data-[state=on]:text-white
      data-[state=off]:text-gray-600
      data-[state=off]:hover:bg-gray-100
      rounded-none
    `}
              >
                People
              </ToggleGroupItem>

              <ToggleGroupItem
                value="company"
                className={`
      px-4 py-1.5 text-xs font-medium transition-all cursor-pointer
      data-[state=on]:bg-gray-900 data-[state=on]:text-white
      data-[state=off]:text-gray-600
      data-[state=off]:hover:bg-gray-100
      rounded-none
    `}
              >
                Company
              </ToggleGroupItem>
            </ToggleGroup>


            <div className="text-xs" style={{ color: MUTED }}>
              {filteredLists.length} total
            </div>
          </div>
        </div>


        {listsLoading ? <div className="text-xs" style={{ color: MUTED }}>Loading lists...</div> : (
          <div className="overflow-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "separate" }}>
              <thead style={{ backgroundColor: "white", borderBottom: `1px solid ${SURFACE_BORDER}` }}>
                <tr>
                  <th className="text-left font-medium px-6 py-3" style={{ color: MUTED }}>Name</th>
                  <th className="text-left font-medium px-2 py-3" style={{ color: MUTED }}>Target</th>
                  <th className="text-left font-medium px-2 py-3" style={{ color: MUTED }}>Members</th>
                  <th className="text-right font-medium px-6 py-3" style={{ color: MUTED }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredLists.map((l) => {
                  const id = String(l?._id ?? l?.id ?? "");
                  const isDeleting = Boolean(deletingIds[id]);
                  return (
                    <tr key={id} style={{ borderBottom: `1px solid ${SURFACE_BORDER}`, backgroundColor: SURFACE }}>
                      <td className="px-6 py-4" style={{ color: TEXT_DARK }}>{l.name}</td>
                      <td className="px-2 py-4" style={{ color: MUTED }}>{l.target}</td>
                      <td className="px-2 py-4" style={{ color: TEXT_DARK }}>{l.membersCount ?? (Array.isArray(l.members) ? l.members.length : 0)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => {
                            if (!id) { toast.error("Missing list id"); return; }
                            // route based on target
                            if (String(l.target) === "company") router.push(`/company/${encodeURIComponent(String(id))}`);
                            else router.push(`/list/${encodeURIComponent(String(id))}`);
                          }} className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-black cursor-pointer" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white" }}>
                            View
                          </Button>

                          <Button onClick={() => openDeleteDialog(id, l?.name)} disabled={isDeleting} className="inline-flex items-center gap-2 rounded-md text-sm font-medium text-black cursor-pointer" style={{ border: `1px solid ${SURFACE_BORDER}`, backgroundColor: "white", opacity: isDeleting ? 0.7 : 1 }}>
                            {isDeleting ? "Deleting..." : "Delete"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent people (unchanged) */}
      <section className="px-6 py-6" style={{ borderBottom: `1px solid ${SURFACE_BORDER}`, backgroundColor: SURFACE }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: TEXT_DARK }}>Recent people</h2>
            <p className="text-xs" style={{ color: MUTED }}>Top 5 newest people</p>
          </div>
          <div className="text-xs" style={{ color: MUTED }}>{people.length} total</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {peopleLoading ? <div className="col-span-full text-xs" style={{ color: MUTED }}>Loading people...</div> :
            (people.slice(0, 5).map((p) => (
              <div key={String(p.externalId ?? p.id ?? Math.random())} className="p-3 rounded-md" style={{ backgroundColor: "white", border: `1px solid ${SURFACE_BORDER}` }}>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: CHIP_BG, color: TEXT_DARK }}>
                    {String(p.name || "").split(" ").map((s: string) => s[0] ?? "").join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium" style={{ color: TEXT_DARK }}>{p.name}</div>
                    <div className="text-xs" style={{ color: MUTED }}>{p.designation ?? "—"}</div>
                  </div>
                </div>
              </div>
            )))
          }
        </div>
      </section>

      {/* Companies table (kept same, CSV etc.) */}
      <section className="p-4" style={{ backgroundColor: SURFACE }}>
        <div className="mb-4 px-2">
          <h3 className="text-sm font-semibold mb-1" style={{ color: TEXT_DARK }}>Companies</h3>
          <p className="text-xs" style={{ color: MUTED }}>Browse companies and download CSVs of their members.</p>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "separate" }}>
            <thead className="sticky top-0 z-10" style={{ backgroundColor: "white", borderBottom: `1px solid ${SURFACE_BORDER}` }}>
              <tr>
                <th className="text-left font-medium px-6 py-3" style={{ color: MUTED }}>Company</th>
                <th className="text-left font-medium px-2 py-3" style={{ color: MUTED }}>Location</th>
                <th className="text-left font-medium px-2 py-3" style={{ color: MUTED }}>People</th>
                <th className="text-right font-medium px-6 py-3" style={{ color: MUTED }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {companiesWithCounts.map(({ company, members }) => (
                <tr key={companyKey(company)} style={{ borderBottom: `1px solid ${SURFACE_BORDER}`, backgroundColor: SURFACE }}>
                  <td className="px-6 py-4" style={{ color: TEXT_DARK }}>{company.name}</td>
                  <td className="px-2 py-4" style={{ color: MUTED }}>{company.location}</td>
                  <td className="px-2 py-4" style={{ color: TEXT_DARK }}>{members.length}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => handleDownloadCsv(company)} className="text-sm px-3 py-1.5" style={{ borderColor: SURFACE_BORDER, backgroundColor: "white", color: TEXT_DARK }}>
                        <FiDownload /> <span className="ml-2">CSV</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {companies.length === 0 && !companiesLoading && <div className="p-6 text-sm" style={{ color: MUTED }}>No companies available.</div>}
          {companiesLoading && <div className="p-6 text-sm" style={{ color: MUTED }}>Loading companies...</div>}
        </div>
      </section>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open) { setDeleteDialogOpen(false); setDeleteTarget(null); } else setDeleteDialogOpen(true);
      }}>
        <DialogContent className="max-w-md" style={{ padding: 24 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 18, color: TEXT_DARK }}>Delete list</DialogTitle>
            <p className="text-sm" style={{ color: MUTED }}>
              {`Are you sure you want to delete "${deleteTarget?.name ?? "this list"}"? This action cannot be undone.`}
            </p>
          </DialogHeader>

          <div className="mt-4 flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null); }} style={{ borderColor: SURFACE_BORDER }}>Cancel</Button>
            <Button onClick={confirmDelete} disabled={Boolean(deletingIds[deleteTarget?.id ?? ""])} style={{ backgroundColor: "#b91c1c", color: "white" }}>
              {deletingIds[deleteTarget?.id ?? ""] ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
