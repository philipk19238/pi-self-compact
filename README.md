# pi-self-compact

A small [pi](https://pi.dev) package that registers a `self_compact` tool. The tool lets the agent trigger pi session compaction when context gets stale, noisy, or too large.

## Install

```bash
pi install git:github.com/philipk19238/pi-self-compact@v0.2.0
```

Try it for one run without installing:

```bash
pi -e git:github.com/philipk19238/pi-self-compact@v0.2.0
```

## Usage

The extension provides:

- Tool: `self_compact` — the agent calls this itself when older history has become dead weight.
- Command: `/self-compact [optional focus instructions]` — you trigger it manually.

### When it fires

pi already auto-compacts when the context window fills up. `self_compact` is for compacting **earlier and at a cleaner point** — when recent exploration has become dead weight — so the summary lands on a natural boundary instead of auto-compaction firing mid-task. It's lossy and costs a model call, so it's meant to be deliberate, not reflexive.

**It ends the current turn.** Under the hood `ctx.compact()` aborts the in-flight response, summarizes, and reloads the session on the compacted context (it does not auto-resume). So the agent should treat it as a final, turn-closing action — not something to do and then keep working within the same turn. Timing is left entirely to the model: nothing forces it and nothing blocks it (pi itself rejects a session that's too small to compact).

### Focus instructions

The `customInstructions` (or the text after `/self-compact`) are **appended** to pi's default summary prompt, which already preserves goals, constraints, progress, decisions, next steps, file paths, and error messages. So don't restate those — pass only what's specific to this session that a generic summarizer would drop:

```text
/self-compact Keep the derived config schema verbatim. Note that the WebSocket approach failed with ECONNRESET. Discard the initial repo tour.
```

Run with no argument to just use the default summary as-is.
