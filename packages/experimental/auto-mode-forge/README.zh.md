---
description: "Forge 专用 Auto Mode 批准策略，用于 workspace-write 权限预设下具有重大后果的 PowerShell 命令。"
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-auto-mode-forge

[English](README.md) | 中文

## 概述

此包让 DSH Forge 自动执行常规工作区任务，同时在一小组具有重大后果的 PowerShell 命令执行前询问用户。选择 Forge 的 `Auto Mode` 权限选项即可使用；`Read & Plan` 与 `Full Access` 保持各自现有的内部行为。此策略只为既有批准流程增加风险降低措施，不替代文件系统沙箱，也不授予更宽权限。

## 目录

- [使用此包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [延伸阅读](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延后工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用此包

将此包与 `dsh-permission-presets` 一同挂载；DSH Forge 桌面覆盖层提供生产配置行和三个展示标签。

### 最小配置

```yaml
- name: '@deepseek-ai/dsh-experimental-auto-mode-forge'
```

此插件没有配置字段。当有效预设键为 `workspace-write` 时，它会分类直接的 `pwsh` 命令，并对已识别的高风险操作返回 `ask`；其他调用均委托给下一个 `tools/pre-execute` 监听器。既有批准服务只允许 `allowed-once` 继续执行；拒绝、取消及回答器不可用均以失败关闭。

DSH Forge 权限展示保留既有机器值：`Read & Plan` 对应 `read-only` + `ask`，`Auto Mode` 对应 `workspace-write` + `ask`，`Full Access` 对应 `danger-full-access` + `never`。`Read & Plan` 不会激活 DSH 计划模式。请求从 `workspace-write` 提升到 `danger-full-access` 的调用仍经过既有沙箱提升批准路径。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内部机制 — 点击展开</summary>

插件在 `tools/pre-execute` 阶段从 `ctx.permissionPresets` 读取有效预设。纯分类器检查已解析 `pwsh` 参数中的 `command` 字符串，识别直接的破坏性文件系统与 Git 操作、Git 推送、包发布和明确的机器级变更。匹配时返回带类别原因的 `ask`；没有匹配时调用 `next()`，因此常规 DSH 策略和执行仍是权威路径。

分类器会分隔未被引号包围的 PowerShell 语句，但不是完整的 PowerShell 解析器。此限制使 Forge 规则保持确定性和可审计性，且不创建第二套命令策略框架。

</details>

-----

<a id="further-exploration"></a>
## 延伸阅读

- [权限预设](../../interaction/permission-presets/README.zh.md) — 既有预设键、投影和切换行为。
- [工具执行流水线](../../../docs/tool-execution-pipeline.zh.md) — `tools/pre-execute` 与批准路由。
- [沙箱](../../sandbox/sandbox/README.zh.md) — 文件系统模式和单次提升。
- [Windows ACL 沙箱](../../sandbox/sandbox-windows-acl/README.zh.md) — Windows 部分执行保证的详情。

-----

<a id="model-experience"></a>
## 模型体验

无，因为此包不增加提示词、工具 schema 或结果文本；它只通过既有批准服务路由已识别的调用。

#### KV Cache 影响

无；此包不改变提供方请求。

## 已知限制与延后工作

<a id="known-limitations-and-deferred-work"></a>

这些限制使 Auto Mode 保持为窄范围的 Forge 策略，而不是通用命令授权系统。

- **Windows 部分执行保证** — Windows 沙箱报告部分文件系统执行保证；Auto Mode 是风险降低措施，不是安全保证。
- **仅限文件系统的沙箱词汇** — `SandboxMode` 不管辖一般网络或进程权限。
- **窄范围 PowerShell 识别** — 分类器只覆盖直接且确定的形式；别名、包装器、动态构造和复杂子表达式委托给常规 DSH 行为。
- **提升由人类决定** — 从 `workspace-write` 到 `danger-full-access` 的提升始终保留在既有人工批准流程中。
- **预设标签仅有英文** — 宿主提供的预设名称绕过客户端语言词典，因此 `Read & Plan`、`Auto Mode` 与 `Full Access` 在所有语言下都以英文呈现。`danger-full-access` 的确认文案按机器值取值，因此仍由语言词典拥有。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作上下文 — 点击展开</summary>

无。

</details>

**运行时不变量：** 不发布配套 invariant。此包不保留状态；其唯一监听器是 Cordis 所有的 effect。
