import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as DocumentPicker from "expo-document-picker";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { resumesApi } from "../../src/api/resumes";
import type { Resume } from "../../src/api/types";
import { useTheme } from "../../src/theme";
import { genericErrorMessage } from "../../src/utils/apiErrors";

export default function ResumeScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const resumes = useQuery({ queryKey: ["resumes"], queryFn: resumesApi.list });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["resumes"] });
  const fail = (err: unknown) => Alert.alert("Something went wrong", genericErrorMessage(err) ?? "Try again.");

  const upload = useMutation({ mutationFn: resumesApi.upload, onSuccess: refresh, onError: fail });
  const setMain = useMutation({ mutationFn: resumesApi.setMain, onSuccess: refresh, onError: fail });
  const remove = useMutation({ mutationFn: resumesApi.remove, onSuccess: refresh, onError: fail });

  async function pick() {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    upload.mutate({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType });
  }

  function confirmRemove(r: Resume) {
    Alert.alert("Delete resume?", r.filename, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(r.id) },
    ]);
  }

  return (
    <FlatList
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 12 }}
      data={resumes.data ?? []}
      keyExtractor={(r) => r.id}
      onRefresh={() => void resumes.refetch()}
      refreshing={resumes.isRefetching}
      ListHeaderComponent={
        <Pressable
          disabled={upload.isPending}
          onPress={pick}
          style={[styles.upload, { backgroundColor: theme.primary, opacity: upload.isPending ? 0.6 : 1 }]}
        >
          <Text style={{ color: theme.onPrimary, fontSize: 16, fontWeight: "600" }}>
            {upload.isPending ? "Uploading…" : "Upload a resume (PDF, DOCX)"}
          </Text>
        </Pressable>
      }
      ListEmptyComponent={
        resumes.isLoading ? (
          <ActivityIndicator style={{ marginTop: 40 }} />
        ) : (
          <Text style={{ color: theme.muted, textAlign: "center", marginTop: 40 }}>
            {resumes.isError ? "Couldn't load your resumes." : "No resume yet. Upload one to check how you fit a job."}
          </Text>
        )
      }
      renderItem={({ item }) => (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: theme.text, fontWeight: "600" }} numberOfLines={2}>
              {item.filename}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>
              {item.is_main ? "Main resume" : "Not main"} · v{item.version_number}
            </Text>
          </View>
          {!item.is_main ? (
            <Pressable onPress={() => setMain.mutate(item.id)} hitSlop={8}>
              <Text style={{ color: theme.primary }}>Make main</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => confirmRemove(item)} hitSlop={8}>
            <Text style={{ color: theme.danger }}>Delete</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  upload: { borderRadius: 10, padding: 14, alignItems: "center", marginBottom: 12 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderWidth: 1, borderRadius: 12, marginBottom: 10 },
});
