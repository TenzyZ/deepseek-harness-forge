# Agent Note: DSH Forge 贡献政策与纯英文根目录指南

Status: implemented

[English](2026-09-11-forge-contribution-policy.md) | 中文

## Problem

继承自上游的根目录 `CONTRIBUTING.md` 反映的是 DeepSeek Harness 的政策：它以 DeepSeek 团队的口吻发声、声明不接受外部 PR、引导贡献者前往 GitHub Discussions，且缺乏 Forge 特有的贡献路径。DSH Forge 是一个欢迎聚焦的外部贡献的非官方社区 fork，但需要一份简洁的政策，以指导贡献者遵循其插件优先的架构、要求报告本地验证情况、将 fork 工作与上游 DeepSeek Harness 明确区分，并在以 GitHub Issues 作为接收渠道的同时避免作出无法保证的响应时间或 SLA 承诺。在标准仓库翻译政策下，根目录 `CONTRIBUTING.md` 原属配对文档，需要中文翻译与配对元数据，这对于 fork 的英文优先根目录文档是不必要的。

## Decision

通过 `scripts/translation-pairing.manifest.json` 中的精确路径排除机制将 `CONTRIBUTING.md` 从双语翻译配对中排除。删除附属的 `CONTRIBUTING.zh.md` 与 `CONTRIBUTING.i18n.yaml` 文件，并更新 `docs/i18n/README.md` 与 `docs/i18n/README.zh.md` 中的排除列表。

将根目录 `CONTRIBUTING.md` 以纯英文重写为 DSH Forge 的简洁贡献指南。该指南确立 DSH Forge 是由 Tenzy 维护的非官方社区 fork，欢迎聚焦的 bug 修复与功能提案，并使用 GitHub Issues 作为接收渠道，同时不保证响应时间或发布周期。文档修复、小型 bug 修复和新插件无需提前提 issue，而涉及 `agent-loop`、能力接缝、会话日志格式或核心约定的变更必须提前开 issue 讨论。贡献应遵循 fork 的插件优先层级：配置或 preset，然后是既有插件，接着是新插件或扩展，再到窄范围的 package 变更，最后在必要时才改动核心行为。贡献者须报告本地验证情况，而非依赖未经确认的 CI 保证。Issue 与 PR 模板的翻译保持显式推迟。

根目录 README 与根目录 CONTRIBUTING 指南之外的所有活跃文档继续遵循通用的双语配对政策。

## Alternatives considered

**保留上游贡献政策。** 保留继承的文本会错误地表明本 fork 不接受外部 PR，并错误地将贡献者引导至上游 GitHub Discussions。

**维护双语根目录贡献指南。** 将重写后的指南翻译为中文可以在根目录保持完整的双语配对，但这会为英文优先且根目录主落地页（`README.md`）已为纯英文的 fork 带来持续的维护负担。

**对所有贡献均强制要求提前开 issue。** 对文档修改、小 bug 修复和独立插件强制要求提前开 issue 会为低风险贡献带来不必要的阻碍。

## Consequences

- 根目录 `CONTRIBUTING.md` 仅以英文维护，不携带语言切换链接。
- `scripts/translation-pairing.manifest.json` 排除 `CONTRIBUTING.md`，配对门禁会拒绝其对应的 `.zh.md` 或 `.i18n.yaml` 文件。
- DSH Forge 欢迎通过 GitHub Issues 和聚焦的 PR 提交外部贡献，并遵循插件优先的层级偏好。
- Issue 模板与 PR 模板的翻译被显式推迟。
- 上游 DeepSeek Harness 保持独立；非 Forge 特有的 bug 和功能需求仍引导至上游。
