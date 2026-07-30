<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Protected PWA shell layout

The iPhone PWA shell (pinned frosted bottom nav + scrollable tabs) is **verified and must not regress**.

**Before changing** `AppShell`, `BottomNav`, `BrowseFeed`, `layout.tsx`, `globals.css`, or any page scroll structure: **warn the user** what will break and wait for explicit approval.

Full contract: `.cursor/rules/pwa-shell-layout.mdc`

Validate after layout edits: `npm run check:shell`
