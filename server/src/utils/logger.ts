import { randomUUID } from "node:crypto";

export interface RequestLogScope {
  id: string;
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
  child(name: string): RequestLogScope;
}

export function createRequestLogScope(name: string): RequestLogScope {
  return createLogScope(name, randomUUID().slice(0, 8));
}

export function formatMs(ms: number): string {
  return `${ms}ms`;
}

export function quoteLogValue(value: string): string {
  return `"${value.replace(/["\r\n]+/g, " ").trim()}"`;
}

function createLogScope(name: string, id: string): RequestLogScope {
  const prefix = `[${name}:${id}]`;

  return {
    id,
    info(message: string) {
      console.log(formatLine(prefix, message));
    },
    warn(message: string) {
      console.warn(formatLine(prefix, message));
    },
    error(message: string, error?: unknown) {
      console.error(formatLine(prefix, `${message}${formatError(error)}`));
    },
    child(childName: string) {
      return createLogScope(childName, id);
    },
  };
}

function formatLine(prefix: string, message: string): string {
  return `${new Date().toISOString()} ${prefix} ${message}`;
}

function formatError(error: unknown): string {
  if (!error) {
    return "";
  }

  if (error instanceof Error) {
    return ` ${error.message}`;
  }

  return ` ${String(error)}`;
}
