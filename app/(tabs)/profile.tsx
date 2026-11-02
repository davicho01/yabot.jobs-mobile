import { Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../src/auth/AuthContext";
import { useTheme } from "../../src/theme";

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {user?.display_name ? <Text style={[styles.name, { color: theme.text }]}>{user.display_name}</Text> : null}
        <Text style={{ color: theme.muted }}>{user?.email}</Text>
      </View>
      <Pressable onPress={() => signOut()} style={[styles.button, { borderColor: theme.border, backgroundColor: theme.card }]}>
        <Text style={{ color: theme.danger, fontSize: 16, fontWeight: "600" }}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 12 },
  card: { padding: 16, borderWidth: 1, borderRadius: 12, gap: 4 },
  name: { fontSize: 18, fontWeight: "700" },
  button: { borderWidth: 1, borderRadius: 10, padding: 14, alignItems: "center" },
});
