---
description: "Forge-only Auto Mode approval policy for consequential PowerShell commands under the workspace-write permission preset."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-auto-mode-forge

English | [中文](README.zh.md)

## Summary

This package lets DSH Forge run routine workspace work automatically while asking before a narrow set of consequential PowerShell commands. Choose the Forge `Auto Mode` permission option to use it; `Read & Plan` and `Full Access` keep their existing internal behavior. The policy adds risk reduction to the existing approval flow and does not replace the filesystem sandbox or grant wider access.

## Table of Contents

- [Use this package](#use-this-package)
- [Understand the implementation](#understand-the-implementation)
- [Further Exploration](#further-exploration)
- [Model Experience](#model-experience)
- [Known Limitations and Deferred Work](#known-limitations-and-deferred-work)
- [Dev Note](#dev-note)

-----

<a id="use-this-package"></a>
## Use this package

Mount the package beside `dsh-permission-presets`; the DSH Forge desktop overlay supplies the production row and the three presentation labels.

### Minimal configuration

```yaml
- name: '@deepseek-ai/dsh-experimental-auto-mode-forge'
```

The plugin has no configuration fields. When the effective preset key is `workspace-write`, it classifies direct `pwsh` commands and returns `ask` for recognized high-risk operations; all other calls delegate to the next `tools/pre-execute` listener. The existing approval service permits only `allowed-once`; rejection, cancellation, and an unavailable answerer fail closed.

The DSH Forge permission presentation keeps the existing machine values: `Read & Plan` is `read-only` + `ask`, `Auto Mode` is `workspace-write` + `ask`, and `Full Access` is `danger-full-access` + `never`. `Read & Plan` does not activate DSH plan mode. A `workspace-write` call requesting `danger-full-access` still follows the existing sandbox-escalation approval path.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

The plugin reads the effective preset from `ctx.permissionPresets` at `tools/pre-execute`. Its pure classifier examines the parsed `pwsh` `command` string for direct destructive filesystem and Git operations, Git pushes, package publication, and clear machine-level mutation. A match returns `ask` with a category reason; no match calls `next()` so ordinary DSH policy and execution remain authoritative.

The classifier separates unquoted PowerShell statements but is not a complete PowerShell parser. This deliberate limit keeps the Forge rule deterministic and auditable without creating a second command-policy framework.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [Permission presets](../../interaction/permission-presets/README.md) — existing preset keys, projection, and switching behavior.
- [Tool execution pipeline](../../../docs/tool-execution-pipeline.md) — `tools/pre-execute` and approval routing.
- [Sandbox](../../sandbox/sandbox/README.md) — filesystem modes and one-call escalation.
- [Windows ACL sandbox](../../sandbox/sandbox-windows-acl/README.md) — partial Windows enforcement details.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package adds no prompt, tool schema, or result text; it only routes recognized calls through the existing approval service.

#### KV Cache effect

None; this package does not change provider requests.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>

These limits keep Auto Mode a narrow Forge policy rather than a general command authorization system.

- **Partial Windows enforcement** — the Windows sandbox reports partial filesystem enforcement; Auto Mode is risk reduction, not a security guarantee.
- **Filesystem-only sandbox vocabulary** — `SandboxMode` does not govern general network or process authority.
- **Narrow PowerShell recognition** — the classifier covers direct deterministic forms only; aliases, wrappers, dynamic construction, and complex subexpressions delegate to normal DSH behavior.
- **Human-owned elevation** — `workspace-write` to `danger-full-access` escalation always remains in the existing human approval flow.
- **English-only preset labels** — host-supplied preset names bypass the client locale dictionary, so `Read & Plan`, `Auto Mode`, and `Full Access` render in English under every locale. The `danger-full-access` acknowledgement text stays locale-owned because it keys off the machine value.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

None.

</details>

**Runtime invariant:** No companion is published. The package retains no state; its only listener is a Cordis-owned effect.
