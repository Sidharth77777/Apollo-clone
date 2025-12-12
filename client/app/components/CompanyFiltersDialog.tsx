"use client";

import { useState } from "react";
import { CgSortAz } from "react-icons/cg";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

/* Surface tokens */
const SURFACE_BORDER = "rgba(0,0,0,0.06)";
const TEXT_DARK = "#111827";

export type Filters = {
  revenueRange?: string;
  employeesRange?: string;
  fundingStage?: string;
  fundedYear?: string;
  industries: string[];
};

type Props = {
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  industries?: string[]; // derived from live companies
};

const CompanyFiltersDialog = ({ filters, setFilters, industries = [] }: Props) => {
  const [open, setOpen] = useState(false);

  const ALL_INDUSTRIES = industries;

  const handleIndustryToggle = (industry: string, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      industries: checked ? [...prev.industries, industry] : prev.industries.filter((i) => i !== industry),
    }));
  };

  const handleClear = () => {
    setFilters({ industries: [] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="h-8 px-3 text-xs flex items-center gap-2"
          style={{
            backgroundColor: "white",
            border: `1px solid ${SURFACE_BORDER}`,
            color: TEXT_DARK,
          }}
        >
          <CgSortAz className="mr-2" />
          Show Filters
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg" style={{ backgroundColor: "rgba(255,255,255,0.94)", color: TEXT_DARK }}>
        <DialogHeader>
          <DialogTitle style={{ color: TEXT_DARK }}>Filter Companies</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Revenue */}
          <div className="space-y-2">
            <Label>Revenue (annual)</Label>
            <Select
              value={filters.revenueRange}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, revenueRange: value }))}
            >
              <SelectTrigger style={{ backgroundColor: "white", border: `1px solid ${SURFACE_BORDER}`, color: TEXT_DARK }}>
                <SelectValue placeholder="Any revenue" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lt-10b">Less than $10B</SelectItem>
                <SelectItem value="10-50b">$10B - $50B</SelectItem>
                <SelectItem value="50-100b">$50B - $100B</SelectItem>
                <SelectItem value="100-300b">$100B - $300B</SelectItem>
                <SelectItem value="gt-300b">More than $300B</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employees */}
          <div className="space-y-2">
            <Label>Number of Employees</Label>
            <Select
              value={filters.employeesRange}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, employeesRange: value }))}
            >
              <SelectTrigger style={{ backgroundColor: "white", border: `1px solid ${SURFACE_BORDER}`, color: TEXT_DARK }}>
                <SelectValue placeholder="Any size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0-50">0 - 50</SelectItem>
                <SelectItem value="51-200">51 - 200</SelectItem>
                <SelectItem value="201-500">201 - 500</SelectItem>
                <SelectItem value="501-1000">501 - 1,000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Funding Stage */}
          <div className="space-y-2">
            <Label>Funding Stage</Label>
            <Select
              value={filters.fundingStage}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, fundingStage: value }))}
            >
              <SelectTrigger style={{ backgroundColor: "white", border: `1px solid ${SURFACE_BORDER}`, color: TEXT_DARK }}>
                <SelectValue placeholder="Any stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bootstrapped">Bootstrapped / Self-funded</SelectItem>
                <SelectItem value="seed">Seed</SelectItem>
                <SelectItem value="series-a">Series A</SelectItem>
                <SelectItem value="series-b-plus">Series B+</SelectItem>
                <SelectItem value="public">Public company</SelectItem>
                <SelectItem value="acquired">Acquired</SelectItem>
                <SelectItem value="nonprofit">Nonprofit</SelectItem>
                <SelectItem value="private">Private company</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Year of founded */}
          <div className="space-y-2">
            <Label>Year of Founded</Label>
            <Select
              value={filters.fundedYear}
              onValueChange={(value) => setFilters((prev) => ({ ...prev, fundedYear: value }))}
            >
              <SelectTrigger style={{ backgroundColor: "white", border: `1px solid ${SURFACE_BORDER}`, color: TEXT_DARK }}>
                <SelectValue placeholder="Any year range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before-1900">Before 1900</SelectItem>
                <SelectItem value="1900-1950">1900 - 1950</SelectItem>
                <SelectItem value="1951-1980">1951 - 1980</SelectItem>
                <SelectItem value="1981-2000">1981 - 2000</SelectItem>
                <SelectItem value="after-2000">After 2000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Industries */}
          <div className="space-y-2">
            <Label>Industries</Label>
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded-md p-2" style={{ borderColor: SURFACE_BORDER }}>
              {ALL_INDUSTRIES.length === 0 && <div className="text-sm" style={{ color: TEXT_DARK }}>No industries available</div>}
              {ALL_INDUSTRIES.map((industry) => (
                <label key={industry} className="flex items-center space-x-2 text-sm" style={{ color: TEXT_DARK }}>
                  <Checkbox
                    checked={filters.industries.includes(industry)}
                    onCheckedChange={(checked) => handleIndustryToggle(industry, Boolean(checked))}
                  />
                  <span>{industry}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button type="button" variant="ghost" onClick={handleClear} style={{ color: TEXT_DARK }}>
            Clear all
          </Button>
          <div className="space-x-2">
            <Button
              type="button"
              variant="outline"
              className="text-sm"
              onClick={() => setOpen(false)}
              style={{ borderColor: SURFACE_BORDER, color: TEXT_DARK }}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => setOpen(false)} style={{ backgroundColor: "white", border: `1px solid ${SURFACE_BORDER}`, color: TEXT_DARK }}>
              Apply filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyFiltersDialog;
