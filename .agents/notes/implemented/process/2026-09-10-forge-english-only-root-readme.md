# Agent Note: English-only root README for DSH Forge

Status: implemented

English | [中文](2026-09-10-forge-english-only-root-readme.zh.md)

## Problem

The fork root README still represents upstream DeepSeek Harness identity and links to upstream documentation, while DSH Forge requires a distinct English-only product page that accurately introduces the fork, documents shipped Forge enhancements, and presents the packaged Windows x64 Desktop installer as the primary installation path. Under repository translation policy, the root README was paired, requiring Chinese translation and pairing metadata that are unnecessary for the fork's current audience.

## Decision

Exempt `README.md` from bilingual translation pairing using the existing exact-path exclusion mechanism in `scripts/translation-pairing.manifest.json`. Remove the companion `README.zh.md` and `README.i18n.yaml` files, and update the exclusion list in `docs/i18n/README.md` and `docs/i18n/README.zh.md`.

Rewrite the root `README.md` in English only as a user-facing landing page for DSH Forge. The page embeds the DSH Forge hero artwork (`dsh-forge-hero.png`), presents the fork's identity as an unofficial community fork by Tenzy built on DeepSeek Harness, and establishes the packaged Windows x64 Desktop installer as the primary installation experience (requiring no Node.js, Git, or pnpm runtime setup for ordinary users). Natural Markdown headings `## Run` and `### Run from source` preserve the inbound `#run` and `#run-from-source` anchors, with source build steps retained exclusively for developers under the secondary advanced path. Inbound links from Chinese documentation that previously targeted `README.zh.md` are updated to target `README.md`.

Every other documentation surface remains subject to the standard bilingual pairing policy.

## Alternatives considered

**Retaining a translated Forge root README.** Translating the rewritten Forge README into Chinese would maintain full bilingual coverage at the root, but requires ongoing maintenance overhead for a fork targeting English documentation first.

**Inventing a new translation-manifest mechanism.** Adding a new schema or configuration flag to handle the fork's README would unnecessarily modify the translation verification system. The existing `excluded` list in `scripts/translation-pairing.manifest.json` already supports exact file exclusions.

**Editing only English while keeping the old pair.** Leaving the existing `README.zh.md` and `README.i18n.yaml` in place while rewriting English would violate pair consistency rules or preserve contradictory upstream information in the Chinese counterpart.

## Consequences

- The root `README.md` is maintained in English only and carries no language switcher.
- `scripts/translation-pairing.manifest.json` explicitly excludes `README.md`, and the pairing gate rejects companion `.zh.md` or `.i18n.yaml` files for it.
- Bilingual documentation pages linking to the root README target `README.md` directly.
- Non-root documentation throughout the repository continues to follow the universal bilingual pairing contract.
- Future upstream README merges will conflict and require deliberate reconciliation against Forge identity.
