/** 原档案头像算法：最长边 320px，优先 WebP，旧浏览器及大资料保留 JPEG 回退。 */
export async function compressCharacterAvatar(file: File): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    const url = URL.createObjectURL(file);
    element.onload = () => { URL.revokeObjectURL(url); resolve(element); };
    element.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片无法读取')); };
    element.src = url;
  });
  const scale = Math.min(1, 320 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  let photoUrl = canvas.toDataURL('image/webp', .78);
  if (!photoUrl.startsWith('data:image/webp')) photoUrl = canvas.toDataURL('image/jpeg', .78);
  if (photoUrl.length > 220000) photoUrl = canvas.toDataURL('image/jpeg', .62);
  return photoUrl;
}
