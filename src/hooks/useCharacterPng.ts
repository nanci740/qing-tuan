import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { CharacterPngEditorBridge } from '../types/characterDossier';
import { readDossierFromPng, renderDossierPhotoPng } from '../utils/characterPng';
import { showToast } from '../utils/toast';

/** PNG 文件事件由 React 负责；仅档案编辑器的存储提交暂时经过适配接口。 */
export function useCharacterPng() {
  const [editor, setEditor] = useState<CharacterPngEditorBridge | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const downloadLink = useRef<HTMLAnchorElement>(null);
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
  useLayoutEffect(() => {
    const ready = (event: Event) => setEditor((event as CustomEvent<CharacterPngEditorBridge>).detail);
    const container = (event: Event) => { const node = (event as CustomEvent<HTMLElement | null>).detail; setEditor(current => current && current.container !== node ? { ...current, container: node } : current); };
    window.addEventListener('qingtuan:character-png-container', container);
    window.addEventListener('qingtuan:character-png-editor', ready);
    return () => { window.removeEventListener('qingtuan:character-png-editor', ready); window.removeEventListener('qingtuan:character-png-container', container); };
  }, []);

  async function exportPng() {
    if (!editor) return;
    const record = editor.readCurrent();
    if (!(record.name || record.nickname || '').trim()) { showToast('请先填写角色名字'); return; }
    if (!record.photoUrl) { showToast('请先上传角色头像'); return; }
    try {
      const blob = await renderDossierPhotoPng(record);
      const url = URL.createObjectURL(blob);
      const name = (record.name || record.nickname || '角色').replace(/[\\/:*?"<>|]/g, '_') + '_角色档案.png';
      flushSync(() => setDownload({ url, name }));
      downloadLink.current!.click();
      flushSync(() => setDownload(null));
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      showToast('角色 PNG 已导出');
    } catch { showToast('PNG 导出失败，请稍后再试'); }
  }

  const importing=useRef(false);
  async function importPng(file?: File) {
    if (!file || !editor) return;
    if(importing.current)return showToast('正在处理导入，请稍候');
    importing.current=true;
    try {
      if(file.size>20*1024*1024)throw Error('PNG 档案不可超过 20 MB');
      const imported = readDossierFromPng(await file.arrayBuffer());
      if (!imported.photoUrl) {
        imported.photoUrl = await new Promise<string | ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result || '');
          reader.onerror = () => reject(new Error('角色图片读取失败'));
          reader.readAsDataURL(file);
        });
        imported.photoPositionX = 50;
        imported.photoPositionY = 50;
      }
      const restored = await editor.commitImport(imported);
      if(!restored)return;
      showToast('已从 PNG 导入 ' + (restored.name || restored.nickname || '新角色'));
    } catch (error) {
      showToast((error as { message?: string } | null)?.message || 'PNG 档案读取失败');
    } finally {importing.current=false;}
  }
  return { editor, input, download, downloadLink, exportPng, importPng };
}
