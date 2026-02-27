import { readFile, access } from 'fs/promises'
import { join, dirname, extname } from 'path'

const LANGUAGE_MAP = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.py': 'python',
}

const FRAMEWORK_CONFIG_FILES = {
  jest: ['jest.config.js', 'jest.config.ts', 'jest.config.mjs', 'jest.config.cjs'],
  vitest: ['vitest.config.js', 'vitest.config.ts', 'vitest.config.mts'],
  mocha: ['.mocharc.js', '.mocharc.cjs', '.mocharc.yaml', '.mocharc.yml', '.mocharc.json'],
  pytest: ['pytest.ini', 'conftest.py'],
}

/**
 * Detect language from file extension
 */
export function detectLanguage(filePath) {
  const ext = extname(filePath).toLowerCase()
  return LANGUAGE_MAP[ext] || null
}

/**
 * Detect test framework by searching package.json and config files
 */
export async function detectFramework(filePath) {
  const dir = dirname(filePath)
  const searchDirs = [dir]

  let current = dir
  for (let i = 0; i < 4; i++) {
    const parent = dirname(current)
    if (parent === current) break
    searchDirs.push(parent)
    current = parent
  }

  for (const searchDir of searchDirs) {
    try {
      const pkgPath = join(searchDir, 'package.json')
      const pkgContent = await readFile(pkgPath, 'utf8')
      const pkg = JSON.parse(pkgContent)
      const allDeps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
        ...(pkg.scripts || {}),
      }

      const depsStr = JSON.stringify(allDeps).toLowerCase()

      if (depsStr.includes('vitest')) return 'vitest'
      if (depsStr.includes('jest')) return 'jest'
      if (depsStr.includes('mocha')) return 'mocha'
    } catch {
      // no package.json here
    }

    try {
      const pyprojectPath = join(searchDir, 'pyproject.toml')
      const content = await readFile(pyprojectPath, 'utf8')
      if (content.includes('[tool.pytest') || content.includes('pytest')) return 'pytest'
    } catch {
      // not found
    }

    for (const [framework, configFiles] of Object.entries(FRAMEWORK_CONFIG_FILES)) {
      for (const configFile of configFiles) {
        try {
          await access(join(searchDir, configFile))
          return framework
        } catch {
          // not found
        }
      }
    }
  }

  return null
}

/**
 * Extract class methods from class body
 */
function extractClassMethods(source, classStart) {
  const methods = []
  const braceStart = source.indexOf('{', classStart)
  if (braceStart === -1) return methods

  let depth = 0
  let i = braceStart
  let classBodyStart = braceStart + 1
  let classBodyEnd = source.length

  while (i < source.length) {
    if (source[i] === '{') depth++
    if (source[i] === '}') {
      depth--
      if (depth === 0) {
        classBodyEnd = i
        break
      }
    }
    i++
  }

  const classBody = source.slice(classBodyStart, classBodyEnd)
  const methodRegex = /(?:(?:async|static|get|set|public|private|protected)\s+)*(\w+)\s*\(([^)]*)\)\s*(?::\s*\w+)?\s*\{/g
  let match
  while ((match = methodRegex.exec(classBody)) !== null) {
    const name = match[1]
    if (['if', 'for', 'while', 'switch', 'catch'].includes(name)) continue
    methods.push({
      name,
      signature: `${name}(${match[2].trim()})`,
    })
  }

  return methods
}

/**
 * Extract exported functions/classes from JS/TS source
 */
function extractJSExports(source) {
  const exports = []

  const namedFuncRegex = /export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g
  let match
  while ((match = namedFuncRegex.exec(source)) !== null) {
    exports.push({
      type: 'function',
      name: match[1],
      signature: `${match[1]}(${match[2].trim()})`,
      async: source.slice(match.index, match.index + 25).includes('async'),
    })
  }

  const arrowFuncRegex = /export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g
  while ((match = arrowFuncRegex.exec(source)) !== null) {
    exports.push({
      type: 'function',
      name: match[1],
      signature: `${match[1]}(${match[2].trim()})`,
      async: source.slice(match.index, match.index + 45).includes('async'),
    })
  }

  const classRegex = /export\s+(?:default\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/g
  while ((match = classRegex.exec(source)) !== null) {
    const methods = extractClassMethods(source, match.index)
    exports.push({
      type: 'class',
      name: match[1],
      extends: match[2] || null,
      methods,
      signature: `class ${match[1]}${match[2] ? ` extends ${match[2]}` : ''}`,
    })
  }

  const defaultFuncRegex = /export\s+default\s+(?:async\s+)?function\s*(\w*)\s*\(([^)]*)\)/g
  while ((match = defaultFuncRegex.exec(source)) !== null) {
    exports.push({
      type: 'function',
      name: match[1] || 'default',
      signature: `${match[1] || 'default'}(${match[2].trim()})`,
      async: source.slice(match.index, match.index + 35).includes('async'),
      isDefault: true,
    })
  }

  return exports
}

/**
 * Extract exported functions/classes from Python source
 */
function extractPythonExports(source) {
  const exports = []

  const funcRegex = /^(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)/gm
  let match
  while ((match = funcRegex.exec(source)) !== null) {
    if (match[1].startsWith('_')) continue
    exports.push({
      type: 'function',
      name: match[1],
      signature: `${match[1]}(${match[2].trim()})`,
      async: match[0].trim().startsWith('async'),
    })
  }

  const classRegex = /^class\s+(\w+)(?:\(([^)]*)\))?:/gm
  while ((match = classRegex.exec(source)) !== null) {
    exports.push({
      type: 'class',
      name: match[1],
      extends: match[2] || null,
      signature: `class ${match[1]}${match[2] ? `(${match[2]})` : ''}`,
      methods: [],
    })
  }

  return exports
}

/**
 * Extract import statements from JS/TS source
 */
function extractJSImports(source) {
  const imports = []
  const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\w+))*\s+from\s+)?['"]([^'"]+)['"]/g
  let match
  while ((match = importRegex.exec(source)) !== null) {
    imports.push(match[1])
  }
  return imports
}

/**
 * Extract import statements from Python source
 */
function extractPythonImports(source) {
  const imports = []
  const importRegex = /^(?:from\s+(\S+)\s+import|import\s+(\S+))/gm
  let match
  while ((match = importRegex.exec(source)) !== null) {
    imports.push(match[1] || match[2])
  }
  return imports
}

/**
 * Full analysis of a source file
 */
export async function analyzeFile(filePath) {
  const language = detectLanguage(filePath)
  if (!language) {
    throw new Error(`Unsupported file type: ${extname(filePath)}`)
  }

  const source = await readFile(filePath, 'utf8')
  const framework = await detectFramework(filePath)

  let exports = []
  let imports = []

  if (language === 'javascript' || language === 'typescript') {
    exports = extractJSExports(source)
    imports = extractJSImports(source)
  } else if (language === 'python') {
    exports = extractPythonExports(source)
    imports = extractPythonImports(source)
  }

  return {
    filePath,
    language,
    framework: framework || (language === 'python' ? 'pytest' : 'jest'),
    source,
    exports,
    imports,
    lineCount: source.split('\n').length,
    functionCount: exports.filter((e) => e.type === 'function').length,
    classCount: exports.filter((e) => e.type === 'class').length,
  }
}
