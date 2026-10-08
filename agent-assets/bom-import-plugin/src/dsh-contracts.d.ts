/** 企好使用的 DSH 0.1.6 公开服务面；不引入宿主实现或浏览器模块到另一端。 */
declare module "@deepseek-ai/dsh-tools" {
  type Schema = (
    | { type: "string"; enum?: readonly string[] }
    | { type: "integer" | "number"; enum?: readonly number[] }
    | { type: "boolean" }
    | { type: "array"; items: Schema }
    | {
        type: "object";
        additionalProperties: boolean;
        properties?: Record<string, Schema>;
      }
  ) & { required?: true; description?: string };
  export function defineTool<A, V>(definition: {
    name: string;
    description: string;
    parameters: Record<string, Schema>;
    output: {
      schema: Schema;
      render(args: A, value: V): unknown[];
      presentationMeta?(args: A, value: V): unknown;
    };
    execute(args: A, exec: import("./ports.ts").Execution): Promise<V>;
  }): unknown;
}
declare module "@deepseek-ai/schemastery" {
  interface Field {
    required(): Field;
    min(value: number): Field;
    max(value: number): Field;
    step(value: number): Field;
    default(value: unknown): Field;
  }
  const z: { object(fields: Record<string, Field>): Field; number(): Field };
  export default z;
}
declare module "@deepseek-ai/dsh-client-ui-user-questions/client" {
  export interface PendingQuestion {
    kind: "question" | "plan-review";
    key: string;
    sessionId: string;
    questions: { id: string; detail?: string }[];
    answer(answer: {
      answers: { id: string; selected: string[]; custom?: string }[];
    }): Promise<void>;
  }
}
declare module "*.module.css" {
  const classes: Record<string, string>;
  export const text: string;
  export default classes;
}
