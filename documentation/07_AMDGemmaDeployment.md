# Deploying Gemma 4 on AMD Developer Cloud

This is a runbook, not a description of something already running — nobody had AMD
Developer Cloud access when this was written, so none of it has been executed against a
live endpoint yet. Everything here is sourced from AMD's and vLLM's own docs (see links).
Treat step 4 (verification) as mandatory before trusting this in a demo, not optional.

## Why this exists

The app's backend already talks to Fireworks AI (`gpt-oss-120b`) through the OpenAI
Python SDK pointed at an OpenAI-compatible `base_url`. AMD Developer Cloud has no
managed inference API — it's raw GPU VM rental — so "using AMD Developer Cloud" means
launching a VM, running a vLLM server on it yourself, and pointing this same SDK at
that VM's address instead. `app/services/ai_client.py` already supports this as a
one-line env var switch (`AI_PROVIDER=amd_cloud`); this doc covers the other half —
actually standing up the vLLM server it talks to.

## 1. Launch the VM

1. [AMD Developer Cloud](https://www.amd.com/en/developer/resources/cloud-access/amd-developer-cloud.html) →
   claim AI Developer Program credits (~$100 ≈ 50 hrs on one MI300X) or pay-as-you-go
   (~$2/hr).
2. Pick a single **MI300X (192GB)** instance — Gemma 4 26B-A4B-IT fits comfortably at
   TP=1 with full context on one of these; no need for multi-GPU.
3. Use the **vLLM ROCm quick-start image** if offered
   (`vllm/vllm-openai-rocm:gemma4` — AMD published this specifically for Gemma 4's
   Day-0 launch). If it's not available as a one-click image in your region, launch a
   base ROCm image and install vLLM manually per
   [AMD's Gemma 4 Day-0 guide](https://www.amd.com/en/developer/resources/technical-articles/2026/day-0-support-for-gemma-4-on-amd-processors-and-gpus.html).
4. Add your SSH key, launch.

## 2. Serve the model

SSH in and run:

```bash
vllm serve google/gemma-4-26B-A4B-it \
  --host 0.0.0.0 \
  --port 8000 \
  --reasoning-parser gemma4 \
  --default-chat-template-kwargs '{"enable_thinking": false}'
```

- `--reasoning-parser gemma4` splits any hidden `<think>` content into a separate
  `reasoning_content` field instead of letting it consume the visible response's
  `max_tokens` — Google's own docs note Gemma 4 doesn't always fully suppress its
  reasoning channel even with thinking disabled, so this is the server-side backstop
  for the same failure mode gpt-oss had (see `gemma_amd.py`'s empty-content guard for
  the client-side one).
- The `--default-chat-template-kwargs` server default doesn't need to match every call —
  `app/services/gemma_amd.py` already sends `enable_thinking: true` for ingestion and
  `false` for tutor/quiz/flashcards on a **per-request** basis via `extra_body`.
- 31B-IT (dense) is a straight swap (`vllm serve google/gemma-4-31B-it ...` +
  `AMD_CLOUD_MODEL=google/gemma-4-31B-it`) if you want to trade latency for the
  slightly higher Arena ranking — no code changes either way.

## 3. Point the backend at it

In `backend/.env`:

```
AI_PROVIDER=amd_cloud
AMD_CLOUD_BASE_URL=http://<vm-ip>:8000/v1
AMD_CLOUD_MODEL=google/gemma-4-26B-A4B-it
```

Restart the backend. To revert, set `AI_PROVIDER=fireworks` (or delete the line) and
restart — nothing else changes.

## 4. Verify before trusting it (do this before a demo)

Two things flagged as genuinely uncertain in vLLM's current docs, not assumptions to
skip:

1. **`response_format={"type": "json_object"}` support.** vLLM's own structured-outputs
   docs foreground `guided_json`/`structured_outputs` over plain `json_object` mode, and
   there's a history of version-specific bugs with it. `curl` the endpoint directly with
   a `[MODE: INGEST]`-style prompt and `response_format: {"type": "json_object"}` before
   assuming the existing client code Just Works. If it errors or returns non-JSON, swap
   to `extra_body={"structured_outputs": {"json": <schema>}}` in `gemma_amd.py`, where
   `<schema>` is `IngestPayload.model_json_schema()` (or the relevant schema per mode) —
   the code is structured so this is a small, localized change.
2. **Actual thinking suppression.** Send a tutor-mode request with
   `enable_thinking: false` and check the raw response for a non-empty
   `reasoning_content` field or an unexpectedly short/empty `content`. If reasoning is
   still leaking through and costing `max_tokens`, that's what `--reasoning-parser
   gemma4` (step 2) is for — confirm it's actually catching it.

Also just watch real latency for a tutor turn (`max_tokens=1536`) against the
hackathon's 30-second cap — a single MI300X should be fast, but this hasn't been
timed live yet.

## 5. Every Gemma integration point in this app

This codebase has four separate places Gemma shows up, at three different levels of
"real" — worth being precise about which is which rather than letting them blur together:

| # | What | Model | Where | Status |
|---|------|-------|-------|--------|
| 1 | Tutoring/quiz/ingest, wholesale | Gemma 4 (26B-A4B-IT or 31B-IT) | `AI_PROVIDER=amd_cloud`, `app/services/gemma_amd.py` | Dormant — the runbook above, needs AMD Developer Cloud credits |
| 2 | PPTX slide-image captioning during ingestion | Gemma 4 vision | `FIREWORKS_GEMMA_MODEL`, `app/services/vision.py` | Dormant — needs a paid Fireworks on-demand deployment (Gemma is not served serverless on Fireworks as of this writing — confirmed by calling the chat completions API directly against `gemma2-9b-it`, `gemma-3-27b-it`, `gemma-4-e4b`, and `gemma-4-26b-a4b-it`; all four 404 with no deployment running) |
| 3 | Flashcard generation specifically (tutoring stays on gpt-oss-120b) | Gemma 3 27B | `GEMMA_FLASHCARDS_MODEL`, `run_flashcard_generation` in `app/services/fireworks.py` | Dormant, same reason as #2 — real code path, task-level override (not a whole-provider swap like #1), zero cost/behavior change until set |
| 4 | Enterprise settings UI — "flip tutoring to Gemma 4" | Gemma 4 | `frontend/src/app/dashboard/settings/page.tsx`, "AI Model Provider" card | Frontend proof-of-concept only — the toggle is real UI state, but selecting it doesn't reroute inference; it documents that #1's `AI_PROVIDER=amd_cloud` switch is what an actual Enterprise deployment would flip |

**Why #3 exists as a separate mechanism from #1**: `AI_PROVIDER` swaps *every* generation
call to the alternate provider wholesale. Flashcard generation is a short, templated
extraction task — a deliberately different shape of work from the tutor's multi-turn
scaffolded reasoning — so it gets its own override that can point at Gemma while tutoring
stays on gpt-oss-120b. To activate it once a Gemma 3 27B on-demand deployment is running:

```
GEMMA_FLASHCARDS_MODEL=accounts/fireworks/models/<your-deployment-id>
```

Same on/off mechanics as `FIREWORKS_GEMMA_MODEL` (#2): unset by default, zero cost, and
`run_flashcard_generation` falls straight back to `fireworks_model` (gpt-oss-120b) with no
other code change.
