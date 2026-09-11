# Agent Note: DSH Forge contribution policy and English-only root guide

Status: implemented

English | [中文](2026-09-11-forge-contribution-policy.zh.md)

## Problem

The inherited root `CONTRIBUTING.md` reflected upstream DeepSeek Harness policies: it spoke as the DeepSeek team, stated external pull requests were not accepted, directed contributors to GitHub Discussions, and lacked Forge-specific contribution guidance. DSH Forge is an unofficial community fork welcoming focused external contributions, but needed a concise policy that guides contributors through its plugin-first architecture, requires local verification reporting, separates fork work from upstream DeepSeek Harness, and avoids unsupportable response time or SLA commitments while GitHub Issues serve as the intake channel. Under standard repository translation policy, the root `CONTRIBUTING.md` was paired, requiring Chinese translation and pairing metadata that are unnecessary for the fork's English-first root documentation.

## Decision

Exempt `CONTRIBUTING.md` from bilingual translation pairing using the exact-path exclusion mechanism in `scripts/translation-pairing.manifest.json`. Remove the companion `CONTRIBUTING.zh.md` and `CONTRIBUTING.i18n.yaml` files, and update the exclusion lists in `docs/i18n/README.md` and `docs/i18n/README.zh.md`.

Rewrite root `CONTRIBUTING.md` in English only as a concise contribution guide for DSH Forge. The guide establishes that DSH Forge is an unofficial community fork maintained by Tenzy, welcomes focused bug fixes and feature proposals, and uses GitHub Issues for intake without promising response times or release schedules. Documentation fixes, small bug fixes, and new plugins do not require a prior issue, whereas changes touching `agent-loop`, capability seams, session log formats, or core contracts require an issue first. Contributions adhere to the fork's plugin-first preference: configuration or a preset, then an existing plugin, then a new plugin or extension, then a narrowly scoped package change, and only then core behavior. Contributors are required to report local verification rather than relying on unverified CI guarantees. Issues and pull request template translation remains deferred.

All other active documentation outside the root README and root CONTRIBUTING guide continues to follow universal bilingual pairing.

## Alternatives considered

**Retaining the upstream contribution policy.** Leaving the inherited text in place misrepresents the fork as closed to external pull requests and falsely directs contributors to upstream GitHub Discussions.

**Maintaining a bilingual root contribution guide.** Translating the rewritten guide into Chinese would maintain full bilingual pairing at root, but adds ongoing maintenance overhead for an English-first fork whose primary root landing page (`README.md`) is already English-only.

**Requiring an issue for all contributions.** Mandating prior issues for documentation edits, minor bug fixes, and independent plugins introduces unnecessary friction for low-risk contributions.

## Consequences

- The root `CONTRIBUTING.md` is maintained in English only and carries no language switcher.
- `scripts/translation-pairing.manifest.json` excludes `CONTRIBUTING.md`, and the pairing gate rejects companion `.zh.md` or `.i18n.yaml` files for it.
- DSH Forge welcomes external contributions via GitHub Issues and focused pull requests under the plugin-first preference hierarchy.
- Translation of issue templates and pull request templates is explicitly deferred.
- Upstream DeepSeek Harness remains distinct; non-Forge bugs and feature requests are directed upstream.
