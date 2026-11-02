import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PAGE_SIZE, jobsApi } from "../../src/api/jobs";
import { savedSearchesApi, toSavedSearchPayload } from "../../src/api/savedSearches";
import { JobCard } from "../../src/components/JobCard";
import { useTheme } from "../../src/theme";

export default function JobsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  // Opening a saved search (Alerts tab) arrives as route params.
  const params = useLocalSearchParams<{ q?: string; location?: string }>();
  const [draftQ, setDraftQ] = useState(params.q ?? "");
  const [draftLocation, setDraftLocation] = useState(params.location ?? "");
  const [filters, setFilters] = useState({ q: params.q ?? "", location: params.location ?? "" });

  useEffect(() => {
    if (params.q === undefined && params.location === undefined) return;
    setDraftQ(params.q ?? "");
    setDraftLocation(params.location ?? "");
    setFilters({ q: params.q ?? "", location: params.location ?? "" });
  }, [params.q, params.location]);

  const createAlert = useMutation({
    mutationFn: () => savedSearchesApi.create(toSavedSearchPayload(filters.q, filters.location)),
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
      jobsApi.list({ q: filters.q || undefined, location: filters.location || undefined, page: pageParam }),
    getNextPageParam: (last) => (last.page * PAGE_SIZE < last.total ? last.page + 1 : undefined),
  });

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.total;
  const submit = () => setFilters({ q: draftQ.trim(), location: draftLocation.trim() });

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
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
});
