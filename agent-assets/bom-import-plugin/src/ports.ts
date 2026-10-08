import type { ImageRef } from "./shared/contracts.ts";

export interface SessionEvent {
  seq: number;
  type: string;
  data: Record<string, unknown>;
}
export interface Session {
  snapshotEvents(): readonly SessionEvent[];
}
export interface Agent {
  session: Session;
}
export interface Execution {
  agent?: Agent;
  signal: AbortSignal;
}
export interface FileRef {
  attachmentId: string;
  name: string;
  bytes: number;
}
export interface Attachments {
  readFileStream(ref: FileRef, signal?: AbortSignal): AsyncIterable<Uint8Array>;
  readImage(
    ref: ImageRef,
    signal?: AbortSignal,
  ): Promise<{ data: Uint8Array; ref: ImageRef }>;
  saveImage(input: {
    data: Uint8Array;
    mediaType: string;
    name: string;
  }): Promise<ImageRef>;
}
export interface RuntimeConfig {
  maxPagesPerCall: number;
  imageMaxEdge: number;
  maxFileBytes: number;
  maxSourceBytes: number;
  maxSourcePages: number;
}
export interface HostContext {
  tools: { register(tool: unknown): () => void };
  attachments: Attachments;
  userQuestions: {
    ask(request: {
      questions: {
        id: string;
        question: string;
        detail: string;
        options: { label: string }[];
      }[];
      agent: Agent;
      signal: AbortSignal;
    }): Promise<{
      answers: { id: string; selected: string[]; custom?: string }[];
    }>;
  };
  effect(callback: () => unknown, label?: string): void;
}
