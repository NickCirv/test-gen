# Command reference

Use `node bin/gen.js` from the pinned source checkout described in the [README](../README.md). The entries below describe the inspected implementation.

| Command or argument | Behavior |
| --- | --- |
| `node bin/gen.js` | Attempts to import ../src/index.js, which is absent from this captured revision. |
| `--help and other arguments` | Cannot reach a command parser because bootstrap fails first. |
| `Exit behavior` | The import rejection prints Fatal error and exits 1. |
| `Restoration requirement` | Recover or implement src/index.js before documenting runnable generation modes; historical options are not a usable interface at this revision. |

For prerequisites, file writes, external services and known limitations, see [Behavior and limits](../README.md#behavior-and-limits).

Implementation: [bin/gen.js](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/bin/gen.js), [src/analyzer.js](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/src/analyzer.js), [src/generator.js](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/src/generator.js), [test/smoke.test.js](https://github.com/NickCirv/test-gen/blob/9bc9f9a5ab6c7061bd7b7d2bdf2ec2eef4ce167b/test/smoke.test.js); [review evidence](RESEARCH.md).
