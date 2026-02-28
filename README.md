# test-gen

AI-powered test generator that reads your source files and writes complete, runnable tests — supports Jest, Vitest, Mocha, and pytest.

<p align="center">
  <img src="https://img.shields.io/npm/v/test-gen.svg" alt="npm version" />
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg" alt="node >= 18" />
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license" />
</p>

## Why

Writing tests is the task everyone knows matters but nobody wants to do. `test-gen` reads your source file, detects your test framework from `package.json` or config files, extracts every exported function and class method, and uses Claude to generate complete test suites — happy paths, edge cases, and error conditions included.

No templates, no placeholders. The output is copy-paste ready, or write it directly to a file.

## Quick Start

```bash
npx test-gen src/utils.js
npx test-gen src/api/user.ts --output tests/user.test.ts
npx test-gen app/services/payment.py
```

## What It Does

- Detects language from file extension — JavaScript, TypeScript, Python
- Walks up the directory tree to detect your test framework (Jest, Vitest, Mocha, pytest)
- Extracts all exported named functions, arrow functions, and classes (including methods)
- Loads existing test file if present — avoids generating duplicate tests
- Sends source + export map to Claude Haiku with framework-specific guidance
- Returns complete, runnable test code in the correct format for your framework

## Example Output

```
$ npx test-gen src/analyzer.js

Detected: javascript / vitest

Generated 87 lines of tests → tests/analyzer.test.js

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { detectLanguage, detectFramework, analyzeFile } from '../src/analyzer.js'

describe('detectLanguage', () => {
  it('returns javascript for .js files', () => {
    expect(detectLanguage('app.js')).toBe('javascript')
  })

  it('returns typescript for .ts and .tsx files', () => {
    expect(detectLanguage('index.ts')).toBe('typescript')
    expect(detectLanguage('Component.tsx')).toBe('typescript')
  })

  it('returns python for .py files', () => {
    expect(detectLanguage('main.py')).toBe('python')
  })

  it('returns null for unsupported extensions', () => {
    expect(detectLanguage('style.css')).toBeNull()
  })
})
```

## Supported Languages and Frameworks

| Language | Frameworks |
|----------|-----------|
| JavaScript (`.js`, `.jsx`, `.mjs`, `.cjs`) | Jest, Vitest, Mocha |
| TypeScript (`.ts`, `.tsx`, `.mts`) | Jest, Vitest, Mocha |
| Python (`.py`) | pytest |

Framework is auto-detected from `package.json` dependencies, `vitest.config.*`, `jest.config.*`, `.mocharc.*`, `pytest.ini`, or `conftest.py`. Falls back to Jest (JS/TS) or pytest (Python).

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--output <path>` | Write tests to file instead of stdout | stdout |
| `--framework <name>` | Override detected framework (`jest`, `vitest`, `mocha`, `pytest`) | auto-detect |

## Requirements

- Node.js 18+
- `ANTHROPIC_API_KEY` environment variable set

## Install Globally

```bash
npm i -g test-gen
```

## License

MIT
