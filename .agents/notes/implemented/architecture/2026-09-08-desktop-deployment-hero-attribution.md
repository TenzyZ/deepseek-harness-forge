# Agent Note: Desktop deployment attribution through a hero slot

Status: implemented

English | [中文](2026-09-08-desktop-deployment-hero-attribution.zh.md)

## Problem

A deployment that ships the Harness Web client under its own product identity has nowhere to say so. `ui-sidebar` and `ui-conversation` declare brand-mark slots, but every one of them carries a mark, not the deployment's name, author, and relationship to the upstream project. Writing that text into `ui-conversation` would put one deployment's identity in the package every deployment loads, and the Web product must keep the hero it has.

The desktop application is where the need is concrete: it is a separately named product built on DeepSeek Harness, and its brand guidelines ask ecosystem projects to state that relationship truthfully rather than reuse the upstream name or marks.

## Decision

`ui-conversation` declares one more hero child, `conversation.hero.attribution` (`single`, `root` scope), and renders it in the hero body element that already sits below the headline. The slot carries no owner props and no fallback: unoccupied, it renders nothing, so a composition without an occupant produces the hero unchanged. The headline, the Preview badge, the hero mark and its fallback fish, and the sidebar brand slots are untouched.

`@deepseek-ai/dsh-experimental-client-ui-brand-forge` occupies that slot for the desktop product. It registers its own `brandForge` dictionaries through `ctx.locale.register` and occupies the slot inside `ctx.slots.inject`, so the occupant installs whether it activates before or after the declarer and withdraws when the declaration collapses. Its three lines are the product name, its author, and the upstream relationship, each a separate locale key so no translation can merge the author line into the relationship line and imply the author wrote DeepSeek Harness.

Only `apps/desktop-host/config/desktop.cordis.patch.yml` inserts the row. The Web bundle composes no occupant, so `pnpm dsh web` renders the slot as nothing.

The package lives under `packages/experimental/` and is named for that directory. Every other `packages/<group>/<pkg>` directory is a release member that `check-workspace-constraints` requires to be publishable — `private` forbidden, `publishConfig.access` public, repository metadata present. A deployment identity must not be published to npm under the upstream scope, and `packages/experimental/` is the repository's only location where a workspace package is `private: true`, omits `publishConfig`, and stays out of releases. `client-ui-agent-team` is the naming and layout precedent.

## Alternatives considered

**Forge copy inside `ui-conversation`.** One deployment's name, author, and upstream line would ship in the package every deployment loads, and the Web hero would need a build-time gate to hide it. The slot keeps the generic package free of any deployment's identity.

**Reusing `conversation.hero.brand.mark` or the sidebar brand slots.** Those hold a mark inside the headline row and the sidebar rail; neither can seat a three-line block, and occupying the sidebar would replace upstream's own build identity rather than add the deployment's.

**A publishable client package under `packages/client/`.** It matches the sibling `ui-brand-official` layout, but the workspace constraints would require publishing a deployment-specific identity package to npm under the upstream scope. The experimental directory keeps the same client-plugin structure without that.

**Relaxing the release-member rule for this directory.** A constraint exemption for one package trades a repository-wide invariant for a placement convenience the existing private directory already provides.

**A brand configuration field.** Slot occupancy is the composition route the client stack already has; a config surface would add a second way to supply presentation and still need a component to render it.

## Consequences

A deployment states its identity by composing a package into one slot, and the Web product is unaffected because the slot is unoccupied there. The generic declaration is reusable: another deployment supplies its own occupant rather than editing `ui-conversation`.

The package is invisible to the npm release because it is private and experimental; its name therefore carries the `dsh-experimental-` prefix rather than the `dsh-client-` prefix its role suggests. The desktop window title, application icon, sidebar brand, onboarding, and packaging are outside this decision and unchanged.

`ui-conversation`'s hero test asserts the slot is declared and dispatched and that the hero renders exactly the headline and badge while it is unoccupied; the occupant's own tests cover dictionary registration, declaration-order-independent occupancy, teardown, the exact three rendered lines, and that no locale attributes DeepSeek Harness to the author.
