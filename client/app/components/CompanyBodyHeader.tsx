"use client";

import { Button } from "@/components/ui/button";
import { HiChevronDown } from "react-icons/hi";
import { ImMagicWand } from "react-icons/im";
import { RiArrowDropDownLine } from "react-icons/ri";
import { SlCalender } from "react-icons/sl";
import { CiSearch, CiSettings } from "react-icons/ci";
import { AiOutlineThunderbolt } from "react-icons/ai";
import CompanyFiltersDialog, { Filters } from "./CompanyFiltersDialog";

type Props = {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  // optional: pass companies (not needed now) and industries for the dialog
  companies?: any[];
  industries?: string[];
};

/* Surface tokens */
const SURFACE = "rgba(255,255,255,0.94)";
const SURFACE_BORDER = "rgba(0,0,0,0.06)";
const TEXT_DARK = "#111827";
const MUTED = "#6B7280";

export default function CompanyBodyHeader({
  filters,
  setFilters,
  search,
  setSearch,
  companies,
  industries,
}: Props) {
  return (
    <div
      style={{
        backgroundColor: SURFACE,
        borderBottom: `1px solid ${SURFACE_BORDER}`,
      }}
      className="px-4 py-3 space-y-3"
    >
      {/* TOP ROW: title + actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm font-semibold tracking-tight" style={{ color: TEXT_DARK }}>
            Find companies
          </h1>
          <p className="text-[11px]" style={{ color: MUTED }}>
            Search, filter and save views for your outbound workflows.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            className="bg-white h-8 px-3 text-xs font-medium flex items-center gap-2"
            style={{
              border: `1px solid ${SURFACE_BORDER}`,
              color: TEXT_DARK,
              backgroundColor: "white",
            }}
          >
            <ImMagicWand className="text-[14px]" />
            <span>Research with AI</span>
          </Button>

          <Button
            className="bg-white h-8 px-3 text-xs font-medium flex items-center gap-1"
            style={{
              border: `1px solid ${SURFACE_BORDER}`,
              color: TEXT_DARK,
              backgroundColor: "white",
            }}
          >
            <span>Import</span>
            <RiArrowDropDownLine className="text-lg" />
          </Button>
        </div>
      </div>

      {/* BOTTOM ROW: view + filters + search + secondary actions */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        {/* Left: view / filters / search */}
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <Button
            className="h-8 px-3 text-xs flex items-center gap-1"
            style={{
              backgroundColor: "white",
              border: `1px solid ${SURFACE_BORDER}`,
              color: TEXT_DARK,
            }}
          >
            <SlCalender className="text-[14px]" />
            <span>Default view</span>
            <HiChevronDown className="text-[14px]" />
          </Button>

          {/* pass industries to the dialog */}
          <CompanyFiltersDialog filters={filters} setFilters={setFilters} industries={industries ?? []} />

          <div className="flex-1 relative min-w-[120px]">
            <CiSearch className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies"
              className="w-full rounded-md pl-8 pr-3 py-1.5 text-xs focus:outline-none"
              style={{
                backgroundColor: "white",
                border: `1px solid ${SURFACE_BORDER}`,
                color: TEXT_DARK,
              }}
            />
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 justify-end">
          <Button
            className="h-8 px-3 text-xs flex items-center gap-1"
            style={{
              backgroundColor: "white",
              border: `1px solid ${SURFACE_BORDER}`,
              color: TEXT_DARK,
            }}
          >
            <AiOutlineThunderbolt className="text-[14px]" />
            <span>Create workflow</span>
            <RiArrowDropDownLine className="text-lg" />
          </Button>

          <Button
            className="h-8 px-3 text-xs"
            style={{
              backgroundColor: "white",
              border: `1px solid ${SURFACE_BORDER}`,
              color: TEXT_DARK,
            }}
          >
            Save as new search
          </Button>

          <Button
            className="h-8 px-3 text-xs flex items-center gap-1"
            style={{
              backgroundColor: "white",
              border: `1px solid ${SURFACE_BORDER}`,
              color: TEXT_DARK,
            }}
          >
            <SlCalender className="text-[14px]" />
            <span>Sort</span>
            <HiChevronDown className="text-[14px]" />
          </Button>

          <Button
            className="h-8 px-3 text-xs flex items-center gap-1"
            style={{
              backgroundColor: "white",
              border: `1px solid ${SURFACE_BORDER}`,
              color: TEXT_DARK,
            }}
          >
            <CiSettings className="text-[14px]" />
            <span>Search settings</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
