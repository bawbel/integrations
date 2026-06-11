// Minimal vscode mock for unit tests that run outside the extension host.
// Add stubs here only as tests require them.

export const workspace = {
  workspaceFolders: [{ uri: { fsPath: "/workspace" } }] as any,
  getConfiguration: () => ({ get: (_key: string, fallback: unknown) => fallback }),
};

export const Uri = {
  file: (p: string) => ({ fsPath: p, toString: () => `file://${p}` }),
  parse: (s: string) => ({ toString: () => s }),
};

export enum DiagnosticSeverity { Error = 0, Warning = 1, Information = 2, Hint = 3 }
export enum DiagnosticTag      { Unnecessary = 1, Deprecated = 2 }

export class Range {
  constructor(
    public start: any,
    public end: any,
  ) {}
}
export class Position {
  constructor(public line: number, public character: number) {}
}
export class Diagnostic {
  source?: string;
  code?: unknown;
  tags?: DiagnosticTag[];
  constructor(public range: Range, public message: string, public severity: DiagnosticSeverity) {}
}
export class DiagnosticCollection {
  private store = new Map<string, any[]>();
  set(uri: any, diags: any[]) { this.store.set(uri.toString(), diags); }
  forEach(cb: (uri: any, diags: any[]) => void) {
    this.store.forEach((v, k) => cb(k, v));
  }
}

export const window = {
  createOutputChannel: () => ({ appendLine: () => {} }),
};

export const languages = {
  createDiagnosticCollection: () => new DiagnosticCollection(),
};
