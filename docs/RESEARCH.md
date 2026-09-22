# Source review — test-gen

## Revision and method

Inspected public commit: [`9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b`](https://github.com/NickCirv/test-gen/commit/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b). Source tree: `7312c829b5d0667fc40d08195c3f45d29aa01bcd`. Capture scope: all eligible text files; 8 of 8 eligible files.

This review read captured implementation and documentation. It did not install dependencies, execute project commands, call project APIs, check package publication or establish live CI status. Examples are source-derived, not captured execution transcripts.

## Claim ledger

| Claim | Evidence | Status |
| --- | --- | --- |
| Missing src/index.js dynamic import target | [bin/gen.js](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/bin/gen.js) | Verified in inspected source; execution unverified |
| Language/framework analysis | [src/analyzer.js](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/src/analyzer.js) | Verified in inspected source; execution unverified |
| API prompt and generated-code extraction | [src/generator.js](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/src/generator.js) | Verified in inspected source; execution unverified |
| Syntax-only test misses runtime import | [test/smoke.test.js](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/test/smoke.test.js) | Verified in inspected source; execution unverified |

## Findings and verification gaps

The published tree contains no src/index.js, so historical CLI examples cannot work as written. The smoke test only syntax-checks bin/gen.js and does not resolve its dynamic import, so it misses this blocker. Generated tests would still require review, execution and meaningful assertions; a model request is not evidence of coverage. No code repair was made in this documentation overlay.

The captured smoke test only asks Node to syntax-check the entrypoint. It does not exercise behavior, integrations or failure paths. Neither that test nor installation was run in this review.

| Dimension | Result |
| --- | --- |
| Purpose and documented commands | Partially verified: static source inspection |
| Clean installation and examples | Unverified |
| Test suite and live CI | Unverified |
| Performance and security guarantees | Unverified |
| Publication | Local documentation only |

## Documentation inventory

- [README.md](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/README.md) — Rewritten; historic section anchors retained where practical.
- [LICENSE](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/LICENSE) — protected document preserved unchanged.

## Captured source inventory

- [LICENSE](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/LICENSE) — Git blob `05b804beeec7d1a6c933d087387ba4adf6463d93`.
- [README.md](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/README.md) — Git blob `f2b6b29a8471fb1313dd333f1ce3fa361ca109a3`.
- [package.json](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/package.json) — Git blob `00d45a1f94a6d7b6705fab6429a39418750a8154`.
- [.github/workflows/ci.yml](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/.github/workflows/ci.yml) — Git blob `44515034a394670de44454a7a1bd2c7ef0c9836e`.
- [bin/gen.js](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/bin/gen.js) — Git blob `f815b99f8031119164398136bc62eb0cab97a875`.
- [src/analyzer.js](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/src/analyzer.js) — Git blob `6024caf2330814437942a39c30f4b702b02dd8f4`.
- [src/generator.js](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/src/generator.js) — Git blob `1b32d945eee8d12b4587a62e854f3feb7b366e69`.
- [test/smoke.test.js](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/test/smoke.test.js) — Git blob `ff3cf72e2c85320a8967e681ccde38d2a80f6e92`.

## Scope boundary

Capture excludes lockfiles, binary artwork, generated output, vendored dependencies and files above the acquisition size limit. The tree records their existence; no verification claim is made for omitted content. Protected documents and historical records are not replaced.

## Reference coverage

Added [command reference](REFERENCE.md) from the argument parser, command handlers and source-defined help at the pinned revision. README examples remain unexecuted.
