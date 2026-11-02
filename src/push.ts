import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { api } from "./api/client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let registeredToken: string | null = null;

/** Asks for permission and registers this install's Expo push token with the
 * backend. Returns the token, or null if push isn't possible (simulator,
 * permission denied, or no EAS projectId configured yet). Never throws. */
export async function registerForPush(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return null;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Job alerts",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.post("/devices", { token, platform: Platform.OS === "ios" ? "ios" : "android" });
    registeredToken = token;
    return token;
  } catch {
    return null;
  }
}

/** Call before signing out so this phone stops getting the old user's alerts. */
export async function unregisterPush(): Promise<void> {
  if (!registeredToken) return;
  try {
    await api.post("/devices/unregister", { token: registeredToken });
  } catch {
    // Best effort; the backend also drops tokens Expo reports as dead.
  }
  registeredToken = null;
}
