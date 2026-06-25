import { createCallbackHandler } from "@/lib/routes/auth";

export const GET = createCallbackHandler({
  appId: "ye-notes",
  externalUrlEnv: "NOTES_EXTERNAL_URL",
});
