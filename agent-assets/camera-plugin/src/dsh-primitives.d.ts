// The narrow public primitive API used here; supplied by DSH at runtime.
declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type { ButtonHTMLAttributes, ReactNode } from 'react';
  export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'outline'; children?: ReactNode;
  }): ReactNode;
  export function Tooltip(props: {
    label: string; side: 'top'; delayMs: number; children: ReactNode;
  }): ReactNode;
  export function Modal(props: {
    open: boolean; onClose: () => void; title: string; closeLabel: string;
    className: string; footer: ReactNode; children: ReactNode;
  }): ReactNode;
}
declare module '*.module.css' {
  const classes: Record<string, string>;
  export const text: string;
  export default classes;
}
