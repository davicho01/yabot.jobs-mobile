import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import type { JobPosting } from "../api/types";
import { relativeDate, salaryText, titleCase } from "../format";
import { useTheme } from "../theme";

export type JobCardData = Pick<
  JobPosting,
  | "url_id"
  | "title"
  | "company_name"
  | "company_logo_url"
  | "location"
  | "workplace_type"
  | "salary_min"
  | "salary_max"
  | "salary_currency"
  | "posted_at"
  | "first_scanned_at"
>;

export function JobCard({ job }: { job: JobCardData }) {
  const theme = useTheme();
  const meta = [
    job.location,
    job.workplace_type && job.workplace_type !== "unknown" ? titleCase(job.workplace_type) : null,
    salaryText(job),
    relativeDate(job.posted_at ?? job.first_scanned_at),
  ].filter(Boolean);

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/jobs/[urlId]", params: { urlId: job.url_id } })}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      {job.company_logo_url ? (
        <Image source={{ uri: job.company_logo_url }} style={styles.logo} />
      ) : (
        <View style={[styles.logo, styles.avatar, { backgroundColor: theme.border }]}>
          <Text style={{ color: theme.muted, fontWeight: "700" }}>{(job.company_name ?? "?").charAt(0).toUpperCase()}</Text>
        </View>
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {job.title ?? "Untitled role"}
        </Text>
        <Text style={{ color: theme.text }} numberOfLines={1}>
          {job.company_name ?? "Unknown company"}
        </Text>
        <Text style={{ color: theme.muted, fontSize: 13 }} numberOfLines={2}>
          {meta.join(" · ")}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 10 },
  logo: { width: 44, height: 44, borderRadius: 8 },
  avatar: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontWeight: "600" },
});
