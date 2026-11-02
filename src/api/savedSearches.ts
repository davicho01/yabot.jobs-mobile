import { api } from "./client";
import type { WorkplaceTypeFilter } from "./jobs";
import type { SavedSearch } from "./types";

// The filters the mobile board has. The rest are explicitly null (sector
// null = every sector, matching the mobile board, which doesn't apply the
// web board's tech-only default).
export interface BoardFilters {
  q: string;
  location: string;
  workplace?: WorkplaceTypeFilter;
  posted?: number;
}

export interface SavedSearchCreatePayload {
  name: string | null;
  q: string | null;
  location: string | null;
  metro: null;
  radius: null;
  company: null;
  posted_within_days: number | null;
  workplace_type: string | null;
  sector: null;
  salary_min: null;
  salary_max: null;
}

export const WORKPLACE_LABELS: Record<WorkplaceTypeFilter, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export function toSavedSearchPayload(f: BoardFilters): SavedSearchCreatePayload {
  return {
    name: describeSavedSearch({ q: f.q, location: f.location, workplace_type: f.workplace, posted_within_days: f.posted }),
    q: f.q || null,
    location: f.location || null,
    metro: null,
    radius: null,
    company: null,
    posted_within_days: f.posted ?? null,
    workplace_type: f.workplace ?? null,
    sector: null,
    salary_min: null,
    salary_max: null,
  };
}

export const savedSearchesApi = {
  list: () => api.get<SavedSearch[]>("/saved-searches"),
  create: (payload: SavedSearchCreatePayload) => api.post<SavedSearch>("/saved-searches", payload),
  remove: (id: string) => api.delete<void>(`/saved-searches/${id}`),
};

export function describeSavedSearch(s: {
  q?: string | null;
  location?: string | null;
  workplace_type?: string | null;
  posted_within_days?: number | null;
}): string {
  const parts: string[] = [];
  if (s.q) parts.push(`"${s.q}"`);
  if (s.location) parts.push(s.location);
  if (s.workplace_type) parts.push(WORKPLACE_LABELS[s.workplace_type as WorkplaceTypeFilter] ?? s.workplace_type);
  if (s.posted_within_days) parts.push(`Posted within ${s.posted_within_days}d`);
  return parts.length > 0 ? parts.join(" · ") : "All postings";
}
