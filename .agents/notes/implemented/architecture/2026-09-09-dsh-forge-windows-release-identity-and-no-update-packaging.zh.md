# Agent Note: DSH Forge Windows 发布身份与无更新打包

Status: implemented

[English](2026-09-09-dsh-forge-windows-release-identity-and-no-update-packaging.md) | 中文

## 问题

DSH Forge 的 Windows 桌面发布需要明确的产品身份（“DSH Forge”）、独特的产物文件名、完全禁止自动更新发布与更新元数据生成，并自包含打包所有必需的实验性插件，同时不破坏官方发布管线或引入单独的构建命令。

此前，打包流程假定处于活跃的自动更新环境中（'test' 或 'production'），生成 electron-updater 元数据（'latest.yml'），在用户可见的原生弹窗与产品命名中使用“DeepSeek Harness”，且未将实验性包纳入桌面打包集合，并与官方侧栏品牌包发生冲突。

## 决策

保留 'build:official' 而不创建单独的 'build:forge' 脚本：所有桌面打包流程均使用单一规范的构建管线，保持构建基础设施统一并避免分支分歧。

在 'DSH_DESKTOP_AUTO_UPDATE_ENV' 中支持 'none'，映射到 electron-builder 配置中的 'publish: null'，从发布记录中省略 'publicUrl'，阻止生成 'app-update.yml'，并使 COS 上传命令立即拒绝执行。

在 'package-target.ts' 中导出 'DESKTOP_EXPERIMENTAL_PACK_DIRECTORIES'，以便在打包准备期间将 '@deepseek-ai/dsh-experimental-auto-mode-forge' 和 '@deepseek-ai/dsh-experimental-client-ui-brand-forge' 打包进桌面 seed tarball 集合，补齐桌面宿主覆盖层中所组合实验性插件的打包闭包。

扩展现有的私有 'client-ui-brand-forge' 包，在其客户端入口内直接为 'sidebar.brand.name' 填充本地化的“DSH Forge”文案，并在 'desktop.cordis.patch.yml' 中明确禁用 'ui-brand-official'，避免引入新包或额外组件。

保持所有 Windows 签名提供者代码（'windows-sign.mjs' 和 'windows-sign.cmd'）原样未改，允许通过 'prepare:desktop' 干净地执行签名前诊断验证，无需 SafeNet 硬件 Token 凭据。仓库保留既有的 SafeNet 硬件 Token SignTool 路径；该路径是已经实现的机制，而不是已选定的签名提供者。

在 'prepare-runtime.ts' 中改用同步的 Node 标准库 zip 读取来解压 Windows Node.js 归档，不再使用 'extract-zip'：在 Node 26.2.0 下它对该归档的解压始终不会结束，而对小归档仍然成功。声明的引擎范围仍为 'node ^22.19.0 || >=24'，且没有任何 zip 依赖取而代之：'extract-zip' 已无引用方，也没有其他依赖它的包，因此从 'apps/desktop/package.json' 中移除，并重新生成 'THIRD_PARTY_NOTICES.md' 以删除其直接声明行。完整的传递闭包仍记录在 'pnpm-lock.yaml' 中。

## 考虑过的替代方案

- **单独的 build:forge 脚本**：创建专用的构建脚本会分散构建基础设施，并存在偏离官方发布质检标准的风险。
- **专用的品牌包**：引入单独的包会增加不必要的工作区依赖负担，而现有的私有 'client-ui-brand-forge' 包已承担 Forge 身份槽位填充。
- **单独的 BrandName 组件**：创建额外的组件文件会引入不必要的抽象；直接在客户端入口渲染本地化文本最为极简且完全足够。
- **改用受维护的 zip 依赖**：仓库策略优先选择受维护的依赖而非自行实现，且 '@electron-internal/extract-zip' 是零依赖的直接替代品，在 Node 26.2.0 下约三秒即可解压同一归档，采用它可同时删除自有解析器与其测试所需的归档构造夹具。已否决：该包自述为 Electron 内部工具，不支持外部消费者；而自有解析器已验证在该固定归档的每一个条目上与其输出逐字节一致。
- **修改签名提供者代码**：向签名脚本添加测试旁路分支会危及发布安全性；'prepare:desktop' 可以在不更改提供者契约的前提下完成签名前验证。

## 后果

- **所得**：明确的 DSH Forge 产品身份与产物命名，在 'none' 模式下完全抑制自动更新元数据与上传，补齐实验性插件的打包闭包，并支持离线签名前验证。
- **代价**：'prepare-runtime.ts' 自行承担 zip 解析，而唯一的端到端验证途径是 'prepare:desktop'，因为其单元测试所读取的归档由测试自身构造；Forge 身份仅隔离在桌面覆盖层组合中。

## 待决事项

以下决策属于维护者，且每一项都会阻塞面向公众的 Windows 发布。本次变更均未将其确定。

- **Windows 签名提供者与证书**：尚未选定受信任的公开签名提供者或证书。既有的 SafeNet 硬件 Token SignTool 路径与 'forceCodeSigning' 均保持不变。
- **'DSH_DESKTOP_APP_ID'**：'resolveDesktopAppId' 要求由运维方提供反向域名形式的值，仓库中任何位置都未选定或默认任何 Forge 值。
- **侧栏图标**：禁用 'ui-brand-official' 后 'sidebar.brand.mark' 没有填充者，因此 'SidebarRoot' 会在 DSH Forge 名称旁渲染 DeepSeek 的 'FishLogo' 回退图标。采用 Forge 自有图标还是中性的无图标呈现属于设计决策；本次变更不创作任何图形。
- **浏览器文档标题**：'OFFICIAL_CLIENT_BUILD_ENVIRONMENT' 将 'DSH_CLIENT_TITLE' 固定为“DeepSeek Harness”，且在保留 'build:official' 期间 'assertClientBuildEnvironment' 会拒绝任何其他取值，因此该标题无法通过设置环境变量改变。
