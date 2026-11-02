import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActionSheetIOS, ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { applicationsApi } from "../../src/api/applications";
import type { Application, ApplicationStatus } from "../../src/api/types";
import { titleCase } from "../../src/format";
import { useTheme } from "../../src/theme";
import { STATUSES } from "../../src/utils/applicationStatus";

export default function TrackerScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const apps = useQuery({ queryKey: ["applications"], queryFn: applicationsApi.list });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ApplicationStatus }) => applicationsApi.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["applications"] }),
    onError: () => Alert.alert("Couldn't update", "Try again in a moment."),
  });

  function pickStatus(app: Application) {
    const options = STATUSES.map(titleCase);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...options, "Cancel"], cancelButtonIndex: options.length, title: "Status" },
        (i) => i < STATUSES.length && update.mutate({ id: app.id, status: STATUSES[i] }),
      );
    } else {
      Alert.alert("Status", undefined, [
        ...STATUSES.map((s) => ({ text: titleCase(s), onPress: () => update.mutate({ id: app.id, status: s }) })),
        { text: "Cancel", style: "cancel" as const },
      ]);
    }
  }

  const rows = (apps.data ?? []).filter((a) => !a.is_archived);

  return (
    <FlatList
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 12 }}
      data={rows}
      keyExtractor={(a) => a.id}
      onRefresh={() => apps.refetch()}
      refreshing={apps.isRefetching}
      ListEmptyComponent={
        apps.isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <Text style={{ color: theme.muted, textAlign: "center", marginTop: 40 }}>
            {apps.isError ? "Couldn't load your tracker." : "Nothing here yet. Save a job to start tracking."}
          </Text>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: "/jobs/[urlId]", params: { urlId: item.job_posting.url_id } })}
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {item.job_posting.title ?? "Untitled role"}
            </Text>
            <Text style={{ color: theme.muted }} numberOfLines={1}>
              {item.job_posting.company_name ?? "Unknown company"}
            </Text>
            {item.best_score != null ? (
              <Text style={{ color: theme.muted, fontSize: 13 }}>Fit score {Math.round(item.best_score)}</Text>
            ) : null}
          </View>
          <Pressable onPress={() => pickStatus(item)} style={[styles.pill, { borderColor: theme.border }]}>
            <Text style={{ color: theme.primary, fontWeight: "600" }}>{titleCase(item.status)} ▾</Text>
          </Pressable>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 10 },
  title: { fontSize: 16, fontWeight: "600" },
  pill: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
});
