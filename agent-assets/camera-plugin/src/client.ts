import { CameraCapture } from './CameraCapture.tsx';
import { zh, en } from './locales.ts';
import { text } from './CameraCapture.module.css';
import type { CameraContext } from './types.ts';

export const inject = ['slots', 'locale'];

/** Wait for DSH's camera slot and dispose all contributions on unload. */
export function apply(ctx: CameraContext): void {
  ctx.effect(() => ctx.locale.register('qihaoCamera', { zh, en }), 'qihao-camera: locale');
  ctx.effect(() => {
    const style = document.createElement('style');
    style.dataset.plugin = 'qihao-camera';
    style.textContent = text;
    document.head.appendChild(style);
    return () => style.remove();
  }, 'qihao-camera: styles');
  ctx.slots.inject('conversation.input.camera', () => ctx.slots.register({
    name: 'conversation.input.camera', locale: 'qihaoCamera',
  }, CameraCapture));
}
