import Constants from "expo-constants";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useAuth } from "../src/auth/AuthContext";
import { genericErrorMessage } from "../src/utils/apiErrors";
import { useTheme } from "../src/theme";

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra ?? {};
const googleConfigured = !!(extra.googleIosClientId || extra.googleAndroidClientId);

function GoogleButton({ onToken, disabled }: { onToken: (idToken: string) => void; disabled: boolean }) {
  const theme = useTheme();
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: extra.googleIosClientId || undefined,
    androidClientId: extra.googleAndroidClientId || undefined,
    webClientId: extra.googleWebClientId || undefined,
  });

  useEffect(() => {
    if (response?.type === "success" && response.params.id_token) onToken(response.params.id_token);
  }, [response, onToken]);

  return (
    <Pressable
      disabled={!request || disabled}
      onPress={() => promptAsync()}
      style={[styles.button, styles.outline, { borderColor: theme.border, backgroundColor: theme.card }]}
    >
      <Text style={[styles.buttonText, { color: theme.text }]}>Continue with Google</Text>
    </Pressable>
  );
}

export default function LoginScreen() {
  const theme = useTheme();
  const { requestCode, signInWithCode, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(genericErrorMessage(err) ?? "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { backgroundColor: theme.bg }]}
    >
      <Text style={[styles.title, { color: theme.text }]}>yabot.jobs</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>
        {codeSent ? `Enter the 6-digit code we emailed to ${email}.` : "Sign in to search jobs and track applications."}
      </Text>

      {!codeSent ? (
        <>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          />
          <Pressable
            disabled={busy || !email.includes("@")}
            onPress={() =>
              run(async () => {
                await requestCode(email.trim());
                setCodeSent(true);
              })
            }
            style={[styles.button, { backgroundColor: theme.primary, opacity: busy || !email.includes("@") ? 0.6 : 1 }]}
          >
            <Text style={[styles.buttonText, { color: theme.onPrimary }]}>Email me a code</Text>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="123456"
            placeholderTextColor={theme.muted}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={10}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          />
          <Pressable
            disabled={busy || code.length < 6}
            onPress={() => run(() => signInWithCode(email.trim(), code))}
            style={[styles.button, { backgroundColor: theme.primary, opacity: busy || code.length < 6 ? 0.6 : 1 }]}
          >
            <Text style={[styles.buttonText, { color: theme.onPrimary }]}>Sign in</Text>
          </Pressable>
          <Pressable onPress={() => { setCodeSent(false); setCode(""); setError(null); }}>
            <Text style={[styles.link, { color: theme.primary }]}>Use a different email</Text>
          </Pressable>
        </>
      )}

      {googleConfigured && !codeSent ? (
        <GoogleButton disabled={busy} onToken={(idToken) => run(() => signInWithGoogle(idToken))} />
      ) : null}

      {busy ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
      {error ? <Text style={[styles.error, { color: theme.danger }]}>{error}</Text> : null}
      <View style={{ flex: 1 }} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, paddingTop: 120, gap: 12 },
  title: { fontSize: 32, fontWeight: "700" },
  subtitle: { fontSize: 16, marginBottom: 12 },
  input: { borderWidth: 1, borderRadius: 10, padding: 14, fontSize: 17 },
  button: { borderRadius: 10, padding: 14, alignItems: "center" },
  outline: { borderWidth: 1 },
  buttonText: { fontSize: 17, fontWeight: "600" },
  link: { textAlign: "center", fontSize: 15, marginTop: 4 },
  error: { fontSize: 15, marginTop: 8 },
});
