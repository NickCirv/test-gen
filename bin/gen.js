#!/usr/bin/env node

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Bootstrap CLI
import('../src/index.js').catch((err) => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
