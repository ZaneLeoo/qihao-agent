// @vitest-environment jsdom
import { expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { resolve } from 'node:path';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import * as primitives from './primitives.tsx';
import type { CameraContext } from '../src/types.ts';

it('loads the built factory, waits for the slot, and removes locale, styles and entry on unload', async () => {
  let plugin: { apply: (ctx: CameraContext) => void } | undefined;
  const providers: Record<string, unknown> = {
    react: React, 'react/jsx-runtime': jsxRuntime,
    '@deepseek-ai/dsh-client-ui-primitives': primitives,
  };
  const requests: string[] = [];
  runInNewContext(await readFile(resolve('lib/client.js'), 'utf8'), {
    document,
    window: { __ModuleLoader__: { load(entry: { id: string; factory: (require: (name: string) => unknown) => typeof plugin }) {
      expect(entry.id).toBe('@qihao/dsh-camera');
      plugin = entry.factory((name) => {
        requests.push(name);
        if (!(name in providers)) { throw new Error(`Unexpected browser import: ${name}`); }
        return providers[name];
      });
    } } },
  });
  expect(requests).toContain('@deepseek-ai/dsh-client-ui-primitives');
  const disposers: (() => void)[] = [];
  const declarations = new Map<string, () => () => void>();
  const entries = new Map<string, unknown>();
  const dictionaries = new Map<string, unknown>();
  plugin!.apply({
    effect(callback) { disposers.push(callback()); },
    locale: { register(name, value) {
      dictionaries.set(name, value); return () => { dictionaries.delete(name); };
    } },
    slots: {
      inject(name, callback) { declarations.set(name, callback); },
      register(definition, component) {
        expect(definition.locale).toBe('qihaoCamera');
        entries.set(definition.name, component);
        return () => { entries.delete(definition.name); };
      },
    },
  });
  expect(entries.size).toBe(0);
  expect(document.querySelector('[data-plugin="qihao-camera"]')?.textContent).toContain('.qh-camera-trigger');
  disposers.push(declarations.get('conversation.input.camera')!());
  expect(entries.size).toBe(1);
  for (const dispose of disposers.reverse()) { dispose(); }
  expect(entries.size).toBe(0);
  expect(dictionaries.size).toBe(0);
  expect(document.querySelector('[data-plugin="qihao-camera"]')).toBeNull();
});
