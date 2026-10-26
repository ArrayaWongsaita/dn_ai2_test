# Research: Better Auth capabilities for this design

Issue: ArrayaWongsaita/dn_ai2_test#2 (child of map #1). Researched 2026-10-26 against the live Better Auth docs and `main` branch source. Next.js facts come from the repo's bundled docs (`node_modules/next/dist/docs`, Next 16.4.3).

Confidence key: **[doc]** stated in official docs, **[src]** read from Better Auth source on `main` (not a documented guarantee), **[inferred]** my reading, **[unclear]** docs silent.

## Summary

| Question | Answer |
|---|---|
| Email+password, sign-up disabled, admin creates Users | Works. `emailAndPassword.disableSignUp: true` plus admin plugin `createUser`. [src] `createUser` does not check `disableSignUp`. Docs do not state this. |
| Static roles | Admin plugin: `createAccessControl` + `ac.newRole`, passed to `admin({ ac, roles })`. |
| Dynamic (DB) roles | Only the **organization** plugin (`dynamicAccessControl`, `organizationRole` table). Admin plugin is static only. Org plugin is scoped per organization. |
| Prisma | `npx auth@latest generate` emits `schema.prisma`. `migrate` does NOT support Prisma. Use `prisma migrate dev` + `prisma generate`. |
| Seeding first Super Admin | `npx auth@latest create-admin` (uses `auth.api.createUser`), or call `auth.api.createUser` from a seed script. |
| Next.js | `auth.api.getSession({ headers: await headers() })`; `proxy.ts` replaces `middleware.ts`; `nextCookies()` plugin for server actions. |
| Role change invalidates session | **No.** [src] `setRole` does not revoke sessions. Cookie cache can also serve stale data. Must be handled by us. |

## 1. Email + password, no public sign-up, admin creates Users

