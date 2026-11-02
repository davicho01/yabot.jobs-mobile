import type { JobPosting } from "./api/types";

function compact(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
}

export function salaryText(p: Pick<JobPosting, "salary_min" | "salary_max" | "salary_currency">): string | null {
  const { salary_min: min, salary_max: max } = p;
  if (min == null && max == null) return null;
  const cur = !p.salary_currency || p.salary_currency === "USD" ? "$" : `${p.salary_currency} `;
  if (min != null && max != null && min !== max) return `${cur}${compact(min)}–${compact(max)}`;
  return `${cur}${compact((min ?? max) as number)}`;
}

export function titleCase(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function relativeDate(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}
