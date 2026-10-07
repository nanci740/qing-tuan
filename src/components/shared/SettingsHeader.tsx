import { OriginalElement } from './OriginalElement';
import type { SharedElementProps } from '../../types/dom';

export function SettingsHeader(props: SharedElementProps) {
  return <OriginalElement tag="div" {...props} />;
}
