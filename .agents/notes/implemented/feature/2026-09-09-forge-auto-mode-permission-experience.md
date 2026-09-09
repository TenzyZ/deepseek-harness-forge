# Agent Note: Forge Auto Mode permission experience

Status: implemented

English | [中文](2026-09-09-forge-auto-mode-permission-experience.zh.md)

## Problem

DSH Forge needs a three-choice permission experience that distinguishes routine workspace automation from unrestricted execution without changing the stable sandbox and approval values. The existing `workspace-write` preset allows project work without prompts, but the filesystem-oriented sandbox does not itself ask before consequential network, repository publication, or machine-level commands.

## Decision

The Forge desktop composition presents the existing keys as `Read & Plan`, `Auto Mode`, and `Full Access`. Their bundles remain `read-only` + `ask`, `workspace-write` + `ask`, and `danger-full-access` + `never`. `Read & Plan` does not activate plan mode, and Full Access keeps its existing acknowledgement keyed to `danger-full-access`.

`@deepseek-ai/dsh-experimental-auto-mode-forge` listens at `tools/pre-execute` only when the effective preset is `workspace-write`. A deterministic classifier asks through the existing approval service for direct PowerShell forms covering recursive forced deletion, destructive Git operations, Git push, package publication, and clear system mutation. Routine and unrecognized calls delegate to the remaining tool pipeline. Only `allowed-once` proceeds; rejection, cancellation, and an unavailable answerer retain the approval service's fail-closed behavior.

The plugin does not approve sandbox escalation. A call that requests `danger-full-access` continues to the existing PowerShell escalation path and requires its separate one-call human decision.

## Alternatives considered

**Add an `auto` preset key or approval policy.** This would create a fourth persisted value, migration and replay work, and new UI plumbing while duplicating the existing `workspace-write` + `ask` bundle.

**Automatically grant `danger-full-access`.** The grant removes file confinement for the complete call, and Windows confinement remains partial. The existing human approval remains the owner of that decision.

**Build a general command parser or model reviewer.** A broad rules engine or paid inference path would add another authorization framework. The Forge requirement needs only deterministic recognition of a small direct-command set.

**Change generic permission or tool code.** Host-provided preset names and `tools/pre-execute` already supply the presentation and policy extension points, so generic source changes would widen the impact without adding capability.

## Verification

The package test loads the plugin, permission service, approval service, and tool runtime through a real Cordis Loader composition. It pins routine delegation, every approval outcome, one-call grants, unaffected non-Auto presets, and sandbox-escalation delegation. A shipped-layer composition assertion pins the three keys, labels, bundles, and single Forge plugin row; existing PowerShell escalation and Full Access acknowledgement tests remain the downstream regression owners.

## Consequences

Forge users get routine automatic workspace work and a human checkpoint for a small auditable set of consequential commands without changing session event formats or generic permission semantics. Existing `permission/preset: workspace-write` events remain valid.

The classifier is deliberately incomplete and defaults unrecognized syntax to normal DSH behavior. Windows sandbox enforcement remains partial, and `SandboxMode` does not govern general network or process effects, so Auto Mode reduces risk without acting as a security guarantee.
