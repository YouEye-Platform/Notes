import { createSettingsHandlers } from "@/lib/routes/settings";

const handlers = createSettingsHandlers("ye-notes");
export const GET = handlers.GET;
export const PUT = handlers.PUT;
