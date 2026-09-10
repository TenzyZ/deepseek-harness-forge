# Agent Note: DSH Forge 纯英文根目录 README

Status: implemented

[English](2026-09-10-forge-english-only-root-readme.md) | 中文

## Problem

Fork 根目录 README 仍代表上游 DeepSeek Harness 的身份并链接到上游文档，而 DSH Forge 需要一个独特的纯英文产品页面，以准确介绍 fork 本身、记录已交付的 Forge 增强功能，并将打包好的 Windows x64 桌面安装包作为主要安装途径。在仓库翻译政策下，根目录 README 原本属于配对文档，需要中文翻译和配对元数据，这对于 fork 当前的目标受众而言是不必要的。

## Decision

通过 `scripts/translation-pairing.manifest.json` 中既有的精确路径排除机制将 `README.md` 从双语翻译配对中排除。删除附属的 `README.zh.md` 与 `README.i18n.yaml` 文件，并更新 `docs/i18n/README.md` 与 `docs/i18n/README.zh.md` 中的排除列表。

将根目录 `README.md` 以纯英文重写为面向用户的 DSH Forge 落地页。该页面嵌入了 DSH Forge 题图资源（`dsh-forge-hero.png`），将 fork 身份明确表述为 Tenzy 基于 DeepSeek Harness 构建的非官方社区 fork，并将打包好的 Windows x64 桌面应用程序作为主要安装体验（普通用户无需安装 Node.js、Git 或 pnpm 运行环境）。通过自然的 Markdown 标题 `## Run` 与 `### Run from source` 保留 `#run` 与 `#run-from-source` 入站锚点，源码构建步骤仅在次要的高级路径下为开发者保留。先前指向 `README.zh.md` 的中文文档入站链接均更新为指向 `README.md`。

仓库中的其余文档仍遵循通用的双语配对政策。

## Alternatives considered

**保留翻译后的 Forge 根目录 README。** 将重写后的 Forge README 翻译成中文可以在根目录保持完整的双语覆盖，但这会为优先面向英文文档的 fork 带来持续的维护负担。

**发明新的翻译清单机制。** 为处理 fork 的 README 而增加新的 schema 或配置标识会不必要地修改翻译验证系统。`scripts/translation-pairing.manifest.json` 中既有的 `excluded` 列表已支持精确文件排除。

**仅编辑英文并保留旧配对。** 在重写英文的同时保留现有的 `README.zh.md` 和 `README.i18n.yaml` 会违反配对一致性规则，或在中文对侧中保留相互矛盾的上游信息。

## Consequences

- 根目录 `README.md` 仅以英文维护，不携带语言切换链接。
- `scripts/translation-pairing.manifest.json` 显式排除 `README.md`，配对门禁会拒绝其对应的 `.zh.md` 或 `.i18n.yaml` 文件。
- 链接到根目录 README 的双语文档页面直接指向 `README.md`。
- 仓库内除根目录 README 外的文档继续遵循通用的双语配对约定。
- 未来的上游 README 合并将会产生冲突，需要对照 Forge 身份进行针对性协调。