- `emailAndPassword.disableSignUp`: "Disable email and password sign up (default: `false`)". [doc: https://www.better-auth.com/docs/reference/options]
- Admin plugin adds `POST /admin/create-user` (`auth.api.createUser`). Required: `email`, `password`, `name`; optional `role` (string or array), `data` for custom fields. [doc: https://www.better-auth.com/docs/plugins/admin]
- Docs do not say whether `createUser` works when sign-up is disabled. [unclear]
- Source: `createUser` never reads `disableSignUp`. With a session it requires `user:create` permission; setting `role` additionally requires `user:set-role`. With no request/headers (a direct server-side call) the session check is skipped. Roles are validated against `opts.roles` if configured. [src: https://github.com/better-auth/better-auth/blob/main/packages/better-auth/src/plugins/admin/routes.ts]
- Source: `createUser` enforces only the max password length, not the minimum. We should validate minimum length ourselves in the app. [src] (same file)
- Passwords are hashed with scrypt by default; overridable via `password.hash` / `password.verify`. Default policy 8 to 128 characters. [doc: https://www.better-auth.com/docs/authentication/email-password]
- Admin plugin adds to `user`: `role` (string), `banned` (bool, default false), `banReason`, `banExpires`; to `session`: `impersonatedBy`. [src: .../plugins/admin/schema.ts]
- Roles are stored as a comma-separated string, and a user "can hold multiple roles". [doc] This conflicts with our one-Role-per-User decision; we must enforce single role in our own layer (pass a string, never an array).
- Password reset requires a `sendResetPassword` callback (email delivery). `revokeSessionsOnPasswordReset` defaults off. `changePassword` takes `currentPassword`. [doc: email-password page] The admin plugin documents `POST /admin/set-user-password` (`auth.api.setUserPassword`, body `userId`, `newPassword`; creates a credential account if missing), guarded by the `user:set-password` permission. [doc: admin page] This lets an admin set or reset a password with no email infrastructure, relevant to the open "initial-password delivery / reset" question.
- `requireEmailVerification` is optional; with the admin CLI the email is marked verified by default. [doc]
- Other admin features available: ban/unban (ban revokes all sessions [doc]), impersonation (1 hour default, admins cannot impersonate admins unless `impersonate-admins` permission), session list/revoke/delete permissions. [doc: admin page]

## 2. Access control: static versus dynamic

### Static roles (admin plugin, also organization plugin)
- `createAccessControl(statement)` with `as const`, then `ac.newRole({...})`; pass `ac` and `roles` to both `admin()` on the server and `adminClient()` on the client. [doc: admin page]
- A custom role named `admin` or `user` replaces the default permissions for that name. To keep defaults, spread `defaultStatements` into the statement and `adminAc.statements` into the role. [doc]
- Default admin-plugin statements: `user` (create, list, set-role, ban, impersonate, impersonate-admins, delete, set-password, set-email, get, update) and `session` (list, revoke, delete). [doc]
- `adminRoles` defaults to `["admin"]`; any other role name (e.g. `superadmin`) must be defined through custom access control to perform admin operations. [doc]
- Server check: `auth.api.userHasPermission({ body: { userId | role, permissions } })`. Client: `authClient.admin.hasPermission`. Client `checkRolePermission` is synchronous, role-based. [doc]
- Source: admin `hasPermission` resolves roles purely from `options.roles` (or defaults); it does not query a database. `adminUserIds` short-circuits to true. [src: .../plugins/admin/has-permission.ts]
- Implication: in the admin plugin, roles are code-defined, so the "Super Admin creates Custom Roles at runtime" requirement is **not** met by the admin plugin alone. The docs do not describe dynamic roles for it. [doc silent, src confirms static]

### Dynamic roles (organization plugin only)
- Enable with `organization({ ac, dynamicAccessControl: { enabled: true } })` and the same on `organizationClient`. Requires `ac` and a migration adding the `organizationRole` table. [doc: https://www.better-auth.com/docs/plugins/organization]
- Endpoints: create-role, list-roles, get-role, update-role, delete-role (server: `createOrgRole`, `listOrgRoles`, `getOrgRole`, `updateOrgRole`, `deleteOrgRole`). Creating needs the `ac` resource `create` permission; you cannot grant permissions your own role lacks. After creating, assign with `updateMemberRole`. [doc]
- Every permission used by a dynamic role must be defined in `ac` first. This matches our "fixed Permission Catalog in code" decision: the statement is the Catalog. [doc]
- `maximumRolesPerOrganization` caps roles per organization (default unlimited). Extra columns via `schema.organizationRole.additionalFields`. [doc]
- Use `auth.api.hasPermission` (covers dynamic roles); client `checkRolePermission` ignores dynamic roles. [doc]
- Constraints: roles are scoped to an organization and assigned to organization members. Using it means adopting organization/member tables (default roles owner/admin/member). Docs do not state that dynamic roles can be used without an organization. [unclear] Whether the org plugin and admin plugin can share one role model is not documented. [unclear]
- `organizationRole` columns: `id`, `organizationId` (FK to `organization`), `role` (name), `permission` (string, serialized), `createdAt`, `updatedAt` (optional). [doc: organization page, Schema section]

### Options this implies (for later tickets, not decided here)
1. Admin plugin with static roles only: fails "Super Admin creates roles".
2. Organization plugin with dynamic roles, using one organization as the app tenant: meets runtime roles, but couples us to org/member tables and a single-org workaround.
3. Own `Role`/`Permission` tables in Prisma, checked in app code, using Better Auth only for identity (and the admin plugin's `createUser`, ban, session tools). Docs support the building blocks (`user.additionalFields`, `customSession`) but not this pattern explicitly.

## 3. Prisma adapter

- Install `@better-auth/prisma-adapter`; configure `prismaAdapter(prisma, { provider: "postgresql" })` from `better-auth/adapters/prisma`. [doc: https://www.better-auth.com/docs/adapters/prisma]
- Prisma 7 example uses an explicit generator output path and a driver adapter (`PrismaPg`); Prisma 6 and earlier may use the existing client setup. Use one shared client instance. [doc]
- Schema generation: `npx auth@latest generate --adapter prisma --dialect postgresql` writes `prisma/schema.prisma` (override with `--output`). It loads your config so plugin tables and fields (admin columns, `organizationRole`, additionalFields) are included, and needs no live database. [doc: https://www.better-auth.com/docs/concepts/cli]
- Migration: `auth migrate` is Kysely-only and "Not Supported" for Prisma. Run `npx prisma migrate dev --name ...` then `npx prisma generate`. Re-run `generate` whenever plugins or additional fields change. [doc; the re-run guidance is [inferred]]
- Joins are supported since 1.4.0 via `advanced.database.joins: true`; the Prisma schema must define the relations. [doc]
- Not stated: whether the generated schema overwrites hand-edits on re-generation (relevant because we will add our own models). [unclear]

## 4. Seeding the first Super Admin

- `npx auth@latest create-admin --email ... --name ... --role admin [--password ...] [--data '{json}'] [--no-email-verified] [--force|--yes]`. Requires the admin plugin and a persistent database. It calls `auth.api.createUser`, so hashing and database hooks run. It prompts when users already exist. Email marked verified by default. [doc: CLI page and admin page]
- The `--role` is whatever name we configure, so a custom `super-admin` role works once defined in `ac`/`roles`. [inferred]
- For a repeatable seed (our own `prisma/seed` script), call `auth.api.createUser({ body })` with no headers; per source this skips the session check, so it works with no existing admin. [src, not documented guarantee]
- Alternative: `adminUserIds` config grants admin by user ID regardless of role. [doc] Not recommended for Super Admin since the design wants a Role.

## 5. Next.js integration

Better Auth side [doc: https://www.better-auth.com/docs/integrations/next]:
- Route handler `app/api/auth/[...all]/route.ts` with `toNextJsHandler(auth)` exporting `GET` and `POST`.
- Server components, pages and server actions: `auth.api.getSession({ headers: await headers() })`; redirect if null. All endpoints, including plugin ones, are callable on `auth.api`.
- Server components cannot set cookies, so the cookie cache refreshes only after a server action or route handler interaction.
- Server actions calling `signInEmail` etc. need the `nextCookies()` plugin, which must be the last plugin in the array.
- Next 16+: put the logic in `proxy.ts` exporting `proxy`; on the Node.js runtime a full `auth.api.getSession` check with database access is allowed. Codemod: `npx @next/codemod@canary middleware-to-proxy .`
- `getSessionCookie()` only checks cookie existence and is labeled "NOT SECURE"; use it for optimistic redirects only and always re-validate on the server.

Next.js side: bundled repo docs confirm "Starting with Next.js 16, Middleware is now called Proxy" with unchanged functionality. [doc: `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`] Also see `01-app/02-guides/authentication.md` and `data-security.md` in the same folder for the recommended data-access-layer pattern (not read in depth here).

Design consequence: check permissions in the data access layer / server actions (authoritative), and treat `proxy.ts` as an optimistic redirect. [inferred from both docs]

## 6. Session invalidation on Role change

- `setRole` (`POST /admin/set-role`) does **not** revoke the user's sessions; only `banUser` calls `deleteUserSessions`. Docs are silent. [src routes.ts; doc unclear]
- Revocation APIs: `revokeSession({ token })`, `revokeSessions()`, `revokeOtherSessions()` (client, for the current user). [doc: https://www.better-auth.com/docs/concepts/session-management] For an admin revoking another user's sessions, the admin plugin documents `POST /admin/revoke-user-sessions` (body `userId`; also `revoke-user-session` by token and `list-user-sessions`). [doc: admin page] So "revoke after role change" is one extra server call to `auth.api.revokeUserSessions`.
- Cookie cache: the signed `session_data` cookie lets the server skip the database for `maxAge`; "revoked sessions may remain active on other devices until the cookie cache expires". Options: disable `cookieCache`, shorten `maxAge`, or pass `disableCookieCache: true` for sensitive checks. [doc]
- `customSession` plugin can add fields (e.g. roles) to `getSession`; its callback runs on every fetch and is not cached, so a role read there is fresh. [doc] The `role` column on `user` itself, if read from the cached session, may be stale until `maxAge`. [inferred]
- Sessions last 7 days by default (`expiresIn`), refreshed per `updateAge` (1 day); `freshAge` default 1 day. [doc]
- Practical options for the design ticket: (a) revoke all of the User's sessions right after any role change; (b) never trust the session for permissions, look up Role and Permissions per request from the database (with `disableCookieCache` or no cache); (c) both. Editing a Role's Permissions affects many Users at once, so (b) or a bulk revoke is needed there too, since no Better Auth hook covers it.

## Open or unclear points

1. Does the docs guarantee `createUser` ignores `disableSignUp`? Docs silent; only source shows it. Verify with a test at implementation time.
2. Dynamic roles without organizations: not documented as possible.
3. Combining admin plugin and organization plugin role models: not documented.
4. (Resolved) Admin endpoints `set-user-password` and `revoke-user-sessions` are documented; see sections 1 and 6.
5. Whether `auth generate` preserves custom Prisma models/edits on regeneration.
6. `createUser` skips minimum password length (source only).
7. Multi-role comma string versus our single-role rule.

## Sources

- https://www.better-auth.com/docs/plugins/admin
- https://www.better-auth.com/docs/plugins/organization
- https://www.better-auth.com/docs/adapters/prisma
- https://www.better-auth.com/docs/integrations/next
- https://www.better-auth.com/docs/concepts/session-management
- https://www.better-auth.com/docs/concepts/cli
- https://www.better-auth.com/docs/authentication/email-password
- https://www.better-auth.com/docs/reference/options
- https://github.com/better-auth/better-auth/blob/main/packages/better-auth/src/plugins/admin/routes.ts
- https://github.com/better-auth/better-auth/blob/main/packages/better-auth/src/plugins/admin/has-permission.ts
- https://github.com/better-auth/better-auth/blob/main/packages/better-auth/src/plugins/admin/schema.ts
- Repo: `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
