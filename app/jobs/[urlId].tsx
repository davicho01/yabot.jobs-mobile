import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Stack, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { applicationsApi } from "../../src/api/applications";
import { jobsApi } from "../../src/api/jobs";
import { FitScoreCard } from "../../src/components/FitScoreCard";
import { JobCard } from "../../src/components/JobCard";
import { relativeDate, salaryText, titleCase } from "../../src/format";
import { useTheme } from "../../src/theme";

export default function JobDetailScreen() {
  const { urlId } = useLocalSearchParams<{ urlId: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const job = useQuery({ queryKey: ["job", urlId], queryFn: () => jobsApi.get(urlId) });
  const similar = useQuery({ queryKey: ["job", urlId, "similar"], queryFn: () => jobsApi.similar(urlId) });

  const employerUrl = job.data?.url.url ?? job.data?.posting?.apply_url ?? null;

  // "Save" = add to the application tracker with status "saved" (what the
  // web's Save does); the tracker is where saved jobs live.
  const save = useMutation({
    mutationFn: () => applicationsApi.create(employerUrl as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      Alert.alert("Saved", "Added to your tracker.");
    },
    onError: () => Alert.alert("Couldn't save", "Try again in a moment."),
  });

  if (job.isLoading) return <ActivityIndicator style={{ marginTop: 60 }} />;
  const posting = job.data?.posting;
  if (!posting) {
    return <Text style={{ color: theme.muted, textAlign: "center", marginTop: 60 }}>This job couldn't be loaded.</Text>;
  }

  const closed = !!job.data?.url.closed_at;
  const facts = [
    posting.location,
    posting.workplace_type !== "unknown" ? titleCase(posting.workplace_type) : null,
    posting.employment_type && posting.employment_type !== "unknown" ? titleCase(posting.employment_type) : null,
    salaryText(posting),
    relativeDate(posting.posted_at ?? posting.first_scanned_at),
  ].filter(Boolean);

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: posting.company_name ?? "Job" }} />
      <Text style={[styles.title, { color: theme.text }]}>{posting.title ?? "Untitled role"}</Text>
      <Text style={{ color: theme.text, fontSize: 17 }}>{posting.company_name}</Text>
      <Text style={{ color: theme.muted }}>{facts.join(" · ")}</Text>
      {closed ? <Text style={{ color: theme.danger }}>This listing is no longer open.</Text> : null}

      <View style={styles.actions}>
        <Pressable
          disabled={!employerUrl}
          onPress={() => employerUrl && WebBrowser.openBrowserAsync(employerUrl)}
          style={[styles.button, { backgroundColor: theme.primary, opacity: employerUrl ? 1 : 0.5 }]}
        >
          <Text style={[styles.buttonText, { color: theme.onPrimary }]}>Apply</Text>
        </Pressable>
        <Pressable
          disabled={!employerUrl || save.isPending}
          onPress={() => save.mutate()}
          style={[styles.button, { borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card }]}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>{save.isPending ? "Saving…" : "Save"}</Text>
        </Pressable>
      </View>

      <FitScoreCard jobPostingId={posting.id} />

      {posting.description ? (
        <Text style={{ color: theme.text, fontSize: 15, lineHeight: 22 }}>{posting.description}</Text>
      ) : null}

      {similar.data && similar.data.same_company.length + similar.data.similar_title.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <Text style={[styles.heading, { color: theme.text }]}>Similar jobs</Text>
          {[...similar.data.same_company, ...similar.data.similar_title]
            .filter((j) => j.posting)
            .slice(0, 6)
            .map((j) => (
              <JobCard key={j.url.id} job={j.posting!} />
            ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10, marginVertical: 12 },
  button: { flex: 1, borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { fontSize: 16, fontWeight: "600" },
  heading: { fontSize: 18, fontWeight: "700", marginBottom: 8 },
});
