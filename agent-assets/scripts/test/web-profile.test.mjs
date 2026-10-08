import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const launcher = fileURLToPath(new URL('../web-profile.mjs', import.meta.url));
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'qihao-launcher-'));
  t.after(() => {
    assert.ok(resolve(root).startsWith(resolve(tmpdir()) + sep));
    rmSync(root, { recursive: true, force: true });
  });
  const dsh = join(root, 'DSH checkout');
  const assets = join(root, 'assets', 'agent-presets');
  mkdirSync(join(dsh, 'apps', 'cli', 'lib'), { recursive: true });
  mkdirSync(assets, { recursive: true });
  writeFileSync(join(assets, '..', 'cordis.patch.yml'), '[]');
  writeFileSync(join(dsh, 'apps', 'cli', 'lib', 'bin.js'),
    'console.log(JSON.stringify({args:process.argv.slice(2),cwd:process.cwd(),key:process.env.AGENT_MCP_TOOL_KEY}))');
  const env = { ...process.env };
  for (const key of ['AGENT_DSH_ROOT', 'AGENT_ASSETS_ROOT', 'AGENT_MCP_TOOL_KEY', 'AGENT_MCP_CONTEXT_ID', 'AGENT_DSH_WEB_PORT']) {
    delete env[key];
  }
  return { root, dsh, assets, env };
}

test('starts the built DSH from an external directory and reads its local .env', t => {
  const f = fixture(t);
  writeFileSync(join(f.root, '.env'),
    `AGENT_DSH_ROOT=${JSON.stringify(f.dsh.replaceAll('\\', '/'))}\n` +
    `AGENT_ASSETS_ROOT=${JSON.stringify(f.assets.replaceAll('\\', '/'))}\n` +
    'AGENT_MCP_TOOL_KEY=test-key\nAGENT_MCP_CONTEXT_ID=test-context\nAGENT_DSH_WEB_PORT=3100\n');
  const result = spawnSync(process.execPath, [launcher, 'qihao-agent', '--no-open'], { cwd: f.root, env: f.env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const observed = JSON.parse(result.stdout);
  assert.equal(observed.cwd, f.dsh);
  assert.equal(observed.key, 'test-key');
  assert.deepEqual(observed.args, ['--profile', 'web', '--patch', join(f.assets, '..', 'cordis.patch.yml'), '--port', '3100', '--no-open']);
});

test('refuses startup when business context is missing', t => {
  const f = fixture(t);
  const result = spawnSync(process.execPath, [launcher, 'qihao-agent'], {
    cwd: f.dsh, env: { ...f.env, AGENT_ASSETS_ROOT: f.assets, AGENT_MCP_TOOL_KEY: 'test-key' }, encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /missing AGENT_MCP_CONTEXT_ID/);
  assert.equal(result.stdout, '');
});
