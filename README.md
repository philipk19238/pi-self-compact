# pi-self-compact

A small [pi](https://pi.dev) package that registers a `self_compact` tool. It lets the agent compress its own context: the agent **writes its own summary**, which replaces the older messages while recent turns are kept.

## Install

```bash
pi install npm:pi-self-compact
```

Try it for one run without installing:

```bash
pi -e npm:pi-self-compact
```

## Usage

The extension provides:

- Tool: `self_compact` — the agent calls this itself, passing the summary it wants to keep.
- Command: `/self-compact [summary]` — trigger it manually. Pass a summary to use, or leave it empty to have one generated.

### How it works

When the agent (or you) supply a `summary`, that text becomes the compacted context verbatim — no second summarizer pass. The agent already holds the whole conversation, so it writes a better checkpoint than a model re-reading everything after the fact, and it's one fewer LLM call. Omit the summary and pi falls back to its default summarizer. Either way, pi appends the read/modified file list.

**It ends the current turn.** Under the hood `ctx.compact()` aborts the in-flight response and reloads the session on the compacted context (it does not auto-resume). Timing and content are left entirely to the model — nothing forces it, nothing blocks it, and no restrictions are placed on when it's used (pi itself rejects only a session too small to compact).

```text
/self-compact Goal: ship the retry fix. Done: root-caused the ECONNRESET to the pooled socket. Next: add a backoff test. Keep src/pool.ts:changeTimeout. Dead end: raising the OS keepalive did nothing.
```
