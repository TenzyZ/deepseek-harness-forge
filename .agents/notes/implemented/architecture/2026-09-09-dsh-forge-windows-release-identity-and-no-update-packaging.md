# Agent Note: DSH Forge Windows release identity and no-update packaging

Status: implemented

English | [中文](2026-09-09-dsh-forge-windows-release-identity-and-no-update-packaging.zh.md)

## Problem

The Windows desktop release of DSH Forge requires an explicit product identity ("DSH Forge"), distinct artifact filenames, complete suppression of auto-update publication and updater metadata, and self-contained packaging of all required experimental plugins without breaking official release pipelines or introducing separate build commands.

Previously, packaging assumed an active auto-update environment ('test' or 'production'), emitted electron-updater metadata ('latest.yml'), used 'DeepSeek Harness' in user-visible native dialogs and product naming, omitted experimental packages from the packed desktop package set, and conflicted with the official sidebar branding package.

## Decision

Retain 'build:official' without creating a separate 'build:forge' script: all desktop packaging flows use the single canonical build pipeline, keeping build infrastructure unified and preventing fork divergence.

Support 'none' in 'DSH_DESKTOP_AUTO_UPDATE_ENV', mapping to 'publish: null' in electron-builder configuration, omitting 'publicUrl' from the release record, preventing 'app-update.yml' generation, and causing COS upload commands to reject execution immediately.

Export 'DESKTOP_EXPERIMENTAL_PACK_DIRECTORIES' in 'package-target.ts' to pack '@deepseek-ai/dsh-experimental-auto-mode-forge' and '@deepseek-ai/dsh-experimental-client-ui-brand-forge' into the desktop seed tarball set during packaging preparation, closing the packaging gap for experimental plugins composed into the desktop host overlay.

Extend the existing private 'client-ui-brand-forge' package to occupy 'sidebar.brand.name' with localized 'DSH Forge' copy directly within its client entry, and explicitly disable 'ui-brand-official' in 'desktop.cordis.patch.yml', avoiding new packages or components.

Leave all Windows signing provider code ('windows-sign.mjs' and 'windows-sign.cmd') untouched, allowing pre-sign diagnostic verification to run cleanly via 'prepare:desktop' without requiring SafeNet hardware token credentials. The repository keeps its existing SafeNet hardware-token SignTool path; that path is the mechanism already implemented, not a chosen provider.

Extract the Windows Node.js archive in 'prepare-runtime.ts' through synchronous Node standard library zip reading rather than 'extract-zip', whose extraction never settles on that archive under Node 26.2.0 while it still succeeds on small archives. The declared engine range stays 'node ^22.19.0 || >=24' and no zip dependency replaces it: 'extract-zip' had no remaining importer and no other dependent, so it is removed from 'apps/desktop/package.json', and 'THIRD_PARTY_NOTICES.md' is regenerated to drop its directly-declared row. The transitive closure stays recorded in 'pnpm-lock.yaml'.

## Alternatives considered

- **Separate build:forge script**: Creating a dedicated build script fragments build infrastructure and risks divergence from official release qualification.
- **Dedicated brand package**: Introducing a separate package adds unnecessary dependency overhead when the existing private 'client-ui-brand-forge' package already occupies Forge identity slots.
- **Separate BrandName component**: Creating an additional component file adds unnecessary abstraction; rendering localized text directly from the client entry is minimal and sufficient.
- **Maintained zip dependency**: Repository policy prefers maintained dependencies over hand-rolling, and '@electron-internal/extract-zip' is a zero-dependency drop-in that extracts the same archive in about three seconds under Node 26.2.0, so adopting it would delete both the owned parser and the archive-building fixture its tests need. Rejected: that package describes itself as internal Electron tooling and is unsupported for external consumers, while the owned extractor is verified byte-identical to it across every entry of the pinned archive.
- **Modifying signing provider code**: Adding test-bypass branches to signing scripts risks release security; 'prepare:desktop' allows verification before signing without altering provider contracts.

## Consequences

- **Bought**: Unambiguous DSH Forge identity and artifact naming, complete suppression of auto-update metadata and uploads under 'none', self-contained packaging closure for experimental plugins, and offline pre-sign verification.
- **Cost**: 'prepare-runtime.ts' owns zip parsing whose only end-to-end exercise is 'prepare:desktop', because its unit tests build the archives they read; Forge identity remains isolated to desktop overlay composition.

## Deferred

These decisions belong to the maintainer, and each one blocks a public Windows release. None is settled here.

- **Windows signing provider and certificate**: no trusted public provider or certificate is selected. The existing SafeNet hardware-token SignTool path and 'forceCodeSigning' are unchanged.
- **'DSH_DESKTOP_APP_ID'**: 'resolveDesktopAppId' requires an operator-supplied reverse-DNS value, and no Forge value is chosen or defaulted anywhere in the repository.
- **Sidebar mark**: with 'ui-brand-official' disabled, 'sidebar.brand.mark' has no occupant, so 'SidebarRoot' renders the DeepSeek 'FishLogo' fallback beside the DSH Forge name. A Forge mark or a neutral no-mark presentation is a design decision; this change invents no artwork.
- **Browser document title**: 'OFFICIAL_CLIENT_BUILD_ENVIRONMENT' pins 'DSH_CLIENT_TITLE' to 'DeepSeek Harness' and 'assertClientBuildEnvironment' rejects any other value while 'build:official' is retained, so the title is not reachable by setting the variable.
