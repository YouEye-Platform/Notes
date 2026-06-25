import { createSSOHandler } from "@/lib/routes/auth";

export const GET = createSSOHandler({
  appId: "ye-notes",
  externalUrlEnv: "NOTES_EXTERNAL_URL",
});
