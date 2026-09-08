# Agent Note: Quiesce watchers with their settings registration

Status: implemented

English | [中文](2026-09-08-settings-registration-watcher-quiescence.zh.md)

## Problem

A settings registration could be removed while one of its watcher callbacks was still running. A second invocation already queued on the same watcher could then start after the registrant fiber had disposed, and the fiber's disposal did not wait for either invocation.

## Decision

The registration effect synchronously marks every owned watcher inactive, clears the watcher set, and removes the namespace registration. Its async disposer then awaits the watchers' existing serialized tails. Already-started callbacks can settle, while queued callbacks reach the existing activity check and skip. Cordis awaits the async effect disposer before the registrant fiber finishes disposal.

The settings service retains its broader shutdown drain. Registration disposal uses the same watcher `active` and `tail` state at the narrower owner that created the callbacks; it adds no public API, configuration, or lifecycle controller.

## Alternatives considered

**Rely only on settings-service shutdown.** Service shutdown drains watcher work when the provider unloads, but a registrant fiber can unload while the provider remains active. That leaves the callback outside its actual owner's lifetime.

**Add a watcher controller or separate registry.** Each watcher already has the deactivation flag and settlement promise needed for quiescence, and the registration effect already owns the complete set. Another lifecycle object would duplicate that state.

## Consequences

Disposing a registrant may wait for its already-running watcher callbacks. It prevents queued watcher callbacks from starting after deactivation and makes the namespace available for re-registration before the running callbacks settle. The focused [settings lifecycle test](../../../../packages/settings/settings/tests/settings.spec.ts) holds one callback open, queues another invocation, and proves disposal waits while the queued invocation stays silent.
