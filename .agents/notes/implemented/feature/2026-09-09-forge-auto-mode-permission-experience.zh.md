# Agent Note: Forge Auto Mode 权限体验

Status: implemented

[English](2026-09-09-forge-auto-mode-permission-experience.md) | 中文

## Problem

DSH Forge 需要三选项权限体验，在不改变稳定沙箱与批准值的前提下区分常规工作区自动化和无限制执行。既有 `workspace-write` 预设允许项目工作无需提示，但面向文件系统的沙箱本身不会在具有重大后果的网络、仓库发布或机器级命令前询问用户。

## Decision

Forge 桌面组合将既有键展示为 `Read & Plan`、`Auto Mode` 和 `Full Access`。其组合仍为 `read-only` + `ask`、`workspace-write` + `ask` 和 `danger-full-access` + `never`。`Read & Plan` 不会激活计划模式，Full Access 则保留以 `danger-full-access` 为键的既有确认界面。

`@deepseek-ai/dsh-experimental-auto-mode-forge` 仅在有效预设为 `workspace-write` 时监听 `tools/pre-execute`。确定性分类器通过既有批准服务，对涵盖递归强制删除、破坏性 Git 操作、Git 推送、包发布和明确系统变更的直接 PowerShell 形式发起询问。常规和未识别调用委托给剩余工具流水线。只有 `allowed-once` 继续执行；拒绝、取消及回答器不可用保留批准服务的失败关闭行为。

插件不批准沙箱提升。请求 `danger-full-access` 的调用会继续进入既有 PowerShell 提升路径，并要求单独的一次性人工决定。

## Alternatives considered

**增加 `auto` 预设键或批准策略。** 这会创建第四个持久值、迁移与重放工作和新的 UI 管道，同时重复既有 `workspace-write` + `ask` 组合。

**自动授予 `danger-full-access`。** 此授权会在完整调用期间移除文件约束，而 Windows 约束仍然是部分的。既有人工批准继续拥有此决定。

**构建通用命令解析器或模型审查器。** 广泛规则引擎或付费推理路径会增加另一套授权框架。Forge 需求只需要对一小组直接命令进行确定性识别。

**修改通用权限或工具代码。** 主机提供的预设名称和 `tools/pre-execute` 已提供展示与策略扩展点，因此修改通用源代码只会扩大影响，而不会增加能力。

## Verification

包测试通过真实 Cordis Loader 组合加载插件、权限服务、批准服务和工具运行时。测试固定常规委托、每种批准结果、单次授权、不受影响的非 Auto 预设，以及沙箱提升委托。已交付层组合断言固定三个键、标签、组合和唯一 Forge 插件行；既有 PowerShell 提升与 Full Access 确认测试继续作为下游回归所有者。

## Consequences

Forge 用户获得常规自动工作区操作，并在一小组可审计的重大命令前经过人工检查点，同时无需改变会话事件格式或通用权限语义。既有 `permission/preset: workspace-write` 事件继续有效。

分类器刻意保持不完整，并将未识别语法默认交给常规 DSH 行为。Windows 沙箱执行保证仍为部分，且 `SandboxMode` 不管辖一般网络或进程效果，因此 Auto Mode 只降低风险，不构成安全保证。
