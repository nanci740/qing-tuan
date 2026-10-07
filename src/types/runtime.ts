import type { NativeAttribute } from './dom';

export interface RuntimeScript {
  readonly index: number;
  readonly label: string;
  readonly position: 'head' | 'body';
  readonly attributes: readonly NativeAttribute[];
  readonly code: string;
  readonly sourceLine: number;
}

export interface ParserReplayEntry {
  readonly node: Node;
  readonly parent: Node;
  readonly script?: RuntimeScript;
}

export interface RuntimeStatus {
  initialized: boolean;
  readonly executedScripts: number[];
}
