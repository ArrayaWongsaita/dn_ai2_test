# Research: Next.js 16.4 auth enforcement points

Issue: ArrayaWongsaita/dn_ai2_test#3

Source: the bundled docs for the installed `next@16.4.3`, at `node_modules/next/dist/docs/`. All paths below are relative to `node_modules/next/dist/docs/01-app/`. No memory or third-party write-ups were used.

## TL;DR

- Defense in depth, with the real check **next to the data**. Docs: Proxy "should not be used as a full session management or authorization solution" (`01-getting-started/16-proxy.md`) and "should not be your only line of defense... The majority of security checks should be performed as close as possible to your data source" (`02-guides/authentication.md`).
- Three layers are recommended:
  1. **Proxy** (`proxy.ts`): optimistic, cookie-only checks and redirects.
  2. **Data Access Layer (DAL)**: `server-only` module that verifies the session, authorizes, and returns DTOs. This is the main enforcement point for Server Components.
  3. **Every Server Action and Route Handler** re-verifies by itself, because each is its own entry point.
- Layouts are not an auth boundary.

## Breaking changes versus older Next.js

| Old | Now (16.x) | Source |
|---|---|---|
| `middleware.ts`, export `middleware` | `proxy.ts`, export `proxy` (or default). `middleware` is deprecated. Flags renamed, e.g. `skipMiddlewareUrlNormalize` becomes `skipProxyUrlNormalize`. | `02-guides/upgrading/version-16.md` ("`middleware` to `proxy`"); `03-api-reference/03-file-conventions/proxy.md` |
| Middleware could run on the Edge runtime | Proxy runs on **Node.js only**. The `runtime` option is unavailable and setting it throws. To keep Edge, keep using `middleware`. | `version-16.md`; `proxy.md` ("Runtime") |
| (n/a) | Only one `proxy.ts` per project. Split logic into modules and import them. | `01-getting-started/16-proxy.md` |
| (n/a) | Proxy should not rely on shared modules or globals. It may be deployed separately, for example to a CDN. Pass data via headers, cookies, rewrites, redirects or the URL. | `proxy.md` ("Good to know") |
| `fetch` caching options in middleware | `options.cache`, `options.next.revalidate`, `options.next.tags` have no effect in Proxy. | `16-proxy.md` |
| (n/a) | `unauthorized()` / `forbidden()` exist, but are **experimental**. They need `experimental.authInterrupts: true`. | `03-api-reference/04-functions/unauthorized.md`, `forbidden.md` |
| Request APIs sync | `cookies()` is awaited (`await cookies()`) in all doc examples. | `02-guides/data-security.md`, `authentication-with-cache-components.md` |
| (n/a) | With Cache Components, reading the session is a request-time read, must sit behind `<Suspense>`, and reading `cookies()` outside a boundary is a **build error**. | `02-guides/authentication-with-cache-components.md` (Step 2) |

## Enforcement points

### 1. Proxy (`proxy.ts`): optimistic checks only

- Purpose: run code before a request completes. Rewrite, redirect, set headers, respond directly. (`16-proxy.md`)
- Documented auth role: "optimistic checks". It centralizes redirect logic and pre-filters unauthorized users. It is also the way to **protect static routes that share data between users**, for example paywalled content, because a DAL cannot guard data fetched at build time. (`authentication.md`, "Optimistic checks with Proxy"; DAL tip)
- It runs on every route, **including prefetched routes**. Therefore only read the session from the cookie (decrypt it) and avoid database checks. (`authentication.md`)
- Without a `matcher` it runs on every request, including `_next/static`, `_next/image` and `public/`. Use a negative matcher so auth redirects do not block assets. The docs example is `'/((?!api|_next/static|_next/image|.*\\.png$).*)'`. For auth the docs "recommend Proxy runs on all routes". (`proxy.md`, "Matcher"; `authentication.md` tips)
- `matcher` values must be constants because they are statically analyzed. (`proxy.md`)
- Execution order: `next.config` headers, then redirects, then **Proxy**, then `beforeFiles` rewrites, then filesystem routes, and so on. (`proxy.md`, "Execution order")
- **Server Functions are not separate routes.** They are POSTs to the route where they are used, so "a Proxy matcher that excludes a path will also skip Server Function calls on that path." Do not rely on Proxy to protect actions. (`proxy.md`, "Execution order" note)
- The `proxy.ts` and `route.ts` files "have a lot of power". The audit checklist says to spend extra time on them. (`data-security.md`, "Auditing")

