import { Dispatch, SetStateAction } from "react";

export type Company = {
    id: string;
    externalId?: string;
    name: string;
    description: string;
    industries: string[];
    keywords: string[];
    parentCompany: string;
    subsidiariesCount: number;
    stockSymbol?: string;
    founded: number;
    employees: string;
    location: string;
    website: string;
    logo: string;

    fundingStage?: string;          
    totalFundingMillion?: number;
    revenueBillion?: number;
};

export type SidebarItemProps = {
    collapsed: boolean;
    icon?: React.ReactNode;
    label: string;
};

export type SideBarSection = {
    id: string;
    name: string;
    subMenu: string[];
};

export type SidebarContextType = {
    activeItem: string;
    setActiveItem: (value: string) => void;
    collapsed: boolean;
    setCollapsed: Dispatch<SetStateAction<boolean>>;
    FilterCompanies: boolean;
    setFilterCompanies: Dispatch<SetStateAction<boolean>>;
    refreshFlag: boolean;
    setRefreshFlag: Dispatch<SetStateAction<boolean>>;
};

export type Person = {
  id: string;
  name: string;
  designation: string;  
  department: string;  
  companyId: string;
  location: string;
  email?: string;
  avatar?: string; 
};

export type ListPerson = {
  id: string;
  name: string;
  designation: string;
  department: string;
  companyId: string;
  location: string;
};

export type NewPersonPayload = {
  name: string;
  designation: string;
  department: string;
  location: string;
  companyId: string;
};

export type SessionResponse = {
    id?: string;
    payment_status?: string;
    amount_total?: number;
    currency?: string;
    metadata?: Record<string, any>;
    customer_details?: { email?: string } | null;
    line_items?: any;
    payment_intent?: any;
    created?: string | number;
    [k: string]: any;
};
