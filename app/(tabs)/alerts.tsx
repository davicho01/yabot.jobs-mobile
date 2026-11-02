import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { authApi } from "../../src/api/auth";
import { describeSavedSearch, savedSearchesApi } from "../../src/api/savedSearches";
import type { SavedSearch } from "../../src/api/types";
import { useAuth } from "../../src/auth/AuthContext";
import { relativeDate } from "../../src/format";
import { useTheme } from "../../src/theme";

export default function AlertsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { user, setUser } = useAuth();
  const searches = useQuery({ queryKey: ["saved-searches"], queryFn: savedSearchesApi.list });

  const remove = useMutation({
    mutationFn: (id: string) => savedSearchesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["saved-searches"] }),
    onError: () => Alert.alert("Couldn't delete", "Try again in a moment."),
  });

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => authApi.updateMe({ email_alerts_enabled: enabled }),
    onSuccess: setUser,
  });

  function confirmRemove(s: SavedSearch) {
    Alert.alert("Delete alert?", s.name || describeSavedSearch(s), [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(s.id) },
    ]);
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 12 }}
      data={searches.data ?? []}
      keyExtractor={(s) => s.id}
      onRefresh={() => void searches.refetch()}
      refreshing={searches.isRefetching}
      ListHeaderComponent={
        <View style={[styles.toggle, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: "600", fontSize: 16 }}>Job alerts</Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>
              Email and push when new jobs match a saved search.
            </Text>
          </View>
          <Switch
            value={user?.email_alerts_enabled ?? false}
            onValueChange={(v) => toggle.mutate(v)}
            disabled={toggle.isPending}
          />
        </View>
      }
      ListEmptyComponent={
        searches.isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <Text style={{ color: theme.muted, textAlign: "center", marginTop: 40 }}>
            {searches.isError ? "Couldn't load your alerts." : "No alerts yet. Search for jobs, then tap “Alert me”."}
          </Text>
        )
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.navigate({ pathname: "/", params: { q: item.q ?? "", location: item.location ?? "" } })}
          onLongPress={() => confirmRemove(item)}
          style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: "600" }} numberOfLines={2}>
              {item.name || describeSavedSearch(item)}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>
              {item.last_alerted_at ? `Last alert ${relativeDate(item.last_alerted_at)?.toLowerCase()}` : "No alerts sent yet"}
            </Text>
          </View>
          <Pressable onPress={() => confirmRemove(item)} hitSlop={10}>
            <Text style={{ color: theme.danger }}>Delete</Text>
          </Pressable>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 10 },
});
