# pi-self-compact

A small [pi](https://pi.dev) package that registers a `self_compact` tool. The tool lets the agent trigger pi session compaction when context gets stale, noisy, or too large.

## Install

```bash
pi install git:github.com/philipk19238/pi-self-compact@v0.1.0
```

Try it for one run without installing:

```bash
pi -e git:github.com/philipk19238/pi-self-compact@v0.1.0
```

## Usage

The extension provides:

- Tool: `self_compact`
- Command: `/self-compact [optional focus instructions]`

Example:

```text
/self-compact Preserve the active task, constraints, changed files, failed attempts, and exact next step. Discard stale exploration.
```
