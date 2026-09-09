# Agent Note: 模型设置中的逐模型推理声明

Status: implemented

[English](2026-09-09-pi-ai-reasoning-effort-ui.md) | 中文

## Problem

自定义 pi-ai 模型需要声明推理能力，composer（输入区）才能提供等级选项。提供方表单必须保留提供商特定的请求值以及它不编辑的模型字段。

## Decision

逐模型折叠区编辑现有的 `reasoningEfforts` 字段。选项来自 pi-ai 设置 schema。省略表示继承目录能力，`false` 表示禁用，自定义字典则指定支持的等级和请求值。只有 `off` 允许 null 值。模型编辑保留无关字段，并使用现有的数组替换和重置操作。

## Alternatives considered

**提供方级等级控件：**同一路由上的模型可能支持不同等级。能力声明属于各个模型；等级选择仍由 composer 提供。

**提供商发现：**自动元数据发现需要独立的提供商证据，仍属延期工作。UI 声明不保证端点支持该能力。

## Consequences

设置 UI 使用现有的适配器投影和请求分派，不增加公共 API 或枚举。组件测试覆盖声明、请求值、移除、重置和字段保留。declared-reasoning 浏览器场景通过真实设置 UI 配置等级，并在不调用模型的情况下检查持久化和 composer 选项。
