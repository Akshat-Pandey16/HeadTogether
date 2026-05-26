import { apiClient } from "../api-client";
import type {
  ChangePasswordPayload,
  ForgotPasswordPayload,
  GenericMessage,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  TokenPair,
  User,
} from "@/types";

export const authApi = {
  register(payload: RegisterPayload) {
    return apiClient.request<User>("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },
  login(payload: LoginPayload) {
    const form = new URLSearchParams();
    form.set("username", payload.username);
    form.set("password", payload.password);
    return apiClient.request<TokenPair>("/auth/login", {
      method: "POST",
      body: form,
      auth: false,
    });
  },
  refresh(refresh_token: string) {
    return apiClient.request<TokenPair>("/auth/refresh", {
      method: "POST",
      body: { refresh_token },
      auth: false,
    });
  },
  logout(refresh_token: string) {
    return apiClient.request<GenericMessage>("/auth/logout", {
      method: "POST",
      body: { refresh_token },
    });
  },
  logoutAll() {
    return apiClient.request<GenericMessage>("/auth/logout-all", { method: "POST" });
  },
  changePassword(payload: ChangePasswordPayload) {
    return apiClient.request<GenericMessage>("/auth/change-password", {
      method: "POST",
      body: payload,
    });
  },
  forgotPassword(payload: ForgotPasswordPayload) {
    return apiClient.request<GenericMessage>("/auth/forgot-password", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },
  resetPassword(payload: ResetPasswordPayload) {
    return apiClient.request<GenericMessage>("/auth/reset-password", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },
};