### 2. Server Components, pages and layouts

- Do the check in the **DAL, close to the data**, so that every call site is covered. (`authentication.md`, "Server Components")
- **Layouts are not an auth boundary.**
  - Due to partial rendering, layouts do not re-render on navigation, so the session is not re-checked on each route change.
  - A layout also does not control whether the rest of the route renders. Segments and parallel-route slots are rendered by the router, so a layout that hides them "does not stop them from running or from appearing in the RSC Payload."
  - Instead, fetch the user in the layout via the DAL and let the DAL do the check. (`authentication.md`, "Layouts and auth checks")
- Do not "return null in a layout" as a gate. It is "not recommended since Next.js applications have multiple entry points". (`authentication.md`, end of "Auth checks in leaf components")
- Page-level check: call `verifySession()` or `getUser()` in `page.tsx`, then redirect. Leaf-component checks are also supported. (`authentication.md`)
- Layout streaming: a top-level `await` of the session in a layout holds `{children}`. Push the read down into a nested Server Component inside `<Suspense>`. (`authentication.md`, "Auth and streaming")
- Client Components cannot import the DAL. Run the DAL in a parent Server Component and pass minimal data as props or via a context provider. Use `taintUniqueValue` for sensitive session fields. (`authentication.md`)
- Never trust client-controlled input such as `searchParams` for authorization. Re-verify from the cookie. (`data-security.md`, "Validating client input")
- Render side effects: setting cookies or revalidating during render is explicitly prevented. Do logout in a Server Action. (`data-security.md`)

### 3. Server Actions

- Treat as **public endpoints**. An exported action is reachable by a direct POST, even if it is not imported anywhere in the UI. (`data-security.md`, "Built-in Server Actions Security features"; `server-actions.md`, "Security")
- Built-in protections: encrypted, non-deterministic action IDs, dead-code elimination of unused actions, closure-variable encryption, and an Origin vs Host check. These "reduce the risk" but you "should still ... verify authentication and authorization inside each one." Do not rely on encryption alone for secrets. (`data-security.md`)
- A page-level auth check "does not extend to the Server Actions defined within it." Re-verify inside the action. (`data-security.md`, "Authentication and authorization")
- Check authorization of the specific resource, not only authentication, to avoid IDOR. For example, compare `post.authorId` with the session user. (`data-security.md`)
- Recommended shape: a thin `'use server'` action that delegates to a `server-only` DAL function where auth and authz happen. (`data-security.md`, "Using a Data Access Layer for mutations")
- Validate input. Return only what the UI needs (DTO-like), not raw rows. Consider rate limiting. (`data-security.md`)
- Cross-origin or proxied setups: `serverActions.allowedOrigins`. Multi-instance self-hosting: set a stable `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`. (`data-security.md`; `server-actions.md`)
- Destructive operations may warrant elevated session checks or re-authentication. (`server-actions.md`)
- Cache Components: re-read the session inside the action, then `updateTag(...)`. (`authentication-with-cache-components.md`, Step 5)

### 4. Route Handlers (`route.ts`)

- "Treat Route Handlers with the same security considerations as public-facing API endpoints." The docs example does a two-tier check: an active session, then an `admin` role, using `verifySession()` from the DAL. (`authentication.md`, "Route Handlers")
- `forbidden()` can be called in Server Components, Server Functions and Route Handlers (experimental). (`forbidden.md`)
- A Route Handler can act as a proxy to another backend, with validation before forwarding. This is distinct from `proxy.ts`. (`02-guides/backend-for-frontend.md`)
- Excluding `/api` in a Proxy matcher (as in the docs example matcher) means Proxy will not guard API routes. Handlers must self-check.

### 5. Data Access Layer and data security

- Three documented data approaches: external HTTP APIs (Zero Trust), a **DAL (recommended for new projects)**, and component-level access (prototypes only). Choose one and do not mix. (`data-security.md`)
- A DAL should: run only on the server (`import 'server-only'`), perform authorization checks, and return minimal DTOs. Only the DAL should read `process.env` secrets. (`data-security.md`; `authentication.md`)
- `verifySession` / `getUser` are wrapped in React `cache()`. This dedupes within one render pass only. In Server Actions and Route Handlers, which are not render passes, "the wrapper does nothing and every call runs the function". (`authentication.md`)
- Two check types:
  - **Optimistic** (cookie data): UI show/hide and redirects. Fine in Proxy.
  - **Secure** (database comparison): for sensitive data or actions. Belongs in the DAL. (`authentication.md`, "Authorization")
