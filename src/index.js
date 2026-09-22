import { Command, Option } from 'commander'
import { lstat, stat, access, writeFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { analyzeFile } from './analyzer.js'
import { generateTests } from './generator.js'

/** Testable dispatcher: injected generation keeps behavioral tests offline. */
export async function run(argv = process.argv.slice(2), {
  generate = generateTests, stdout = process.stdout, stderr = process.stderr,
} = {}) {
  const program = new Command()
    .name('test-gen')
    .description('Draft tests from a source file. Generation sends source to Anthropic; --dry-run stays offline.')
    .argument('<file>', 'JavaScript, TypeScript or Python source file')
    .option('-o, --output <path>', 'Write generated tests instead of printing them')
    .addOption(new Option('--framework <name>', 'Override detected test framework').choices(['jest', 'vitest', 'mocha', 'pytest']))
    .option('--dry-run', 'Analyze locally and show the generation plan; no API call or file writes', false)
    .exitOverride()
    .configureOutput({ writeOut: text => stdout.write(text), writeErr: text => stderr.write(text) })
  program.action(async (file, options) => {
    const input = resolve(file)
    if (!(await stat(input)).isFile()) throw new Error(`Not a regular source file: ${input}`)
    const analysis = await analyzeFile(input)
    if (options.framework) analysis.framework = options.framework
    if ((analysis.language === 'python') !== (analysis.framework === 'pytest')) {
      throw new Error(`Framework ${analysis.framework} is incompatible with ${analysis.language}`)
    }
    const output = options.output ? resolve(options.output) : null
    if (output) {
      if (output === input) throw new Error('Output must not overwrite the source file')
      try {
        await lstat(output)
        throw new Error('Output already exists; choose a new output path and merge reviewed tests manually')
      } catch (error) { if (error.code !== 'ENOENT') throw error }
      if (!(await stat(dirname(output))).isDirectory()) throw new Error('Output parent must be a directory')
      await access(dirname(output), constants.W_OK)
    }
    if (options.dryRun) {
      stdout.write(JSON.stringify({ file: input, language: analysis.language, framework: analysis.framework,
        exports: analysis.exports, output: output ?? 'stdout', existingTests: null,
        network: false, writes: false }, null, 2) + '\n')
      return
    }
    const result = await generate(analysis, null)
    if (!result || typeof result.code !== 'string' || !result.code.trim()) throw new Error('Generator returned no test code')
    if (output) {
      // Exclusive creation avoids replacing a file created while generation was running.
      await writeFile(output, result.code + '\n', { encoding: 'utf8', flag: 'wx' })
      stderr.write(`Tests drafted to ${output}; review and run them before relying on them.\n`)
    } else stdout.write(result.code + '\n')
  })
  try {
    if (argv.length === 0) { program.outputHelp(); return 0 }
    await program.parseAsync(argv, { from: 'user' })
    return 0
  } catch (error) {
    if (error.code?.startsWith('commander.')) return error.exitCode ?? 1
    stderr.write(`test-gen: ${error.message}\n`)
    return 1
  }
}
