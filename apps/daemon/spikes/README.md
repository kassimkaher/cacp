# Phase 0 spikes

Three behaviours the design depends on have to be measured against a real
Claude Code install before the code that relies on them is written (design
doc, sections 18 and 19). None of these have been run yet. Record the Claude
Code version (`claude --version`) and the results in `docs/phase-0-results.md`.

Setup for all three:

```bash
export CACP_HOOK_SECRET="$(openssl rand -hex 16)"
pnpm --filter @cacp/daemon hooks:install -- --dry-run   # review first
pnpm --filter @cacp/daemon hooks:install                # writes a backup
```

`hooks:uninstall` removes exactly what was added.

## 1. Held hooks

Question: can a `PermissionRequest` or `Stop` http hook stay open for minutes
while a person decides on their phone, and what happens when it times out?

```bash
HOLD_SECONDS=30 ANSWER=allow pnpm --filter @cacp/daemon spike:held-hook
```

In another terminal start `claude` in a scratch repo, in the default
permission mode, and ask it to run a shell command that needs approval.

Record, for HOLD_SECONDS of 30, 120, 590 and 700 (the installed timeout is 600):

- Does the terminal show its own permission prompt while the hook is held, or
  only after the hook returns?
- If the person answers in the terminal first, is the hook connection closed?
  (the spike prints `CLOSED BY CLAUDE CODE after …s`)
- With `ANSWER=allow` / `deny` / `none`: does Claude Code follow the answer?
- Past the timeout: does it fall back to the local prompt?
- The exact key names in the payload (the spike prints them), in particular
  for `StopFailure` and `Notification`.

Then `HOLD_STOP=1 HOLD_SECONDS=5`: confirm that answering `Stop` with
`decision: "block"` continues the turn with the reason as the instruction, and
that `stop_hook_active` is set on the following `Stop`.

Decides: whether observed (terminal) sessions get remote approval and
stop-time continuation, or are monitor-only until taken over.

## 2. Taking over a terminal session

Question: once a terminal session's process has exited, can the daemon resume
the same session id headlessly and keep its history?

```bash
# 1. In a scratch repo, start `claude`, have a short exchange, note the
#    session id (the daemon log prints it), then exit.
# 2. Resume it non-interactively:
claude -p --resume <session-id> --output-format stream-json --verbose \
  "Summarise what we did so far in one sentence."
# 3. Open it again in a terminal and confirm both turns are there:
claude --resume <session-id>
```

Record: is the session id unchanged (no fork)? Does `SessionStart` fire with
`source: "resume"`? What happens if step 2 runs while the terminal session is
still open (expected: must be refused by the daemon; note what Claude Code
itself does)?

## 3. Remote login through a pseudo-terminal

Question: can `claude auth login` be driven without a local browser, capturing
the URL and feeding back the pasted code?

Use a throwaway config directory so the real login is untouched:

```bash
export CLAUDE_CONFIG_DIR="$(mktemp -d)"
claude auth status; echo "exit=$?"          # expect loggedIn false, exit 1
script -q /tmp/cacp-login.log claude auth login
```

Record: the exact text around the URL, the exact prompt for the code, whether
the URL is printed without a keypress, what a wrong code prints, and
`claude auth status` output after success (field names). Those strings become
the daemon's parser, pinned to a tested version range.

Before this is built for anyone but yourself, confirm with Anthropic that
relaying the one-time code is acceptable under the credential rules quoted in
the design doc, section 12.
