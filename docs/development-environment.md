# Development Environment

## Primary setup

Finance Cockpit is developed inside Ubuntu on WSL2. The repository lives at:

```text
/home/matthias/dev/finance-cockpit
```

Expo, Node project commands, Git, and file operations should run in WSL whenever possible. Keeping the repository on the Linux filesystem gives better behavior and performance than moving it under `/mnt/c` solely to accommodate Windows tooling.

## Codex Desktop and WSL filesystem limitation

Observed on 2026-07-12 with the Windows Codex desktop app:

- The saved desktop project is registered as `\\wsl.localhost\Ubuntu\home\matthias\dev\finance-cockpit`.
- The desktop task therefore runs through a Windows/PowerShell host and a Windows filesystem sandbox helper.
- The helper can create a new file in the WSL workspace but fails when it later tries to read an existing WSL file for `apply_patch`.
- The reproducible error includes `windows sandbox: helper_unknown_error: setup refresh had errors`.
- Linux ownership and permissions are normal, and the same existing files are writable from native WSL.

This is an attachment/helper limitation, not a repository, Git, Expo, or WSL-permission problem.

## Native WSL Codex

A native Linux Codex CLI is installed for the WSL user:

```text
Node:  ~/.local/opt/node
Codex: ~/.local/bin/codex
```

It is authenticated separately from Codex Desktop using ChatGPT device authentication. Native Codex has been verified to:

- detect the repository as `/home/matthias/dev/finance-cockpit`;
- initialize its Linux workspace-write sandbox;
- read and modify an existing file with `apply_patch`;
- use native WSL Git;
- preserve unrelated working-tree changes.

The system `bubblewrap` package is not installed because it requires sudo, but Codex successfully uses its bundled sandbox helper. This is not currently blocking.

## Launcher

From an Ubuntu/WSL terminal, start interactive Codex with:

```bash
./scripts/codex-wsl.sh
```

The launcher:

- resolves the repository root automatically;
- adds the user-local Node/Codex directory to `PATH`;
- checks that native Codex exists;
- checks authentication;
- starts Codex with this repository as its working root;
- forwards all additional arguments.

Examples:

```bash
# Interactive session
./scripts/codex-wsl.sh

# Non-interactive task
./scripts/codex-wsl.sh exec "Inspect the current working tree and report status."

# Health diagnostic
./scripts/codex-wsl.sh doctor
```

The script can also be launched from Windows automation or Codex Desktop through WSL:

```powershell
wsl.exe -d Ubuntu -- /home/matthias/dev/finance-cockpit/scripts/codex-wsl.sh exec "..."
```

An interactive session still needs a real WSL terminal. Non-interactive `exec` tasks can be launched by automation.

## Authentication recovery

If the launcher reports that Codex is not authenticated, run this in a WSL terminal and complete the browser/device flow:

```bash
PATH="$HOME/.local/bin:$PATH" "$HOME/.local/bin/codex" login --device-auth
```

Verify with:

```bash
PATH="$HOME/.local/bin:$PATH" "$HOME/.local/bin/codex" login status
```

Do not copy authentication files between Windows and WSL manually or commit them to the repository.

## Desktop-task editing fallback

When continuing a Windows Codex Desktop task attached through the UNC project path:

1. Prefer normal `apply_patch` first.
2. If it fails with the known sandbox-helper error, create a standard patch as an auditable temporary artifact.
3. Validate inside WSL with `git apply --check`.
4. Apply inside WSL with native `git apply`.
5. Verify the diff and remove the temporary patch.

Do not replace this with opaque shell rewriting, broad search-and-replace, or copying whole files over existing content. Preserve unrelated user changes.

## Long-term resolution

The preferred permanent resolution is for Codex Desktop to register or attach the project as a native WSL/Linux project rather than as a Windows UNC project. Until that capability is available or configured, use:

- native WSL Codex for clean Linux-native sessions; or
- the validated WSL Git patch bridge for an existing desktop conversation.

