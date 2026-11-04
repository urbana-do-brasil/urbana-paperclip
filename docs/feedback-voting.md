---
title: Feedback Voting — Local Data Guide
summary: Understand what feedback votes store, export, and share
---

When you rate an agent's response with **Helpful** (thumbs up) or **Needs work** (thumbs down), Paperclip saves your vote locally alongside your running instance. This guide covers what gets stored, how to access it, and how to export it.

## How voting works

1. Click **Helpful** or **Needs work** on any agent comment or document revision.
2. If you click **Needs work**, an optional text prompt appears: _"What could have been better?"_ You can type a reason or dismiss it.
3. When the instance preference is set to ask, a consent dialog lets you keep the vote local or share it. Your choice is remembered for future votes.

### What gets stored

For each person and target, Paperclip keeps a local vote record and an associated trace record. Updating the same vote updates those records instead of creating duplicates.

| Record | What it contains |
|--------|-----------------|
| **Vote** | Your vote (up/down), optional reason text, sharing preference, consent version, timestamp |
| **Trace record** | A local-only record stores metadata and a target summary, not the full context bundle. When sharing is allowed, Paperclip also stores a full context snapshot with the comment/revision text, issue title, agent information, vote, and reason. |

Votes and their trace records are stored in your local Paperclip database. A local-only record does not store the full context bundle. The CLI can still reconstruct a richer bundle for an on-disk export from referenced run files when they are available; local-only traces are not queued for remote delivery. When sharing is selected or already allowed by your saved preference, Paperclip stores the full context snapshot and queues it for remote delivery.

When a vote is marked for sharing, Paperclip stores a snapshot and queues it for delivery through the Telemetry Backend. A background worker attempts the upload; the payload is compressed in transit to stay within gateway size limits. If delivery fails, the trace moves to a retryable failed state. The app server never uploads raw feedback trace bundles directly to object storage.

## Viewing your votes

### Quick report (terminal)

```bash
pnpm paperclipai feedback report
```

Shows a color-coded summary: vote counts, per-trace details with reasons, and export statuses.

```bash
# Installed CLI
paperclipai feedback report

# Point to a different server or company
npx paperclipai feedback report --api-base http://127.0.0.1:3000 --company-id <company-id>

# Include raw payload dumps in the report
pnpm paperclipai feedback report --payloads
```

### API endpoints

All endpoints require board-user access (automatic in local dev).

**List votes for an issue:**
```bash
curl http://127.0.0.1:3102/api/issues/<issueId>/feedback-votes
```

**List trace bundles for an issue (with full payloads):**
```bash
curl 'http://127.0.0.1:3102/api/issues/<issueId>/feedback-traces?includePayload=true'
```

**List all traces company-wide:**
```bash
curl 'http://127.0.0.1:3102/api/companies/<companyId>/feedback-traces?includePayload=true'
```

**Get a single trace envelope record:**
```bash
curl http://127.0.0.1:3102/api/feedback-traces/<traceId>
```

**Get the full export bundle for a trace:**
```bash
curl http://127.0.0.1:3102/api/feedback-traces/<traceId>/bundle
```

#### Filtering

The trace endpoints accept query parameters:

| Parameter | Values | Description |
|-----------|--------|-------------|
| `vote` | `up`, `down` | Filter by vote direction |
| `status` | `local_only`, `pending`, `sent`, `failed` | Filter by export status |
| `targetType` | `issue_comment`, `issue_document_revision` | Filter by what was voted on |
| `sharedOnly` | `true` | Only show votes the user chose to share |
| `includePayload` | `true` | Include the full context snapshot |
| `from` / `to` | ISO date | Date range filter |

## Exporting your data

### Export to files + zip

```bash
pnpm paperclipai feedback export
```

Creates a timestamped directory with:

```
feedback-export-20260331T120000Z/
  index.json                    # manifest with summary stats
  votes/
    PAP-123-a1b2c3d4.json      # vote metadata (one per vote)
  traces/
    PAP-123-e5f6g7h8.json      # Paperclip feedback envelope (one per trace)
  full-traces/
    PAP-123-e5f6g7h8/
      bundle.json              # full export manifest for the trace
      ...raw adapter files     # codex / claude / opencode session artifacts when available
feedback-export-20260331T120000Z.zip
```

