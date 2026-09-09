---
description: "DSH Forge identity occupants for the conversation hero attribution and sidebar brand name slots, composed into desktop Forge; for maintainers of that deployment's identity."
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-client-ui-brand-forge

English | [中文](README.zh.md)

## Summary

This package fills two presentation slots — conversation hero attribution (with the three-line identity of DSH Forge, its author, and statement of building on DeepSeek Harness) and sidebar brand name (rendering "DSH Forge"). It occupies nothing else: the sidebar mark falls back to FishLogo since ui-brand-official is disabled in the desktop overlay, while the hero mark, headline, and Preview badge remain unchanged. Only the desktop composition inserts this plugin, leaving Web products unaffected. The package is private to this repository, is never published, retains no runtime state, and contributes nothing to model requests.

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

Mount this plugin in the browser roster of the deployment whose identity is DSH Forge. The desktop overlay at `apps/desktop-host/config/desktop.cordis.patch.yml` inserts it; no other composition does. Leaving it out returns the hero to the unoccupied slot, which renders nothing.

### Replacing the attribution

The visible strings are locale-owned in [`src/client/locales.ts`](src/client/locales.ts). A deployment with a different identity leaves this package out and composes its own package into the same slot; there is no brand configuration surface here, because occupying the slot is the only composition route.

-----

<a id="understand-the-implementation"></a>
## Understand the implementation

<details>
<summary>Implementation internals — click to expand</summary>

`apply` registers the `brandForge` dictionaries through `ctx.locale.register` as an effect, then occupies `conversation.hero.attribution` and `sidebar.brand.name` inside `ctx.slots.inject`, so the occupants install whether this row activates before or after the declaring packages and withdraw cleanly when declarations collapse. The browser half is [`src/client/index.ts`](src/client/index.ts); the node half is an empty Loader seat.

</details>

-----

<a id="further-exploration"></a>
## Further Exploration

- [ui-conversation](../../client/ui-conversation/README.md) — declares `conversation.hero.attribution` and renders the hero that seats it.
- [ui-brand-official](../../client/ui-brand-official/README.md) — the sibling pattern for the sidebar brand slots.
- [Slots reference](../../../docs/subsystems/slots.md) — how occupants and declarations meet.

-----

<a id="model-experience"></a>
## Model Experience

None, as the package contributes browser presentation only; nothing here reaches a model request.

#### KV Cache effect

None; this package neither assembles nor sends a provider request.

## Known Limitations and Deferred Work

<a id="known-limitations-and-deferred-work"></a>


These limits define how the attribution is supplied. They are current package constraints, not a brand-design comparison or a task backlog.

- **Two occupants** — the package fills `conversation.hero.attribution` and `sidebar.brand.name`; the sidebar mark falls back to the default `FishLogo` icon.
- **No configuration surface** — alternative wording belongs in another package occupying the same slot, not in a config field.

<a id="dev-note"></a>
### Dev Note

<details>
<summary>Working context for maintainers — click to expand</summary>

The package sits under `packages/experimental/`, the repository's home for private packages excluded from official releases, and follows `client-ui-agent-team` in name and layout. Every other `packages/<group>/<pkg>` directory is a release member the workspace constraints require to be publishable, which this deployment identity must not be. The manifest is `private: true` and carries no `publishConfig`.

</details>

**Runtime invariant:** No companion is published. The package retains no mutable state, and its dictionaries and slot occupants install and leave through their own effects.
