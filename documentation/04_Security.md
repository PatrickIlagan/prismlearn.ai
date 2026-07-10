# 📄 PRISM LEARNING AI
## Document 4: Security & Privacy

### 1. Data Ownership & Zero-Retention Policy

- **Ownership:** students and educators retain full ownership of everything they upload.
  Nothing is used for base-model training, and this is stated on the live landing page,
  unauthenticated, not just in this document.
- **True zero-retention on upload, not delayed deletion:** the raw uploaded file — PDF,
  PPTX, whatever the source — is held in memory only for the duration of the ingestion
  request and discarded when the request completes. It is never written to disk, never
  written to object storage, and never persisted anywhere. Only the *derived* artifact —
  the structured Master Reviewer JSON the model produces from it — is saved. There is no
  bucket to purge because the original file never lands in one.
- **Vendor data-handling:** inference runs through Fireworks AI's API under standard
  enterprise terms; request payloads (prompts/context) are not retained for training.

### 2. Storage & Database Security

- **Row Level Security, defense-in-depth:** every table (`workspaces`, `documents`,
  `flashcards`, `player_profiles`, `concept_mastery`) has RLS policies scoping access to
  the authenticated Clerk user id, enforced at the Postgres layer via
  `auth.jwt() ->> 'sub'`. The backend's service-role key bypasses RLS by design (it's the
  trusted server, not an end-user client), so every repository method *also* filters by
  `user_id` in application code — RLS is the safety net for any hypothetical direct client
  access, not the only gate.
- **Upload validation:** files are streamed in 1 MiB chunks with a hard byte cap (default
  25 MB) — a request is rejected mid-stream once the cap is exceeded, so a malicious upload
  can't exhaust memory before validation runs. File type is checked against actual
  extension/content-type, not blindly trusted.

### 3. Authentication (Clerk)

- Session verification is a real, live RS256 JWT check against Clerk's JWKS endpoint
  (`PyJWT` + `PyJWKClient`), not a stub — every protected route depends on it.
- **A caller-supplied `X-User-Id` header is a local-development convenience only.** It is
  honored solely when Clerk is not configured at all (no JWKS URL, no secret key present).
  The moment Clerk *is* configured, that fallback is disabled entirely and a valid bearer
  token is required, full stop — a request with no token, or a token for a different
  origin (`azp` mismatch), is rejected with `401` regardless of what headers accompany it.
- **This was found and fixed, not merely designed.** A pre-deployment audit surfaced that
  an earlier version of this dependency fell back to trusting `X-User-Id` whenever a
  request lacked a bearer token — including in a fully-configured production environment,
  which meant any caller could impersonate any user by simply omitting `Authorization`.
  The fix was verified live against the deployed backend: an `X-User-Id`-only request now
  returns `401 Authentication required`.
- Minimal PII: email and display name only, sourced from the auth provider — no secondary
  personal data is collected or stored.

### 4. AI Safety Guardrails

- **Prompt-injection isolation:** the student's message is always a distinct conversational
  turn from the system instructions, never concatenated into a single instruction block the
  model could be tricked into treating as one continuous, overridable prompt.
- **Refusal behavior:** the tutor prompt explicitly declines system-prompt extraction
  attempts and requests to complete graded work on the student's behalf ("write my essay,"
  "just give me the answers"), redirecting to the underlying concept instead.
- **No raw-HTML injection surface:** AI-generated content (tutor replies, quiz text) renders
  through `react-markdown` with no `dangerouslySetInnerHTML` and no raw-HTML plugin
  anywhere in the frontend — confirmed by direct code audit, not assumed. Model output is
  parsed into a markdown AST and rendered as React elements; it cannot emit an executable
  `<script>` tag even if a prompt injection attempted it.