Exports are full by default. `traces/` keeps the Paperclip envelope, while `full-traces/` contains the richer per-trace bundle plus any recoverable adapter-native files.

Only votes with sharing enabled store the full context snapshot. A `local_only` record contains metadata and a target summary; an on-disk export may reconstruct additional run and adapter artifacts from local files when they are available. Those local-only traces are never queued for remote delivery.

```bash
# Custom server and output directory
npx paperclipai feedback export --api-base http://127.0.0.1:3000 --company-id <company-id> --out ./my-export
```

### Reading an exported trace

Open any file in `traces/` to see:

```json
{
  "id": "trace-uuid",
  "vote": "down",
  "issueIdentifier": "PAP-123",
  "issueTitle": "Fix login timeout",
  "targetType": "issue_comment",
  "targetSummary": {
    "label": "Comment",
    "excerpt": "The first 80 chars of the comment that was voted on..."
  },
  "payloadSnapshot": {
    "vote": {
      "value": "down",
      "reason": "Did not address the root cause"
    },
    "target": {
      "body": "Full text of the agent comment..."
    },
    "issue": {
      "identifier": "PAP-123",
      "title": "Fix login timeout"
    }
  }
}
```

Open `full-traces/<issue>-<trace>/bundle.json` to see the expanded export metadata, including capture notes, adapter type, integrity metadata, and the inventory of raw files written alongside it.

Each entry in `bundle.json.files[]` includes the actual captured file payload under `contents`, not just a pathname. For text artifacts this is stored as UTF-8 text; binary artifacts use base64 plus an `encoding` marker.

Built-in local adapters now export their native session artifacts more directly:

- `codex_local`: `adapter/codex/session.jsonl`
- `claude_local`: `adapter/claude/session.jsonl`, plus any `adapter/claude/session/...` sidecar files and `adapter/claude/debug.txt` when present
- `opencode_local`: `adapter/opencode/session.json`, `adapter/opencode/messages/*.json`, and `adapter/opencode/parts/<messageId>/*.json`, with optional `project.json`, `todo.json`, and `session-diff.json`

## Sharing preferences

When the instance preference is set to ask, a consent dialog offers:

- **Keep local** — vote is stored locally only (`sharedWithLabs: false`)
- **Share this vote** — vote is marked for sharing (`sharedWithLabs: true`)

Your preference is saved per-company. You can change it any time via the feedback settings. Votes marked "keep local" are never queued for export.

## Data lifecycle

| Status | Meaning |
|--------|---------|
| `local_only` | Vote stored locally, not marked for sharing |
| `pending` | Marked for sharing, saved locally, and waiting for the background delivery worker |
| `sent` | Successfully transmitted |
| `failed` | Transmission attempted but failed (for example the backend is unreachable or not configured); later flushes retry once a backend is available |

Your local database retains the vote and its trace record. Local-only records store metadata and a target summary, not the full context snapshot. An on-disk export may reconstruct run and adapter artifacts from local files when available. A shared vote's full context snapshot is stored locally and queued for remote delivery.

## Remote sync

Votes you choose to share are queued by the vote request and sent asynchronously by a background worker. The worker also retries failed traces later. The Telemetry Backend validates the request, then persists the bundle into its configured object storage.

- App server responsibility: build the bundle, POST it to Telemetry Backend, update trace status
- Telemetry Backend responsibility: authenticate the request, validate payload shape, compress/store the bundle, return the final object key
- Retry behavior: failed uploads move to `failed` with an error message in `failureReason`, and the worker retries them on later ticks
- Default endpoint: when no feedback export backend URL is configured, Paperclip falls back to `https://telemetry.paperclip.ing`
- Important nuance: the uploaded object is a snapshot of the full bundle at vote time. If you fetch a local bundle later and the underlying adapter session file has continued to grow, the local regenerated bundle may be larger than the already-uploaded snapshot for that same trace.

Exported objects use a deterministic key pattern so they are easy to inspect:

```text
feedback-traces/<companyId>/YYYY/MM/DD/<exportId-or-traceId>.json
```
