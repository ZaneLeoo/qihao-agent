/** Props supplied by DSH's camera slot, with the plugin's own locale translator. */
export interface CameraProps {
  disabled: boolean;
  onAddFiles: (files: readonly File[]) => void;
  t: (key: string, params?: Readonly<Record<string, unknown>>) => string;
}

/** Only the slot, locale and effect APIs consumed by this plugin. */
export interface CameraContext {
  effect(callback: () => () => void, label?: string): void;
  locale: {
    register(namespace: string, dictionaries: Record<string, Record<string, string>>): () => void;
  };
  slots: {
    inject(name: string, callback: () => () => void): void;
    register(definition: { name: string; locale: string }, component: unknown): () => void;
  };
}
