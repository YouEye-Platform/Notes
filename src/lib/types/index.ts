/**
 * @youeye/canvas — Shared type definitions
 */

/** JWT session payload stored in the session cookie */
export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  email: string;
  isAdmin: boolean;
  groups: string[];
  iat?: number;
  exp?: number;
}

/** App manifest returned by GET /api/manifest */
export interface AppManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  icon: string;
  permissions: string[];
  surfaceSchemaVersion?: number;
  surfaces?: SurfaceManifest[];
  widgets?: WidgetManifest[];
  info_cards?: { type: string; description: string; endpoint: string; triggers: string[] }[];
  timeline_embeds?: TimelineEmbedManifest[];
  inter_app?: InterAppManifest;
  settings?: { schema: SettingsField[] };
}

export interface SurfaceManifest {
  id: string;
  kind: "widget" | "info-card" | "timeline-card" | "notification" | "settings-panel";
  placement: "dashboard" | "timeline" | "notification-center" | "app-settings" | "app-detail";
  name?: string;
  description?: string;
  embedPath: string;
  permissions?: string[];
  defaultSize?: { width: number; height: number };
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
  refreshInterval?: number;
  triggers?: string[];
}

export interface WidgetManifest {
  id: string;
  name: string;
  description: string;
  default_size: { width: number; height: number };
  min_size: { width: number; height: number };
  max_size: { width: number; height: number };
  refresh_interval: number;
}

export interface TimelineEmbedManifest {
  entry_type: string;
  embed_path: string;
  description: string;
  icon: string;
}

export interface InterAppManifest {
  provides: { type: string; description: string }[];
}

export interface SettingsField {
  key: string;
  type: "text" | "select" | "toggle" | "number";
  label: string;
  default?: string | number | boolean;
  options?: { label: string; value: string }[];
}

/** Header config returned by YE-UI /api/v1/header/config */
export interface HeaderConfig {
  branding?: {
    site_name?: string;
    site_name_css?: Record<string, unknown> | null;
    site_name_font_url?: string | null;
    site_name_css_chars?: string[] | null;
    logo_url?: string | null;
  };
  user?: {
    id: string;
    name: string;
    username: string;
    email: string;
    is_admin: boolean;
    avatar_url?: string | null;
  };
  navigation?: {
    apps?: DrawerApp[];
    /** The requesting app's own branding (Plan 4 Phase 0) — restores the logo. */
    self?: SelfBranding | null;
  };
  drawer_prefs?: DrawerPrefs;
  notifications?: {
    unread_count: number;
  };
  theme?: {
    cssVariables?: string;
    mode?: string;
  };
  ui_base_url?: string;
  user_menu?: {
    platform_items?: PlatformMenuItem[];
    app_settings_url?: string;
  };
}

export interface DrawerPrefs {
  columns: number;
  iconScale: number;
  maxHeight: number;
}

/** A native app's own branding block, delivered via `navigation.self` (Plan 4 Phase 0). */
export interface SelfBranding {
  id: string;
  name: string;
  custom_name: string | null;
  icon: string | null;
  custom_icon_url: string | null;
  header_display_mode: string | null;
  branding_css: Record<string, unknown> | null;
  branding_font_url: string | null;
  branding_css_chars: string[] | null;
}

export interface DrawerApp {
  id: string;
  name: string;
  custom_name: string | null;
  icon: string | null;
  custom_icon_url: string | null;
  url: string | null;
  order: number;
  status: string | null;
  visible: boolean;
  branding_wordart?: Record<string, unknown> | null;
  header_display_mode?: string;
  branding_css?: Record<string, unknown> | null;
  branding_font_url?: string | null;
  branding_css_chars?: string[] | null;
}

export interface PlatformMenuItem {
  key: string;
  label: string;
  icon: string;
  url: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  created_at: string;
}

export interface PermissionDescriptor {
  permission: string;
  title: string;
  description: string;
  category: string;
  risk: "low" | "medium" | "high";
}

export interface LaunchRequirements {
  success?: boolean;
  first_launch_complete: boolean;
  approval_required?: boolean;
  app_id: string;
  manifest_app_id: string;
  required_permissions: PermissionDescriptor[];
  granted_permissions: PermissionDescriptor[];
  missing_permissions?: PermissionDescriptor[];
  requested?: string[];
  permissions?: PermissionDescriptor[];
  approval_url?: string;
  approval_url_absolute?: string;
}

/** Configuration passed to createCanvasApp() to initialize the SDK */
export interface CanvasAppConfig {
  /** App ID, e.g. "ye-cinema". Used in cookies, headers, and API calls. */
  appId: string;
  /** Human-readable app name, e.g. "Cinema" */
  appName: string;
  /** Environment variable name for the app's external URL, e.g. "CINEMA_EXTERNAL_URL" */
  externalUrlEnv: string;
  /** Additional public routes beyond the platform defaults (e.g. ["/shared/", "/embed/"]) */
  publicRoutes?: string[];
  /** Whether this app uses PostgreSQL */
  usesDatabase?: boolean;
}
