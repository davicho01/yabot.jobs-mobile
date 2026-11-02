import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { ApiError } from "../api/client";
import { resumesApi } from "../api/resumes";
import { useTheme } from "../theme";
import { genericErrorMessage, prerequisiteMessage } from "../utils/apiErrors";

/** "How well does my resume fit this job?" — the main resume's score for one
 * posting, generated on demand (it calls the user's LLM key on the backend). */
export function FitScoreCard({ jobPostingId }: { jobPostingId: string }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const key = ["fit-score", jobPostingId];

  const existing = useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        return await resumesApi.getScore(jobPostingId);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null; // not scored yet
        throw err;
      }
    },
  });

  const generate = useMutation({
    mutationFn: () => resumesApi.generateScore(jobPostingId),
    onSuccess: (score) => queryClient.setQueryData(key, score),
  });

  const score = generate.data ?? existing.data;
  const problem = generate.error ? (prerequisiteMessage(generate.error) ?? genericErrorMessage(generate.error)) : null;

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.heading, { color: theme.text }]}>Resume fit</Text>
      {existing.isLoading ? (
        <ActivityIndicator />
      ) : score ? (
        <>
          <Text style={[styles.score, { color: theme.primary }]}>{Math.round(score.overall_score)}/100</Text>
          {score.summary ? <Text style={{ color: theme.text, lineHeight: 20 }}>{score.summary}</Text> : null}
          {score.missing_keywords.length > 0 ? (
            <Text style={{ color: theme.muted, fontSize: 13 }}>Missing: {score.missing_keywords.slice(0, 10).join(", ")}</Text>
          ) : null}
        </>
      ) : (
        <Text style={{ color: theme.muted }}>See how your main resume matches this job.</Text>
      )}
      {problem ? <Text style={{ color: theme.danger }}>{problem}</Text> : null}
      <Pressable
        disabled={generate.isPending}
        onPress={() => generate.mutate()}
        style={[styles.button, { borderColor: theme.border, opacity: generate.isPending ? 0.6 : 1 }]}
      >
        <Text style={{ color: theme.primary, fontWeight: "600" }}>
          {generate.isPending ? "Scoring… (can take a minute)" : score ? "Re-score" : "Check my fit"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderWidth: 1, borderRadius: 12, gap: 8, marginVertical: 8 },
  heading: { fontSize: 18, fontWeight: "700" },
  score: { fontSize: 32, fontWeight: "800" },
  button: { borderWidth: 1, borderRadius: 10, padding: 12, alignItems: "center" },
});
