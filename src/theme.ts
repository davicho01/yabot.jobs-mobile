import { useColorScheme } from "react-native";

const light = {
  bg: "#f6f7f9",
  card: "#ffffff",
  text: "#14181f",
  muted: "#5f6b7a",
  border: "#e1e5ea",
  primary: "#2557d6",
  onPrimary: "#ffffff",
  danger: "#c0392b",
};

const dark: typeof light = {
  bg: "#0e1116",
  card: "#171b22",
  text: "#eef1f5",
  muted: "#9aa5b4",
  border: "#262c36",
  primary: "#6c93ff",
  onPrimary: "#0e1116",
  danger: "#ff7b6b",
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}
