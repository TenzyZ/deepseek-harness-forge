# Agent Note: DSH Forge Windows local-test signing

Status: implemented

English | [中文](2026-09-10-dsh-forge-windows-local-test-signing.zh.md)

## Problem

Windows Desktop packaging requires code signing, but the production path requires a SafeNet/eToken hardware identity that local DSH Forge operators do not possess. The repository needs a real local signature path without weakening production signing or handling exportable private-key material.

## Evidence

`electron-builder.config.mjs` always selected `createWindowsTokenSigner` for Windows, and `package-target.ts` forwarded only the four SafeNet inputs to electron-builder. The token signer already owned strict certificate and SignTool validation, SHA-256 enforcement, child-environment scrubbing, PIN redaction, dangling Authenticode-directory repair, and NSIS bootstrap signing.

## Decision

`DSH_DESKTOP_WINDOWS_SIGNING_ENV` selects one of two concrete signers. An unset value or exact `production` selects the existing SafeNet signer; exact `local-test` selects the local certificate-store signer; every other value fails. Each mode rejects inputs owned by the other mode, so neither can fall back to the other.

Production keeps `forceCodeSigning`, SHA-256-only signing, the NSIS target and bootstrap hook, certificate validation, token identity validation, PIN redaction, the CRLF `windows-sign.cmd`, and its existing SignTool command.

Local-test requires `DSH_DESKTOP_WINDOWS_TEST_CERT_SHA1` as exactly 40 hexadecimal characters and reuses the validated `DSH_DESKTOP_WINDOWS_SIGNTOOL`. It calls SignTool directly with `/sha1`, the fixed current-user `My` store, `/fd sha256`, optional `/as` only for nested signing, and the target file. It supplies no `/f`, `/kc`, `/csp`, or timestamp argument.

`package-target.ts` removes every `DSH_DESKTOP_WINDOWS_*` field from build and preparation children, then restores only the six approved production, selector, and local-test names for electron-builder. `prepare:desktop` returns before electron-builder and remains credential-free.

## Local-test security properties

The local-test signer reuses the production child-environment scrubber and Authenticode-directory repair. Repository code selects the certificate by public thumbprint and never loads, reads, exports, or commits its private key. The implementation does not modify a certificate trust store, and local-test signatures are intentionally not timestamped or publicly trusted.

## Non-goals

This decision does not create or trust a certificate, package or install an application, add unsigned packaging, qualify release signing, alter macOS signing or updates, or add a general signing-provider system.

## Alternatives considered

**PFX through electron-builder's built-in signing inputs.** This would introduce an exportable private-key file and password path that the local certificate store does not require, and it would bypass the existing custom signing hook and NSIS bootstrap repair path.

**A general signing-provider abstraction.** Two fixed environments need only one small dispatcher. A registry, class hierarchy, or third provider concept adds ownership and extension points without a present requirement.

## Consequences

Local operators can produce an Authenticode-signed test installer after they create a dedicated Code Signing certificate in `Cert:\CurrentUser\My`. Human verification must match the installer signer subject and thumbprint to that certificate and confirm that the certificate is absent from Trusted Root stores. Public release signing still requires a separately qualified trusted identity.
