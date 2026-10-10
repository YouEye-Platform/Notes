/** Server runtime machine identity; acting user must come from a validated server session. */
export function appServiceHeaders(extra?: HeadersInit, userId?: string): Headers {
  if (typeof window !== "undefined") throw new Error("App service credentials are server-only");
  const appId = process.env.YOUEYE_APP_ID;
  const token = process.env.YOUEYE_APP_TOKEN;
  if (!appId || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(appId)
    || !token || !/^[A-Za-z0-9._~+\/-]+={0,2}$/.test(token)) {
    throw new Error("App service integration is not ready; reconcile credentials in Market");
  }
  const headers = new Headers(extra);
  for (const name of ["authorization", "x-youeye-app", "x-youeye-user", "x-ui-bridge-token", "cookie", "x-cli-token", "x-app-slug"]) {
    headers.delete(name);
  }
  headers.set("X-YouEye-App", appId);
  headers.set("Authorization", `Bearer ${token}`);
  if (userId) headers.set("X-YouEye-User", userId);
  return headers;
}
