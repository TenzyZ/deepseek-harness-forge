# Agent Note: Per-model reasoning declarations in Models settings

Status: implemented

English | [中文](2026-09-09-pi-ai-reasoning-effort-ui.zh.md)

## Problem

Custom pi-ai models need declared reasoning capabilities before the composer can offer effort choices. The provider form must preserve provider-specific wire values and model fields it does not edit.

## Decision

The per-model disclosure edits the existing `reasoningEfforts` field. Choices come from the pi-ai settings schema. Omission inherits catalog capability, `false` disables it, and a custom dictionary names supported levels and wire values. Only `off` permits a null value. Model edits preserve unrelated fields and use the existing array replacement and reset operations.

## Alternatives considered

**Provider-wide effort control:** models on one route can support different levels. Capability declarations belong to individual models; selection remains in the composer.

**Provider discovery:** automatic metadata discovery requires separate provider evidence and remains deferred. A UI declaration does not assert that an endpoint supports it.

## Consequences

The settings UI uses the existing adapter projection and request dispatch without another public API or enum. Component tests cover declaration, wire values, removal, reset, and preservation. The declared-reasoning browser scenario configures the levels through the real settings UI and checks persistence and composer options without a model call.
