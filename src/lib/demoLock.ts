/**
 * Demo Lock Utility
 * 
 * When NEXT_PUBLIC_DEMO_LOCKED=true, the app enters a locked demo mode:
 *  - Settings page is replaced with a locked notice
 *  - Only mock data is shown (Notion connection hidden)
 *  - API keys are never exposed in the UI
 *  - Perfect for public demo deployments (Vercel, etc.)
 */

export const isDemoLocked =
  typeof window !== "undefined"
    ? // Runtime check: the env var is inlined by Next.js at build time
      // but we also expose it via our utility for clean access
      process.env.NEXT_PUBLIC_DEMO_LOCKED === "true"
    : // SSR safety
      false;

/**
 * The demo lock is intentionally NEXT_PUBLIC_ so it's evaluated at
 * build/runtime on the client. Set it in your Vercel dashboard:
 *   `vercel env add NEXT_PUBLIC_DEMO_LOCKED true`
 * Or in .env.local for local demo.
 */
export const DEMO_LOCKED = isDemoLocked;
