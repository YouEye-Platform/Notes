import { createLogoutHandler } from "@/lib/routes/auth";

export const POST = createLogoutHandler({
  appId: "ye-notes",
  externalUrlEnv: "NOTES_EXTERNAL_URL",
});
