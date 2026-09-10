# Agent Note: DSH Forge Windows 本地测试签名

Status: implemented

[English](2026-09-10-dsh-forge-windows-local-test-signing.md) | 中文

## 问题

Windows Desktop 打包要求代码签名，但生产路径需要本地 DSH Forge 操作方并不持有的 SafeNet/eToken 硬件身份。仓库需要一条真实的本地签名路径，同时不能削弱生产签名或处理可导出的私钥材料。

## 证据

`electron-builder.config.mjs` 始终为 Windows 选择 `createWindowsTokenSigner`，而 `package-target.ts` 只向 electron-builder 传递四个 SafeNet 输入。Token 签名器已经负责严格的证书和 SignTool 校验、SHA-256 强制要求、子进程环境清理、PIN 遮盖、悬空 Authenticode 目录修复和 NSIS bootstrap 签名。

## 决策

`DSH_DESKTOP_WINDOWS_SIGNING_ENV` 从两个具体签名器中选择一个。未设置的值或准确的 `production` 选择现有 SafeNet 签名器；准确的 `local-test` 选择本地证书存储签名器；其他所有值都会失败。每个模式都拒绝属于另一模式的输入，因此两者都不能回退到另一模式。

生产模式保留 `forceCodeSigning`、仅限 SHA-256 的签名、NSIS 目标与 bootstrap hook、证书校验、Token 身份校验、PIN 遮盖、采用 CRLF 的 `windows-sign.cmd` 及其现有 SignTool 命令。

本地测试模式要求 `DSH_DESKTOP_WINDOWS_TEST_CERT_SHA1` 准确包含 40 个十六进制字符，并复用经过校验的 `DSH_DESKTOP_WINDOWS_SIGNTOOL`。它直接调用 SignTool，并传入 `/sha1`、固定的当前用户 `My` 存储、`/fd sha256`、仅用于嵌套签名的可选 `/as` 和目标文件。它不提供 `/f`、`/kc`、`/csp` 或时间戳参数。

`package-target.ts` 从构建和准备子进程中删除所有 `DSH_DESKTOP_WINDOWS_*` 字段，然后只为 electron-builder 恢复六个获准的生产、选择器和本地测试名称。`prepare:desktop` 在 electron-builder 之前返回，并保持无需凭据。

## 本地测试安全属性

本地测试签名器复用生产环境的子进程环境清理和 Authenticode 目录修复。仓库代码通过公开指纹选择证书，绝不加载、读取、导出或提交其私钥。该实现不修改证书信任存储，本地测试签名有意不使用时间戳，也不受公众信任。

## 非目标

该决策不创建或信任证书，不打包或安装应用程序，不增加未签名打包，不授予发布签名资格，不更改 macOS 签名或更新，也不增加通用签名提供者系统。

## 考虑过的替代方案

**通过 electron-builder 内置签名输入使用 PFX。** 这会引入本地证书存储并不需要的可导出私钥文件和密码路径，还会绕过现有的自定义签名 hook 与 NSIS bootstrap 修复路径。

**通用签名提供者抽象。** 两个固定环境只需要一个小型分派器。registry、类层次结构或第三种提供者概念会增加当前需求并不需要的所有权和扩展点。

## 后果

本地操作方在 `Cert:\CurrentUser\My` 中创建专用代码签名证书后，可以生成经过 Authenticode 签名的测试安装包。人工验证必须让安装包签名者的 Subject 与指纹匹配该证书，并确认 Trusted Root 存储中不存在该证书。公开发布签名仍需要另行取得资格的受信任身份。
