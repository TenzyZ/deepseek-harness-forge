# Contributing to DSH Forge

DSH Forge is an unofficial community fork of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), maintained by Tenzy. It is not a DeepSeek product, and nothing here represents DeepSeek's contribution policy.

Contributions are welcome. DSH Forge is in developer preview and maintained by one person, so there is no guaranteed response time or release schedule.

## Ways to contribute

- **Bug reports.** Open an issue with reproduction steps, what you expected, what happened, and your version and platform.
- **Feature or improvement proposals.** Open an issue describing the problem and the behavior you want.
- **Documentation fixes.** Send a pull request directly.
- **Plugins and extensions.** DSH Forge is a plugin-based harness. A plugin does not need changes to this repository simply to exist. Build it independently, or propose it as a package when it belongs in the fork.
- **Pull requests.** Focused bug fixes and focused features are welcome.

## Before a large change

Open an issue first if your change touches `agent-loop`, a capability seam, the session log format, or another core contract. These changes are expensive to redo, so agreeing on the approach first keeps the implementation focused.

Documentation fixes, small bug fixes, and new plugins do not need a prior issue. Send the pull request.

## Pull requests

Prefer the least invasive mechanism that solves the problem: configuration or a preset, then an existing plugin, then a new plugin or extension, then a narrowly scoped package change, and only then core behavior.

[docs/architecture.md](docs/architecture.md) documents the architecture and extension boundaries. The [extension cookbook](docs/cookbook/extension-cookbook.md) covers common extension patterns.

A good pull request:

- Does one thing. Split unrelated work into separate pull requests.
- Preserves existing behavior unless changing that behavior is the purpose of the pull request.
- Includes tests for behavioral changes and updates tests whose expected behavior changed.
- Leaves unrelated refactoring, speculative abstractions, and dependency upgrades out.
- States what was run to verify the change, with useful output when appropriate.

[AGENTS.md](AGENTS.md) contains the repository conventions; read it before changing `packages/`. Non-trivial changes also require an Agent Note as described in [.agents/notes/README.md](.agents/notes/README.md).

## Verifying your change

See [docs/development.md](docs/development.md) for the full development setup. Install dependencies and run the repository type check:

```sh
pnpm install
pnpm run typecheck
```

Then run the checks relevant to what you changed:

```sh
pnpm run lint
pnpm run test
pnpm run doc-sync     # documentation changes
pnpm run build        # changes consumed from built output
```

Use the narrowest verification that covers your change. `pnpm run check:all` runs the broader repository checks when they are appropriate.

Report the verification you ran in your pull request.

Documentation translation requirements are described in [docs/i18n/README.md](docs/i18n/README.md).

## Upstream DeepSeek Harness

DSH Forge is built on DeepSeek Harness and follows its architecture closely. If you find a bug or want a feature that is not specific to Forge's changes, [upstream DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) may be the better place to raise it; an upstream fix can benefit Forge as well.

Forge-specific changes are documented in the [README](README.md).

DSH Forge is distributed under the MIT license. See [LICENSE](LICENSE).
