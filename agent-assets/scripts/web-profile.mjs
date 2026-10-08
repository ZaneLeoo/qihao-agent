/**
 * Start a named, deployment-owned web profile from the built DSH CLI.
 *
 * The launcher reads the invoking checkout's ignored .env before selecting a
 * profile patch. The DSH CLI receives the same environment and still owns
 * profile boot, configuration validation, and the HTTP server lifecycle.
 */
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const envFile = resolve(process.cwd(), '.env')
try {
  process.loadEnvFile(envFile)
} catch (error) {
  if (error?.code !== 'ENOENT') {
    console.error(`web: failed to load ${envFile}: ${String(error)}`)
    process.exitCode = 1
  }
}

const [profile, ...appArgs] = process.argv.slice(2)
const root = resolve(process.env.AGENT_DSH_ROOT ?? process.cwd())
if (process.exitCode !== undefined) process.exit()
if (profile !== 'qihao-agent') {
  console.error('usage: pnpm web qihao-agent [web app options]')
  process.exitCode = 1
} else {
  const assetsRoot = process.env.AGENT_ASSETS_ROOT
  const required = ['AGENT_ASSETS_ROOT', 'AGENT_MCP_TOOL_KEY', 'AGENT_MCP_CONTEXT_ID']
  const missing = required.filter(name => process.env[name] === undefined || process.env[name]?.trim() === '')
  if (missing.length > 0) {
    console.error(`web qihao-agent: missing ${missing.join(', ')} in ${envFile}`)
    process.exitCode = 1
  } else {
    const patch = resolve(assetsRoot, '..', 'cordis.patch.yml')
    const cli = resolve(root, 'apps', 'cli', 'lib', 'bin.js')
    if (!existsSync(patch)) {
      console.error(`web qihao-agent: patch not found: ${patch}`)
      process.exitCode = 1
    } else if (!existsSync(cli)) {
      console.error(`web qihao-agent: built CLI not found: ${cli}; set AGENT_DSH_ROOT to the built DSH checkout`)
      process.exitCode = 1
    } else {
      const port = process.env.AGENT_DSH_WEB_PORT ?? '3099'
      const child = spawn(process.execPath, [cli, '--profile', 'web', '--patch', patch, '--port', port, ...appArgs], {
        cwd: root,
        env: process.env,
        stdio: 'inherit',
      })
      child.once('error', error => {
        console.error(`web qihao-agent: failed to start DSH: ${String(error)}`)
        process.exitCode = 1
      })
      child.once('exit', (code, signal) => {
        if (signal !== null) process.exitCode = 1
        else process.exitCode = code ?? 1
      })
    }
  }
}
