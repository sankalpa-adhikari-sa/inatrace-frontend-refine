import { create } from "zustand";

const STORAGE_KEY = "selectedUserCompany";

function readStored(): number | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number(raw) : null;
  } catch {
    return null;
  }
}

type CompanyState = {
  selectedCompanyId: number | null;
  select: (id: number) => void;
  clear: () => void;
};

export const useCompanyStore = create<CompanyState>((set) => ({
  selectedCompanyId: readStored(),
  select: (id) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(id));
    } catch {
      // storage unavailable
    }
    set({ selectedCompanyId: id });
  },
  clear: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // storage unavailable
    }
    set({ selectedCompanyId: null });
  },
}));
