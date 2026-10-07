import type { ReactNode, MouseEventHandler } from 'react';

export interface NativeAttribute {
  readonly name: string;
  readonly value: string;
  readonly namespace?: string;
  readonly prefix?: string;
}

export interface OriginalElementProps {
  readonly tag: string;
  readonly elementRef?: (element: Element | null) => void;
  readonly onClick?: MouseEventHandler<HTMLElement>;
  readonly attributes?: readonly NativeAttribute[];
  readonly children?: ReactNode;
  readonly initialText?: string;
}

export type SharedElementProps = Omit<OriginalElementProps, 'tag'>;
