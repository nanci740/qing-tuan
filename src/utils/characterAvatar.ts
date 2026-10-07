import { prepareImage } from './imageAssets';
export function compressCharacterAvatar(file: File) { return prepareImage(file, 320, .78); }
