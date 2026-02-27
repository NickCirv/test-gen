import Anthropic from '@anthropic-ai/sdk'
import { readFile, access } from 'fs/promises'
import { join, dirname, basename, extname } from 'path'

const client = new Anthropic()

const FRAMEWORK_IMPORTS = {
  jest: {
    javascript: "import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'",
    typescript: "import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'",
  },
  vitest: {
    javascript: "import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'",
    typescript: "import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'",
  },
  mocha: {
    javascript: "import { describe, it } from 'mocha'\nimport assert from 'assert'",
    typescript: "import { describe, it } from 'mocha'\nimport assert from 'assert'",
  },
  pytest: {
    python: 'import pytest',
  },
}

/**
 * Load existing test file content if it exists
 */
async function loadExistingTests(filePath) {
  try {
    const content = await readFile(filePath, 'utf8')
    return content
  } catch {
    return null
  }
}

/**
 * Build the prompt for Claude based on file analysis
 */
function buildPrompt(analysis, existingTests) {
  const { filePath, language, framework, source, exports, imports } = analysis

  const fileName = basename(filePath)
  const frameworkImport = FRAMEWORK_IMPORTS[framework]?.[language] || ''

  const exportSummary = exports
    .map((e) => {
      if (e.type === 'class') {
        const methodList = e.methods.map((m) => `    - ${m.signature}`).join('\n')
        return `- class ${e.signature}${methodList ? '\n  Methods:\n' + methodList : ''}`
      }
      return `- ${e.async ? 'async ' : ''}function ${e.signature}`
    })
    .join('\n')

  const importSummary = imports.length > 0 ? `\nImports: ${imports.join(', ')}` : ''

  let frameworkGuidance = ''
  if (framework === 'jest' || framework === 'vitest') {
    frameworkGuidance = `
Framework: ${framework}
- Use describe/it blocks
- Use expect().toBe(), expect().toEqual(), expect().toThrow()
- Mock with jest.fn() or vi.fn() respectively
- Test happy path, edge cases, and error conditions`
  } else if (framework === 'mocha') {
    frameworkGuidance = `
Framework: mocha
- Use describe/it blocks
- Use assert.strictEqual(), assert.deepEqual()
- Test happy path, edge cases, and error conditions`
  } else if (framework === 'pytest') {
    frameworkGuidance = `
Framework: pytest
- Use test_ prefix for all test functions
- Use assert statements
- Use pytest.raises() for exception testing
- Use fixtures for setup/teardown`
  }

  const existingTestsSection = existingTests
    ? `\n\nEXISTING TESTS (do not duplicate these):\n\`\`\`\n${existingTests.slice(0, 2000)}\n\`\`\``
    : ''

  return `You are an expert software engineer. Generate comprehensive tests for the following source file.

FILE: ${fileName}
LANGUAGE: ${language}
${frameworkGuidance}

EXPORTED SYMBOLS:
${exportSummary || '(no explicit exports detected — test the main logic)'}
${importSummary}

SOURCE CODE:
\`\`\`${language}
${source}
\`\`\`
${existingTestsSection}

REQUIREMENTS:
1. Generate complete, runnable test code
2. Test every exported function and class method
3. Include: happy path tests, edge cases, error conditions
4. Use descriptive test names that explain the expected behavior
5. Add brief comments for complex test setups
6. Import the source module correctly (use relative path: '../src/${basename(filePath)}' or similar)
7. Framework import: ${frameworkImport}

Return ONLY the test code in a single code block. No explanations outside the code block.`
}

/**
 * Extract code block from Claude response
 */
function extractCodeBlock(text, language) {
  // Try fenced code block with language specifier
  const fencedWithLang = new RegExp(`\`\`\`(?:${language}|javascript|typescript|python|js|ts|py)[\\s\\S]*?\n([\\s\\S]*?)\`\`\``, 'i')
  const matchWithLang = text.match(fencedWithLang)
  if (matchWithLang) return matchWithLang[1].trim()

  // Try any fenced code block
  const fencedAny = /```[\s\S]*?\n([\s\S]*?)```/
  const matchAny = text.match(fencedAny)
  if (matchAny) return matchAny[1].trim()

  // Return raw text if no code blocks found
  return text.trim()
}

/**
 * Generate tests for a file using Claude
 */
export async function generateTests(analysis, existingTestPath) {
  const existingTests = existingTestPath ? await loadExistingTests(existingTestPath) : null
  const prompt = buildPrompt(analysis, existingTests)

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const responseText = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  const code = extractCodeBlock(responseText, analysis.language)

  return {
    code,
    language: analysis.language,
    framework: analysis.framework,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
  }
}
