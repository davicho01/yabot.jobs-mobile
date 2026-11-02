import { api } from "./client";
import type { SavedSearch } from "./types";

// Only the filters the mobile board has: keyword + location. Everything
// else is explicitly null (sector null = every sector, matching the
// mobile board, which doesn't apply the web board's tech-only default).
export interface SavedSearchCreatePayload {
  name: string | null;
  q: string | null;
  location: string | null;
  metro: null;
  radius: null;
  company: null;
  posted_within_days: null;
  workplace_type: null;
  sector: null;
  salary_min: null;
  salary_max: null;
}

export function toSavedSearchPayload(q: string, location: string): SavedSearchCreatePayload {
  return {
    name: describeSavedSearch({ q, location }),
    q: q || null,
    location: location || null,
    metro: null,
    radius: null,
    company: null,
    posted_within_days: null,
    workplace_type: null,
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

export function describeSavedSearch(s: { q?: string | null; location?: string | null }): string {
  const parts: string[] = [];
  if (s.q) parts.push(`"${s.q}"`);
  if (s.location) parts.push(s.location);
  return parts.length > 0 ? parts.join(" · ") : "All postings";
}
