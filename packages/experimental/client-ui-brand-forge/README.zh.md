---
description: "面向会话首屏署名与侧栏品牌名称槽位的 DSH Forge 身份填充，组合进桌面 Forge；供该部署身份的维护者阅读。"
kind: "package-reference"
---

# @deepseek-ai/dsh-experimental-client-ui-brand-forge

[English](README.md) | 中文

## 概述

本包向两个呈现槽位——会话首屏署名（填充 DSH Forge、作者以及基于 DeepSeek Harness 构建的三行声明）与侧栏品牌名称（渲染“DSH Forge”）——提供身份内容。它不占用其他槽位：由于桌面覆盖层禁用了 ui-brand-official，侧栏图标回退为 FishLogo，而首屏标志、标题与 Preview 徽标保持原有渲染。只有桌面组合会插入本插件，Web 产品完全不受影响。本包为仓库内私有包，从不发布，不保留运行时状态，也不向模型请求贡献任何内容。

## 目录

- [使用本包](#use-this-package)
- [理解实现](#understand-the-implementation)
- [进一步探索](#further-exploration)
- [模型体验](#model-experience)
- [已知限制与延期工作](#known-limitations-and-deferred-work)
- [开发备注](#dev-note)

-----

<a id="use-this-package"></a>
## 使用本包

在身份为 DSH Forge 的部署的浏览器插件清单中挂载本插件。`apps/desktop-host/config/desktop.cordis.patch.yml` 处的桌面覆盖层会插入它；其他组合都不会。不挂载它则首屏槽位保持无填充，不渲染任何内容。

### 替换署名

可见文案由 [`src/client/locales.ts`](src/client/locales.ts) 按语言持有。身份不同的部署应不引入本包，而在同一槽位组合自有包；这里没有品牌配置面，因为占用槽位是唯一的组合途径。

-----

<a id="understand-the-implementation"></a>
## 理解实现

<details>
<summary>实现内幕——点击展开</summary>

`apply` 以 effect 形式通过 `ctx.locale.register` 注册 `brandForge` 词典，随后在 `ctx.slots.inject` 内占用 `conversation.hero.attribution` 与 `sidebar.brand.name`，因此无论本行在声明包之前还是之后激活，填充都会安装，并在声明消失时撤出。浏览器半边是 [`src/client/index.ts`](src/client/index.ts)；节点半边是空的 Loader 座位。

</details>

-----

<a id="further-exploration"></a>
## 进一步探索

- [ui-conversation](../../client/ui-conversation/README.zh.md) — 声明 `conversation.hero.attribution` 并渲染承载它的首屏。
- [ui-brand-official](../../client/ui-brand-official/README.zh.md) — 侧栏品牌槽位的同类范式。
- [槽位参考](../../../docs/subsystems/slots.zh.md) — 填充与声明如何相遇。

-----

<a id="model-experience"></a>
## 模型体验

无，因为本包只贡献浏览器呈现；这里没有任何内容进入模型请求。

#### KV 缓存影响

无；本包既不组装也不发送提供方请求。

## 已知限制与延期工作

<a id="known-limitations-and-deferred-work"></a>


这些限制界定署名的供给方式。它们是当前的包约束，不是品牌设计对比，也不是任务待办。

- **两处填充** — 本包填充 `conversation.hero.attribution` 与 `sidebar.brand.name`；侧栏图标回退到默认的 `FishLogo` 标志。
- **没有配置面** — 不同措辞应放进占用同一槽位的另一个包，而不是配置字段。

<a id="dev-note"></a>
### 开发备注

<details>
<summary>维护者工作背景——点击展开</summary>

本包位于 `packages/experimental/`——仓库中不进入正式发布的私有包所在之处——并在命名与布局上沿用 `client-ui-agent-team`。其余每个 `packages/<group>/<pkg>` 目录都是工作区约束要求可发布的发布成员，而这一部署身份不应如此。清单为 `private: true`，且不带 `publishConfig`。

</details>

**运行时不变量：** 不发布伴生物。本包不保留可变状态，其词典与槽位填充通过各自的 effect 安装与撤出。
