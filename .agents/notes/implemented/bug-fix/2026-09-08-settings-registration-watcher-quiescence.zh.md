# Agent Note: 设置注册与其 watcher 一同完全停稳

Status: implemented

[English](2026-09-08-settings-registration-watcher-quiescence.md) | 中文

## Problem

设置注册可能在其 watcher 回调仍在运行时被移除。同一 watcher 上已排队的第二次调用随后可能在注册方 fiber 完成 dispose 后启动，而 fiber 的 dispose 不会等待任何一次调用。

## Decision

注册 effect 会同步将所有归属它的 watcher 标记为非活动、清空 watcher 集合并移除 namespace 注册。它的异步 disposer 随后等待这些 watcher 现有的串行 tail。已启动的回调可以完成，已排队的回调则在现有活动性检查处跳过。Cordis 会在注册方 fiber 完成 dispose 前等待该异步 effect disposer。

设置服务保留范围更广的关闭排干。注册 dispose 在创建回调的更窄 owner 上复用相同的 watcher `active` 与 `tail` 状态；它不添加公开 API、配置或生命周期控制器。

## Alternatives considered

**仅依赖设置服务关闭。** 提供方卸载时，服务关闭会排干 watcher 工作；但提供方保持活动时，注册方 fiber 也可以卸载。这会使回调超出其实际 owner 的存活期。

**添加 watcher 控制器或独立注册表。** 每个 watcher 已有完全停稳所需的停用标志与结算 promise，注册 effect 也已拥有完整集合。另一个生命周期对象会重复该状态。

## Consequences

dispose 注册方时可能需要等待其已在运行的 watcher 回调。这会防止已排队的 watcher 回调在停用后启动，并在运行中的回调完成前使 namespace 可以重新注册。聚焦的[设置生命周期测试](../../../../packages/settings/settings/tests/settings.spec.ts)会暂停一个回调、排队另一次调用，并证明 dispose 会等待，而已排队的调用保持静默。
