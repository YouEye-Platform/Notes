declare module "playwright" {
  export interface ResponseLike {
    json(): Promise<{ status?: string; app?: string; database?: string; id?: string; name?: string; surfaces?: { kind: string }[] }>;
    url(): string;
  }

  export interface Locator {
    isVisible(): Promise<boolean>;
    locator(selector: string): Locator;
  }

  export interface Page {
    goto(url: string, options?: Record<string, unknown>): Promise<ResponseLike | null>;
    locator(selector: string): Locator;
    evaluate<T, Args extends unknown[]>(fn: (...args: Args) => T | Promise<T>, ...args: Args): Promise<T>;
    screenshot(options: { path: string }): Promise<void>;
  }

  export interface BrowserContext {
    pages(): Page[];
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }

  export interface Browser {
    contexts(): BrowserContext[];
    newContext(options?: Record<string, unknown>): Promise<BrowserContext>;
  }

  export const chromium: {
    connectOverCDP(endpoint: string): Promise<Browser>;
  };
}
