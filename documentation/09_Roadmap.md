# 📄 PRISM LEARNING AI
## Document 9: Roadmap

This roadmap is split deliberately into two kinds of items: **known engineering gaps** —
things already scoped, partially built, or found during our own pre-deployment audit — and
**forward-looking product direction**. Conflating the two is how roadmaps turn into
marketing copy; keeping them separate is how this one stays honest.

---

### Now — known gaps, not yet closed

- **Gamification: backend built, frontend not wired to it.** The `player_profiles` and
  `concept_mastery` Supabase tables, their RLS policies, and the full `/gamification/*`
  API (profile XP/streak/quests, per-concept mastery) are implemented and tested — but the
  frontend still reads and writes XP, streak, quests, and mastery purely to `localStorage`.
  This means gamification progress does not currently survive a new device or browser. The
  fix is a client-side swap, not new backend work: the API contract already exists.
- **Gemma 4 Enterprise path is schema-tested, not live-deployed.** `AI_PROVIDER=amd_cloud`
  is a real, working code path against a self-hosted vLLM OpenAI-compatible server, but no
  one has yet stood up an actual AMD Developer Cloud instance and pointed it at production.
  The Settings toggle previews the switch honestly — it does not pretend this is live.
- **YouTube ingestion needs a residential proxy in production.** Google blocks transcript
  requests from cloud-provider IPs outright; this works with zero configuration locally and
  fails on any cloud host without a proxy. Free-tier datacenter proxy pools were tested and
  found unreliable (shared pools get flagged quickly); a residential proxy tier is the
  documented fix, not yet purchased.
- **Onboarding is unbuilt.** A spotlight-tour flow for first-time dashboard and workspace
  visits is scoped in `02_UI_UX.md` but does not exist in the shipped product.

### Next — product expansion

- **Collaborative workspaces.** Multi-student, peer-to-peer study spaces sharing a single
  ingested curriculum — the natural extension of the single-player workspace model to
  study groups and classrooms.
- **Teacher/institutional analytics.** The per-student mastery data the platform already
  computes (once wired server-side, per the gap above) is the direct input to a
  teacher-facing dashboard — cohort-level weak-concept rollups, not just per-student ones.
- **Deeper voice tutoring.** Current voice support is real (Web Speech API, both
  directions) but text-first in spirit — the roadmap direction is a genuinely voice-native
  session mode, not text with a microphone bolted on.

### Later — platform & enterprise

- **LMS integration hooks.** Direct integration with Canvas/Blackboard-class platforms so
  institutional adoption doesn't require a parallel workflow outside the LMS students and
  teachers already use.
- **Dedicated Gemma 4 deployments as a real Enterprise tier**, once the AMD Developer
  Cloud path above is exercised against a live endpoint — full data residency for
  institutional customers who need workloads to never leave a dedicated deployment.
- **Mobile-native and offline study.** The current mobile experience is a responsive
  single-pane web view; native app packaging and offline-capable study sessions (cached
  reviewer content, flashcards without a live connection) are the next step beyond that.

---

Track 3 (Unicorn / Open Innovation) framing aside, the throughline across every item above
is the same one this product started with: teaching, not just information retrieval —
whether that's closing the gamification loop properly, getting a second model onto real
enterprise hardware, or making study genuinely possible without a screen or a connection.
