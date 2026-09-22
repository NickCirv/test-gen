import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, readdir, rm, symlink, link, rename } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { run } from '../src/index.js'
import { generateTests } from '../src/generator.js'
const bin = fileURLToPath(new URL('../bin/gen.js', import.meta.url))
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'test-gen-test-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const input = join(root, 'sum.js')
  await writeFile(input, 'export function sum(a, b) { return a + b }')
  await writeFile(join(root, 'package.json'), JSON.stringify({ devDependencies: { vitest: '1' } }))
  return { root, input, output: join(root, 'sum.test.js') }
}
async function invoke(args, generate = async () => { throw new Error('Unexpected generation call') }) {
  let stdout = '', stderr = ''
  const code = await run(args, { generate, stdout: { write: s => { stdout += s } }, stderr: { write: s => { stderr += s } } })
  return { code, stdout, stderr }
}
test('real entrypoint help and dry-run work without credentials and do not write', async t => {
  const { root, input, output } = await fixture(t)
  const env = { ...process.env }
  delete env.ANTHROPIC_API_KEY
  delete env.ANTHROPIC_AUTH_TOKEN
  for (const args of [[], ['--help'], [input, '--dry-run', '--output', output]]) {
    const result = spawnSync(process.execPath, [bin, ...args], { cwd: root, encoding: 'utf8', env })
    assert.equal(result.status, 0, result.stderr)
    if (args.includes('--dry-run')) { const plan = JSON.parse(result.stdout); assert.equal(plan.network, false); assert.equal(plan.framework, 'vitest'); assert.equal(plan.exports[0].name, 'sum') }
  }
  assert.deepEqual((await readdir(root)).sort(), ['package.json', 'sum.js'])
})
test('dry-run never calls generation and reports Python analysis', async t => {
  const { root } = await fixture(t), input = join(root, 'sample.py')
  await writeFile(input, 'def add(a, b):\n    return a + b\n')
  const result = await invoke([input, '--framework', 'pytest', '--dry-run'])
  assert.equal(result.code, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout).exports[0].name, 'add')
})
test('mocked generation writes output with detected symbols; stdout remains code-only', async t => {
  const { input, output } = await fixture(t)
  const generate = async (analysis, existing) => {
    assert.equal(analysis.framework, 'vitest'); assert.equal(analysis.exports[0].name, 'sum'); assert.equal(existing, null)
    return { code: '// generated fixture test' }
  }
  let result = await invoke([input, '--output', output], generate)
  assert.equal(result.code, 0, result.stderr)
  assert.equal(await readFile(output, 'utf8'), '// generated fixture test\n')
  result = await invoke([input], generate)
  assert.equal(result.stdout, '// generated fixture test\n')
})
test('existing tests are preserved without a replacement mode, including content beyond 2000 characters', async t => {
  const { input, output } = await fixture(t)
  const original = '// existing assertions\n'.repeat(200) + '// final assertion must survive'
  await writeFile(output, original)
  for (const args of [[input, '--output', output], [input, '--output', output, '--dry-run'], [input, '--output', output, '--force']]) {
    const rejected = await invoke(args)
    assert.equal(rejected.code, 1)
    assert.equal(await readFile(output, 'utf8'), original)
  }
})
test('invalid input, unsupported options and unsafe output fail before generation', async t => {
  const { root, input, output } = await fixture(t), unknown = join(root, 'sample.css')
  await writeFile(unknown, 'body {}')
  const alias = join(root, 'alias.js'); await symlink(input, alias)
  const hard = join(root, 'hard.js'); await link(input, hard)
  for (const args of [[join(root, 'missing.js')], [unknown], [root], [input, '--framework', 'pytest'], [input, '--framework', 'unknown'], [input, '--wat'], [input, '--output'], [input, '--output', input], [input, '--output', alias], [input, '--output', hard], [input, '--output', join(root, 'missing', 'test.js')]]) {
    const result = await invoke(args)
    assert.notEqual(result.code, 0, args.join(' ')); assert.ok(result.stderr.trim())
  }
  assert.equal(await readFile(input, 'utf8'), 'export function sum(a, b) { return a + b }')
})
test('generation failure and empty responses create no output', async t => {
  const { input, output, root } = await fixture(t)
  for (const generate of [async () => { throw new Error('Mock provider unavailable') }, async () => ({ code: ' ' })]) {
    const result = await invoke([input, '--output', output], generate)
    assert.equal(result.code, 1)
    assert.equal((await readdir(root)).includes('sum.test.js'), false)
  }
})
test('output appearing during generation is preserved by exclusive creation', async t => {
  const { input, output } = await fixture(t)
  const result = await invoke([input, '--output', output], async () => {
    await writeFile(output, 'Concurrent draft'); return { code: 'New draft' }
  })
  assert.equal(result.code, 1)
  assert.equal(await readFile(output, 'utf8'), 'Concurrent draft')
})
test('generator accepts mock SDK client, includes existing context, and extracts fenced code', async t => {
  const { input, output } = await fixture(t)
  await writeFile(output, '// existing assertions')
  const client = { messages: { create: async payload => {
    assert.match(payload.messages[0].content, /EXISTING TESTS/)
    assert.match(payload.messages[0].content, /existing assertions/)
    assert.match(payload.messages[0].content, /export function sum/)
    return { content: [{ type: 'text', text: '```javascript\n// mocked test\n```' }], usage: { input_tokens: 7, output_tokens: 3 } }
  } } }
  const result = await generateTests({ filePath: input, language: 'javascript', framework: 'vitest', source: 'export function sum(a,b){}', exports: [], imports: [] }, output, { client })
  assert.equal(result.code, '// mocked test'); assert.equal(result.inputTokens, 7)
})
