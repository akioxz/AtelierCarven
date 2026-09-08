# Rule: Security Checklist (Tiered)

A consolidated, deduplicated pre-launch security checklist. Used by [[start-new-project-prompt]] (build it in from day one) and [[project-continuation-prompt]] (when a session's goal is a security pass).

## Tier 1 — Start Here (do these on every project, no exceptions)

1. Keep every API key and secret server-side, never in frontend/client code
2. Use the public/anon database key on the frontend, never the admin/service-role key
3. Enable row-level security on every database table, with real per-user policies (no `USING (true)`)
4. Confirm every endpoint checks record ownership, not just that the user is logged in
5. Rate-limit the API, especially login, signup, password reset, and anything that costs money per call
6. Set billing caps and usage alerts on every paid service
7. Use parameterized queries — never build SQL/queries from raw user input

## Tier 2 — Full checklist (work through before launch; re-run after major features)

### Secrets and keys
- Purge secrets from Git history (not just current code) if any were ever committed; rotate anything exposed
- Ensure `.env` and secret files are in `.gitignore`
- Set a periodic rotation cadence for long-lived API keys and secrets, not just rotation after a known exposure

### Database
- Encrypt sensitive fields at rest (PII, tokens)
- Restrict database user/service permissions to least privilege — not full admin

### Auth and access control
- Enforce authentication and authorization on the server for every protected route — never trust the frontend alone
- Block mass assignment: endpoints only accept the specific fields a user is allowed to change (never `role`, `is_admin`, etc.)
- Store session tokens in secure, `HttpOnly`, `SameSite` cookies — not `localStorage`
- Hash passwords with bcrypt/argon2 if you built your own auth (or confirm your auth provider handles it)
- Reset all active sessions when a password changes
- Invalidate sessions and re-check authorization when a user's role or permission level changes, not just on password rotation
- Expire password reset links after a short window
- Rate-limit password reset requests specifically (separate from general rate limiting)
- Prevent user enumeration — auth/reset errors shouldn't reveal whether an email exists
- Lock accounts after repeated failed login attempts
- Add CSRF tokens on state-changing requests
- Add HSTS so browsers only ever connect via HTTPS

### Rate limiting and abuse
- Add bot protection (CAPTCHA or similar) on public forms, verified server-side
- Limit request payload size

### Input and output
- Validate and sanitize all input server-side (type, length, format) — even if the frontend also validates
- Sanitize before storing, not just before displaying
- Escape user-generated content before rendering (XSS prevention)
- Whitelist allowed file types for uploads (not blocklist); validate size server-side; store uploads where they can't execute
- Trim API responses to only the fields the client needs — never leak password hashes, tokens, or other users' data

### Network and CORS
- Lock down CORS to explicit allowed origins, not wildcard
- Disable directory listing
- Remove or rename default/framework admin routes

### Payments (only if handling money)
- Verify payment webhook signatures; reject anything that fails verification
- Set and verify all prices server-side, never trust a client-submitted amount

### AI features (only if using LLMs)
- Keep user input separate from system instructions to block prompt injection
- Treat model output as untrusted — escape before display, never execute directly
- Cap AI usage per user, enforced server-side
- If the model can call tools/take actions (not just generate text), require explicit confirmation before any side-effecting action, and verify the action server-side rather than trusting the model's stated intent

### Deployment and ops
- Force HTTPS everywhere; redirect HTTP to HTTPS
- Add security headers: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, Referrer-Policy, Permissions-Policy
- Add Subresource Integrity (SRI) hashes on any third-party CDN scripts/styles
- Turn off debug mode in production; confirm source maps and `.git` aren't publicly served
- Show generic error messages to users; log full details privately (no stack traces/secrets to client)
- Scan dependencies for known vulnerabilities; update what's safe, flag what needs manual review
- Treat dependency upgrades as code changes: preview the remediation diff, read changelogs, test each upgrade — never auto-`npm audit fix --force` or bulk-upgrade silently
- Keep one authoritative lockfile per project and prevent unchecked dependency install scripts from running at build/test time (audit them once, then pin)
- Protect any server-side URL fetching (webhooks, image proxies, link previews): allowlist schemes and hosts, reject requests to private/reserved IP ranges (including cloud metadata `169.254.169.254`), and disallow or re-validate redirects (SSRF)
- Give every personal-data store a retention window and a working deletion path that also covers backups, caches, search indexes, and analytics; support data-subject export/delete where required
- Before destructive filesystem operations (delete/move/overwrite), resolve symlinks and verify the target stays inside the expected allowlisted root — never operate on raw paths supplied by user input or model output
- Turn on logging and monitoring for errors and suspicious activity; never log secrets
- Log security-specific events separately (auth failures, permission denials, suspicious patterns)
- Set up automatic, restorable database backups
- Enable two-factor authentication on hosting, database, domain registrar, and email accounts

## Tier 3 — Mobile-specific (only if building a mobile app)

- Keep API keys out of the app bundle — call your own backend instead
- Store tokens in platform secure storage (Keychain/Keystore), not AsyncStorage
- Validate the user and request server-side before any deep link triggers a sensitive action
- Never rely on biometrics alone for sensitive actions — device biometrics gate the UI, the server still verifies

## How to apply this

Work through Tier 1 first, always. Then Tier 2, skipping Payments/AI sections if not applicable. Add Tier 3 for mobile apps. Apply checklist items in small batches — review each change before moving to the next — rather than attempting all items in one uninterruptible pass. Re-run the relevant tiers after any major feature addition.

## Related
- Prompts: [[start-new-project-prompt]], [[project-continuation-prompt]]
- Workflows: [[ai-development-workflow-map]]

---
Last updated: 2026-09-07
