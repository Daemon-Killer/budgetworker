import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
export const API_URL = (
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const KEY = "budgetworker-session";
export async function getToken(): Promise<string | null> {
  return Platform.OS === "web"
    ? sessionStorage.getItem(KEY)
    : SecureStore.getItemAsync(KEY);
}
export async function saveToken(token: string | null) {
  if (Platform.OS === "web") {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } else if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY);
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const token = await getToken();
  const res = await fetch(API_URL + "/api/" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) {
    if (res.status === 401) await saveToken(null);
    throw new Error(data.error ?? "Unable to complete this action");
  }
  return data;
}
