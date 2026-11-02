import { api } from "./client";
import type { User } from "./types";

export interface UserUpdatePayload {
  display_name?: string | null;
  email_alerts_enabled?: boolean;
}

// ?client=mobile makes the backend return a bearer `token` rather than set
// a session cookie (see backend app/api/routes/auth.py).
interface MobileAuthResponse {
  user: User;
  token: string;
}

export const authApi = {
  me: () => api.get<User>("/auth/me"),
  requestCode: (email: string) => api.post<{ detail: string }>("/auth/request-code", { email }),
  verifyCode: (email: string, code: string) =>
    api.post<MobileAuthResponse>("/auth/verify-code", { email, code }, { client: "mobile" }),
  google: (credential: string) => api.post<MobileAuthResponse>("/auth/google", { credential }, { client: "mobile" }),
  updateMe: (payload: UserUpdatePayload) => api.patch<User>("/auth/me", payload),
};
