# Agent Note: 通过首屏槽位呈现桌面部署署名

Status: implemented

[English](2026-09-08-desktop-deployment-hero-attribution.md) | 中文

## Problem

以自有产品身份分发 Harness Web 客户端的部署，没有地方说明这一点。`ui-sidebar` 与 `ui-conversation` 声明了品牌标志槽位，但它们承载的都是标志，而非部署自身的名称、作者以及与上游项目的关系。把这些文字写进 `ui-conversation`，等于把某一个部署的身份放进所有部署都会加载的包里，而 Web 产品必须保持现有首屏不变。

桌面应用把这一需求变得具体：它是构建在 DeepSeek Harness 之上、另行命名的产品，而其品牌规范要求生态项目如实陈述这一关系，而不是复用上游名称或标志。

## Decision

`ui-conversation` 新增一个首屏子槽位 `conversation.hero.attribution`（`single`、`root` 作用域），并在标题下方已有的首屏 body 元素中渲染它。该槽位不带 owner props，也没有回退：无填充时不渲染任何内容，因此没有填充者的组合产出的首屏与原先完全一致。标题、Preview 徽标、首屏标志及其回退鱼形、侧栏品牌槽位均未改动。

`@deepseek-ai/dsh-experimental-client-ui-brand-forge` 为桌面产品占用该槽位。它通过 `ctx.locale.register` 注册自有的 `brandForge` 词典，并在 `ctx.slots.inject` 内占用槽位，因此无论它在声明者之前还是之后激活都会安装，并在声明消失时撤出。它的三行分别是产品名称、作者以及上游关系，各自独立成键，因此任何翻译都无法把作者行并入关系行，从而暗示作者写了 DeepSeek Harness。

只有 `apps/desktop-host/config/desktop.cordis.patch.yml` 插入该行。Web 包不组合任何填充者，因此 `pnpm dsh web` 将该槽位渲染为空。

本包位于 `packages/experimental/`，并按该目录命名。其余每个 `packages/<group>/<pkg>` 目录都是发布成员，`check-workspace-constraints` 要求其可发布——禁止 `private`、`publishConfig.access` 须为 public、须有仓库元数据。部署身份不应以上游作用域发布到 npm，而 `packages/experimental/` 是仓库中唯一允许工作区包设为 `private: true`、省略 `publishConfig` 并排除在发布之外的位置。`client-ui-agent-team` 是其命名与布局范式。

## Alternatives considered

**把 Forge 文案放进 `ui-conversation`。** 某一个部署的名称、作者与上游行将随所有部署都会加载的包一同分发，而 Web 首屏还需要一个构建期开关来隐藏它。槽位让通用包不含任何部署的身份。

**复用 `conversation.hero.brand.mark` 或侧栏品牌槽位。** 它们承载的是标题行内与侧栏导轨上的标志；两者都无法容纳三行文本块，而占用侧栏是替换上游自身的构建身份，而非增加部署自身的身份。

**放在 `packages/client/` 下的可发布客户端包。** 这与同类的 `ui-brand-official` 布局一致，但工作区约束将要求把一个部署专属的身份包以上游作用域发布到 npm。实验目录保留了同样的客户端插件结构而无此后果。

**为该目录放宽发布成员规则。** 为单个包开设约束豁免，是用一条仓库级不变量换取一处放置便利，而现有的私有目录已经提供了该便利。

**品牌配置字段。** 槽位占用是客户端栈既有的组合途径；配置面会新增第二条供给呈现的路径，且仍需一个组件来渲染它。

## Consequences

部署通过把一个包组合进单个槽位来陈述自身身份，而 Web 产品不受影响，因为该槽位在那里无填充。通用声明可复用：另一个部署提供自己的填充者，而不必修改 `ui-conversation`。

本包因私有且实验性而不出现在 npm 发布中；因此其名称带有 `dsh-experimental-` 前缀，而非其角色所暗示的 `dsh-client-` 前缀。桌面窗口标题、应用图标、侧栏品牌、上手引导与打包均在本决策之外，保持不变。

`ui-conversation` 的首屏测试断言该槽位已声明并被分发，且在无填充时首屏恰好只渲染标题与徽标；填充者自身的测试覆盖词典注册、与声明顺序无关的占用、拆除、渲染出的三行文本，以及任何语言都不会把 DeepSeek Harness 归于作者。