- Taint APIs (`experimental.taint`) are an extra layer, not a replacement for DTO filtering. (`data-security.md`)
- Audit checklist, as written in the docs: isolated DAL? `"use client"` props broad? actions re-authorize and check ownership? `[param]` folders validated? `proxy.ts` and `route.ts` audited? (`data-security.md`, "Auditing")

### 6. Caching interactions

- A DAL protects request-time data. Statically rendered routes that share data fetch at build time, so the DAL never runs per request. Use Proxy for those. (`authentication.md`)
- With `cacheComponents: true` (`authentication-with-cache-components.md`):
  - Session reads are request-time and must sit behind `<Suspense>`. Reading `cookies()` outside a boundary is a build error.
  - Plain `use cache` and `use cache: remote` cannot call `cookies()` or `headers()`.
  - `use cache: private` can read `cookies()`, `headers()` and `searchParams`, and keeps results in the browser only, never on the server. Its `cacheLife` `stale` should be at least 30 seconds to stay prefetchable.
  - To cache per-user data on the server, resolve the user outside and pass only `userId` into a plain `use cache` function. The userId becomes part of the cache key. Keep that function **unexported** so a caller cannot pass another user's id.
  - Cache keys and `cacheTag` values are stored in plain text. Never put tokens or sensitive personal data in them.
  - Migration escape hatch: `export const instant = false` on a page or layout lets it keep blocking on the server.
- `force-static` forces `cookies()` and `headers()` to return empty values, so do not combine it with session reads. (`02-guides/caching-without-cache-components.md`)

### 7. Documented authentication pattern (`02-guides/authentication.md`)

- Concepts: Authentication, Session Management, Authorization.
- Sign-up and login: `<form>` with a Server Action and `useActionState`. Validate on the server (Zod, Valibot or Yup) and return early on invalid input. Then create the user or check credentials.
- Sessions:
  - Stateless (encrypted cookie, with `iron-session` or `jose` recommended) or database sessions. For database sessions, also store an encrypted session ID in a cookie so Proxy can do optimistic checks.
  - Cookie options are HttpOnly, Secure, SameSite and expiry.
  - Update, refresh and delete sessions from Server Actions or Route Handlers.
- Authorization: optimistic Proxy check, then DAL `verifySession()`, then DTOs, plus per-entry-point checks.
- Auth libraries listed: Auth0, Better Auth, Clerk, Descope, Kinde, Logto, NextAuth.js, Ory, Stack Auth, Supabase, Stytch, WorkOS. Session libraries: Iron Session, Jose. Check Node.js runtime compatibility, since Proxy is Node-only.
- `unauthorized()` / `forbidden()` plus `unauthorized.tsx` / `forbidden.tsx` give 401 / 403 UI (experimental).
  - `forbidden()` cannot be called in the root layout.
  - They throw, so a `try/catch` around them suppresses them, and an un-awaited call renders nothing.
  - Before streaming starts they return 401 / 403. After streaming starts the status stays 200 with a `noindex` tag. A static page can serve a 401 / 403. A request-time check can run in Proxy.

## Open questions and gaps

- The `proxy.md` execution-order note says Server Functions are handled as POSTs to the page's route. The docs do not state how a Proxy redirect interacts with an in-flight action. Not verified.
- `authInterrupts`, `unauthorized()` and `forbidden()` are flagged experimental in 16.4.3. Stability is unknown.
- Whether `cacheComponents` is enabled in this repo's `next.config.ts` was not checked. That decision changes the session-read pattern (see section 6).
- The docs link external blog and example material (for example, the "Security in Next.js" blog post). Those were not read, as they are outside the bundled docs.

## Recommendation for this repo (for issue #8)

1. Add `proxy.ts` for cookie-only optimistic redirects, with a negative matcher for static assets. Do not put database lookups in it.
2. Create a `server-only` DAL (`verifySession`, `getUser`, DTOs, wrapped in React `cache`) and route all reads and writes through it.
3. Make every Server Action and Route Handler call the DAL and check resource ownership. Do not rely on Proxy or on page-level checks.
4. Do not gate in layouts. Put the session read in a `<Suspense>`-wrapped component.
5. Decide on `cacheComponents` before building the session helper, then follow `authentication-with-cache-components.md` if it is on.
