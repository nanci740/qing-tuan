/** 加到主画面：认手机、看是不是已经从主画面打开，安卓 Chrome 的安装视窗先接住（它只在开机时发一次）。 */
interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
const EVENT = 'qingtuan:install-changed';
let deferred: InstallPrompt | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferred = event as InstallPrompt; window.dispatchEvent(new CustomEvent(EVENT)); });
  window.addEventListener('appinstalled', () => { deferred = null; window.dispatchEvent(new CustomEvent(EVENT)); });
}
export const isIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
export const isInstalled = () => window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: fullscreen)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
export const canPromptInstall = () => !!deferred;
/** 跳出 Chrome 的安装视窗；回 true 是装了。 */
export async function promptInstall() {
  if (!deferred) return false;
  const prompt = deferred; deferred = null; window.dispatchEvent(new CustomEvent(EVENT));
  await prompt.prompt();
  return (await prompt.userChoice).outcome === 'accepted';
}
export function subscribeInstall(listener: () => void) {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
