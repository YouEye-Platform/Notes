/**
 * YouEye ID's administrator group. Only this exact group name makes a person an
 * administrator of this app; a group that merely contains "admin" (for example
 * "sysadmins-readonly") does not.
 */
export const YOUEYE_ADMIN_GROUP = "admin";

export function isYouEyeAdmin(groups: unknown): boolean {
  return Array.isArray(groups) && groups.some((group) => group === YOUEYE_ADMIN_GROUP);
}
