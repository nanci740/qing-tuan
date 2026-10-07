import { OriginalElement } from './OriginalElement';
import type { SharedElementProps } from '../../types/dom';

export function PixelIcon(props: SharedElementProps) {
  return <OriginalElement tag="svg" {...props} />;
}
