import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PAGE_SIZE, jobsApi, type WorkplaceTypeFilter } from "../../src/api/jobs";
import {
  WORKPLACE_LABELS,
  savedSearchesApi,
  toSavedSearchPayload,
  type BoardFilters,
} from "../../src/api/savedSearches";
import { JobCard } from "../../src/components/JobCard";
import { useTheme } from "../../src/theme";

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary : theme.card },
      ]}
    >
      <Text style={{ color: active ? theme.onPrimary : theme.text, fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export default function JobsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  // Opening a saved search (Alerts tab) arrives as route params.
  const params = useLocalSearchParams<{ q?: string; location?: string; workplace?: string; posted?: string }>();
  const fromParams = (): BoardFilters => ({
    q: params.q ?? "",
    location: params.location ?? "",
    workplace: (params.workplace as WorkplaceTypeFilter) || undefined,
    posted: Number(params.posted) || undefined,
  });
  const [draftQ, setDraftQ] = useState(params.q ?? "");
  const [draftLocation, setDraftLocation] = useState(params.location ?? "");
  const [filters, setFilters] = useState<BoardFilters>(fromParams);

  useEffect(() => {
    if (params.q === undefined && params.location === undefined) return;
    const next = fromParams();
    setDraftQ(next.q);
    setDraftLocation(next.location);
    setFilters(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.q, params.location, params.workplace, params.posted]);

  const createAlert = useMutation({
    mutationFn: () => savedSearchesApi.create(toSavedSearchPayload(filters)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-searches"] });
      Alert.alert("Alert created", "We'll notify you when new jobs match this search.");
    },
    onError: (err) => Alert.alert("Couldn't create alert", err instanceof Error ? err.message : "Try again."),
  });

  const query = useInfiniteQuery({
    queryKey: ["jobs", filters],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      jobsApi.list({
        q: filters.q || undefined,
        location: filters.location || undefined,
        workplaceType: filters.workplace,
        postedWithinDays: filters.posted,
        page: pageParam,
      }),
    getNextPageParam: (last) => (last.page * PAGE_SIZE < last.total ? last.page + 1 : undefined),
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total;
  const submit = () => setFilters((f) => ({ ...f, q: draftQ.trim(), location: draftLocation.trim() }));
  // Tapping the active chip clears it.
  const toggleWorkplace = (w: WorkplaceTypeFilter) =>
    setFilters((f) => ({ ...f, workplace: f.workplace === w ? undefined : w }));
  const togglePosted = (days: number) => setFilters((f) => ({ ...f, posted: f.posted === days ? undefined : days }));

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={[styles.search, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TextInput
          value={draftQ}
          onChangeText={setDraftQ}
          onSubmitEditing={submit}
          returnKeyType="search"
          placeholder="Job title, skill or company"
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
        <TextInput
          value={draftLocation}
          onChangeText={setDraftLocation}
          onSubmitEditing={submit}
          returnKeyType="search"
          placeholder="City, state or remote"
          placeholderTextColor={theme.muted}
          style={[styles.input, { color: theme.text, borderColor: theme.border }]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {(Object.keys(WORKPLACE_LABELS) as WorkplaceTypeFilter[]).map((w) => (
            <Chip key={w} label={WORKPLACE_LABELS[w]} active={filters.workplace === w} onPress={() => toggleWorkplace(w)} />
          ))}
          {[1, 7, 30].map((d) => (
            <Chip key={d} label={d === 1 ? "Past day" : `Past ${d} days`} active={filters.posted === d} onPress={() => togglePosted(d)} />
          ))}
        </ScrollView>
        <View style={styles.row}>
          <Text style={{ color: theme.muted, fontSize: 13 }}>{total != null ? `${total.toLocaleString()} jobs` : ""}</Text>
          <Pressable disabled={createAlert.isPending} onPress={() => createAlert.mutate()}>
            <Text style={{ color: theme.primary, fontWeight: "600" }}>🔔 Alert me</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.url.id}
        renderItem={({ item }) => (item.posting ? <JobCard job={item.posting} /> : null)}
        contentContainerStyle={{ padding: 12 }}
        onEndReached={() => query.hasNextPage && !query.isFetchingNextPage && query.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={query.isRefetching && !query.isFetchingNextPage} onRefresh={() => void query.refetch()} />}
        ListEmptyComponent={
          query.isLoading ? (
            <ActivityIndicator style={{ marginTop: 40 }} />
          ) : (
            <Text style={{ color: theme.muted, textAlign: "center", marginTop: 40 }}>
              {query.isError ? "Couldn't load jobs. Pull to retry." : "No jobs match."}
            </Text>
          )
        }
        ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={{ margin: 16 }} /> : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  search: { padding: 12, gap: 8, borderBottomWidth: 1 },
  chips: { gap: 8 },
  chip: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
});
