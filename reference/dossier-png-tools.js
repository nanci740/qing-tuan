const DOSSIER_PNG_CHUNK = 'spCH';
let dossierFontLoadKey = '';
const readStoredDossierFont = () => new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'));
    const request = indexedDB.open('smallphone_custom_font_db', 1);
    request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('font_store')) {
            db.close();
            resolve(null);
            return;
        }
        const tx = db.transaction('font_store', 'readonly');
        const getRequest = tx.objectStore('font_store').get('active_font');
        getRequest.onsuccess = () => { const value = getRequest.result || null; db.close(); resolve(value); };
        getRequest.onerror = () => { db.close(); reject(getRequest.error); };
    };
    request.onerror = () => reject(request.error);
});
const applyDossierAppearance = async (appearance = {}) => {
    const root = document.documentElement;
    const accent = appearance.themeColor || localStorage.getItem('smallphone_theme_color') || '#DDF2F4';
    const fallbackFont = appearance.fontFamily || 'Georgia, "LXGW 975 Yuan SC 400W", "PingFang SC", "Times New Roman", serif';
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-dark', 'color-mix(in srgb, ' + accent + ' 76%, #5F6772)');
    root.style.setProperty('--accent-button-text', 'color-mix(in srgb, ' + accent + ' 75%, #5F6772)');
    root.style.setProperty('--tape', 'color-mix(in srgb, ' + accent + ' 58%, transparent)');
    root.style.setProperty('--smallphone-font', fallbackFont);
    const type = localStorage.getItem('smallphone_custom_font_type') || '';
    const name = localStorage.getItem('smallphone_custom_font_name') || '';
    const url = localStorage.getItem('smallphone_custom_font_url') || '';
    const loadKey = [type, name, url].join('|');
    if (!type || dossierFontLoadKey === loadKey) return;
    try {
        let source = '';
        if (type === 'url' && url) source = 'url("' + url.replace(/"/g, '%22') + '")';
        if (type === 'file') {
            const record = await readStoredDossierFont();
            if (record?.blob) source = await record.blob.arrayBuffer();
        }
        if (!source) return;
        const fontFace = new FontFace('SmallPhoneCustomFont', source);
        await fontFace.load();
        document.fonts.add(fontFace);
        dossierFontLoadKey = loadKey;
        root.style.setProperty('--smallphone-font', '"SmallPhoneCustomFont", Georgia, "LXGW 975 Yuan SC 400W", "PingFang SC", serif');
    } catch (error) { }
};
const todayStampDate = () => { const now = new Date(); return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('.'); };
const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c >>> 0;
    }
    return table;
})();
const crc32 = (bytes) => {
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
};
const pngChunk = (type, data) => {
    const typeBytes = new TextEncoder().encode(type);
    const output = new Uint8Array(12 + data.length);
    const view = new DataView(output.buffer);
    view.setUint32(0, data.length);
    output.set(typeBytes, 4);
    output.set(data, 8);
    const crcInput = new Uint8Array(typeBytes.length + data.length);
    crcInput.set(typeBytes);
    crcInput.set(data, typeBytes.length);
    view.setUint32(8 + data.length, crc32(crcInput));
    return output;
};
const buildPortableCharacterData = (dossier) => ({
    format: 'character-card',
    formatVersion: 1,
    generator: 'qingtuan-phone',
    character: {
        name: dossier.name || '',
        nickname: dossier.nickname || '',
        birthday: dossier.birthday || '',
        constellation: dossier.constellation || '',
        relationship: dossier.relationship || '',
        mbti: dossier.mbti || '',
        quote: dossier.quote || '',
        appearance: dossier.appearanceText || '',
        speechHabits: dossier.speechHabitsText || '',
        onlineStyle: dossier.onlineStyle || '',
        offlineStyle: dossier.offlineStyle || '',
        memories: dossier.memoriesText || '',
        otherSettings: dossier.otherSettingsText || '',
        secretMemo: dossier.secretMemo || '',
        favoriteThings: dossier.favoriteThings || '',
        dislikes: dossier.dislikes || '',
        tags: Array.isArray(dossier.selectedTags) ? dossier.selectedTags : [],
        photo: dossier.photoUrl || '',
        photoPositionX: Number(dossier.photoPositionX ?? 50),
        photoPositionY: Number(dossier.photoPositionY ?? 50)
    }
});
const makeITXtChunk = (keyword, value) => {
    const key = new TextEncoder().encode(keyword);
    const body = new TextEncoder().encode(value);
    const data = new Uint8Array(key.length + 5 + body.length);
    let p = 0;
    data.set(key, p); p += key.length;
    data[p++] = 0; // keyword terminator
    data[p++] = 0; // uncompressed
    data[p++] = 0; // compression method
    data[p++] = 0; // language tag terminator
    data[p++] = 0; // translated keyword terminator
    data.set(body, p);
    return pngChunk('iTXt', data);
};
const readITXt = (data) => {
    const first = data.indexOf(0);
    if (first < 0) return null;
    const keyword = String.fromCharCode(...data.slice(0, first));
    const compressionFlag = data[first + 1];
    if (compressionFlag !== 0) return null;
    let p = first + 3;
    const langEnd = data.indexOf(0, p);
    if (langEnd < 0) return null;
    p = langEnd + 1;
    const translatedEnd = data.indexOf(0, p);
    if (translatedEnd < 0) return null;
    p = translatedEnd + 1;
    return { keyword, value: new TextDecoder().decode(data.slice(p)) };
};
const normalizePortableCharacter = (raw) => {
    const c = raw?.character || raw?.dossier || raw?.data || raw || {};
    const pick = (...v) => v.find(x => x !== undefined && x !== null && x !== '');
    return {
        name: pick(c.name, c.characterName, ''),
        nickname: pick(c.nickname, c.alias, ''),
        birthday: pick(c.birthday, c.birthDate, ''),
        constellation: pick(c.constellation, c.zodiac, ''),
        relationship: pick(c.relationship, c.relation, ''),
        mbti: pick(c.mbti, c.MBTI, ''),
        quote: pick(c.quote, c.signature, ''),
        appearanceText: pick(c.appearanceText, c.appearance, c.description, c.persona, ''),
        speechHabitsText: pick(c.speechHabitsText, c.speechHabits, c.speechStyle, ''),
        onlineStyle: pick(c.onlineStyle, c.online, ''),
        offlineStyle: pick(c.offlineStyle, c.offline, ''),
        memoriesText: pick(c.memoriesText, c.memories, c.memory, c.backstory, ''),
        otherSettingsText: pick(c.otherSettingsText, c.otherSettings, c.additionalSettings, c.extraSettings, ''),
        secretMemo: pick(c.secretMemo, c.memo, c.note, ''),
        favoriteThings: pick(c.favoriteThings, c.likes, ''),
        dislikes: pick(c.dislikes, ''),
        selectedTags: Array.isArray(c.selectedTags) ? c.selectedTags : (Array.isArray(c.tags) ? c.tags : []),
        photoUrl: pick(c.photoUrl, c.photo, c.avatar, c.image, ''),
        photoPositionX: Number(pick(c.photoPositionX, 50)),
        photoPositionY: Number(pick(c.photoPositionY, 50))
    };
};
const encodeBase64Utf8 = (value) => {
    const bytes = new TextEncoder().encode(String(value || ''));
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
};
const makeTextChunk = (keyword, value) => {
    const key = new TextEncoder().encode(keyword);
    const body = new TextEncoder().encode(String(value || ''));
    const data = new Uint8Array(key.length + 1 + body.length);
    data.set(key, 0);
    data[key.length] = 0;
    data.set(body, key.length + 1);
    return pngChunk('tEXt', data);
};
const buildCharaCardV3 = (dossier) => {
    const portable = buildPortableCharacterData(dossier).character;
    const descriptionLines = [
        'name: ' + (dossier.name || ''),
        dossier.nickname ? 'nickname: ' + dossier.nickname : '',
        dossier.birthday ? 'birthday: ' + dossier.birthday : '',
        dossier.constellation ? 'constellation: ' + dossier.constellation : '',
        dossier.relationship ? 'relationship: ' + dossier.relationship : '',
        dossier.mbti ? 'mbti: ' + dossier.mbti : '',
        dossier.appearanceText ? 'appearance: |\n  ' + String(dossier.appearanceText).replace(/\n/g, '\n  ') : '',
        dossier.favoriteThings ? 'likes: |\n  ' + String(dossier.favoriteThings).replace(/\n/g, '\n  ') : '',
        dossier.dislikes ? 'dislikes: |\n  ' + String(dossier.dislikes).replace(/\n/g, '\n  ') : '',
        dossier.otherSettingsText ? 'other_settings: |\n  ' + String(dossier.otherSettingsText).replace(/\n/g, '\n  ') : ''
    ].filter(Boolean);
    return {
        spec: 'chara_card_v3',
        spec_version: '3.0',
        data: {
            name: dossier.name || dossier.nickname || '未命名角色',
            description: descriptionLines.join('\n'),
            personality: dossier.speechHabitsText || '',
            scenario: dossier.memoriesText || '',
            first_mes: dossier.quote || '',
            mes_example: '',
            creator_notes: dossier.secretMemo || '',
            system_prompt: '',
            post_history_instructions: '',
            alternate_greetings: [],
            character_book: null,
            tags: Array.isArray(dossier.selectedTags) ? dossier.selectedTags : [],
            creator: '青团小手机',
            character_version: '1.0',
            nickname: dossier.nickname || '',
            creator_notes_multilingual: {},
            source: ['qingtuan-phone'],
            group_only_greetings: [],
            creation_date: Math.floor(Date.now() / 1000),
            modification_date: Math.floor(Date.now() / 1000),
            extensions: {
                qingtuan: {
                    version: 1,
                    character: portable
                }
            }
        }
    };
};
const buildCharaCardV2 = (dossier) => {
    const v3 = buildCharaCardV3(dossier);
    const d = v3.data;
    return {
        spec: 'chara_card_v2',
        spec_version: '2.0',
        data: {
            name: d.name || '',
            description: d.description || '',
            personality: d.personality || '',
            scenario: d.scenario || '',
            first_mes: d.first_mes || '',
            mes_example: d.mes_example || '',
            creator_notes: d.creator_notes || '',
            system_prompt: d.system_prompt || '',
            post_history_instructions: d.post_history_instructions || '',
            alternate_greetings: Array.isArray(d.alternate_greetings) ? d.alternate_greetings : [],
            character_book: d.character_book || null,
            tags: Array.isArray(d.tags) ? d.tags : [],
            creator: d.creator || '青团小手机',
            character_version: d.character_version || '1.0',
            extensions: d.extensions || {}
        }
    };
};
const attachDossierToPng = async (blob, dossier) => {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let offset = 8;
    let iendOffset = bytes.length;
    while (offset + 12 <= bytes.length) {
        const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
        const length = view.getUint32(0);
        const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
        if (type === 'IEND') { iendOffset = offset; break; }
        offset += 12 + length;
    }
    const privatePayload = new TextEncoder().encode(JSON.stringify({ app: 'qingtuan-phone', version: 1, dossier }));
    const portablePayload = JSON.stringify(buildPortableCharacterData(dossier));
    const ccv3Payload = encodeBase64Utf8(JSON.stringify(buildCharaCardV3(dossier)));
    const charaPayload = encodeBase64Utf8(JSON.stringify(buildCharaCardV2(dossier)));
    return new Blob([
        bytes.slice(0, iendOffset),
        pngChunk(DOSSIER_PNG_CHUNK, privatePayload),
        makeITXtChunk('qingtuan-character', portablePayload),
        makeTextChunk('ccv3', ccv3Payload),
        makeTextChunk('chara', charaPayload),
        bytes.slice(iendOffset)
    ], { type: 'image/png' });
};
const decodeBase64Utf8 = (value) => {
    const binary = atob(String(value || '').trim());
    const data = Uint8Array.from(binary, ch => ch.charCodeAt(0));
    return new TextDecoder().decode(data);
};
const readTextChunk = (data) => {
    const first = data.indexOf(0);
    if (first < 0) return null;
    const decoder = new TextDecoder();
    const keyword = decoder.decode(data.slice(0, first));
    const value = decoder.decode(data.slice(first + 1));
    return { keyword, value };
};
const pickYamlField = (text, names) => {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    for (const name of names) {
        const prefix = String(name).toLowerCase() + ':';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.toLowerCase().startsWith(prefix)) continue;
            let value = trimmed.slice(prefix.length).trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            return value;
        }
    }
    return '';
};
const pickYamlBlock = (text, names) => {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    for (const name of names) {
        const target = String(name).toLowerCase();
        for (let i = 0; i < lines.length; i++) {
            const raw = lines[i];
            const match = raw.match(/^(\s*)([^:#]+):\s*(.*)$/);
            if (!match || match[2].trim().toLowerCase() !== target) continue;
            const baseIndent = match[1].replace(/\t/g, '    ').length;
            const inline = match[3].trim();
            if (inline && inline !== '|' && inline !== '>') {
                return inline.replace(/^["']|["']$/g, '');
            }
            const out = [];
            for (let j = i + 1; j < lines.length; j++) {
                const next = lines[j];
                if (!next.trim()) {
                    if (out.length) out.push('');
                    continue;
                }
                const indent = (next.match(/^\s*/) || [''])[0].replace(/\t/g, '    ').length;
                if (indent <= baseIndent) break;
                out.push(next.slice(Math.min(next.length, baseIndent + 2)));
            }
            return out.join('\n').trim();
        }
    }
    return '';
};
const collectExtraYamlBlocks = (text, excludedNames = []) => {
    const lines = String(text || '').replace(/\r/g, '').split('\n');
    const excluded = new Set(excludedNames.map(name => String(name).toLowerCase()));
    const blocks = [];
    let i = 0;
    while (i < lines.length) {
        const raw = lines[i];
        const match = raw.match(/^([^\s:#][^:#]*):\s*(.*)$/);
        if (!match) {
            i++;
            continue;
        }
        const key = match[1].trim();
        const start = i;
        i++;
        while (i < lines.length) {
            const next = lines[i];
            if (/^[^\s:#][^:#]*:\s*(.*)$/.test(next)) break;
            i++;
        }
        if (!excluded.has(key.toLowerCase())) {
            const block = lines.slice(start, i).join('\n').trim();
            if (block) blocks.push(block);
        }
    }
    return blocks;
};
const stringifyExtraCardField = (label, value) => {
    if (value === undefined || value === null || value === '') return '';
    if (Array.isArray(value) && value.length === 0) return '';
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) return '';
    if (typeof value === 'string') return label + ':\n' + value.trim();
    try {
        return label + ':\n' + JSON.stringify(value, null, 2);
    } catch (error) {
        return label + ':\n' + String(value);
    }
};
const normalizeCharaCardV3 = (payload) => {
    const c = payload?.data || {};
    if (c?.extensions?.qingtuan?.character) {
        return normalizePortableCharacter({ character: c.extensions.qingtuan.character });
    }

    const description = String(c.description || '');
    const birth = pickYamlField(description, ['birth', 'birthday', 'birthDate']);
    const constellationMatch = birth.match(/[（(]([^）)]+)[）)]/);

    const coreBlock = pickYamlBlock(description, ['Core_Identity']);
    const physicalBlock = pickYamlBlock(description, ['Physical_Manifestation', 'appearance']);
    const psycheBlock = pickYamlBlock(description, ['Psyche_Matrix', 'background', 'backstory']);
    const behaviorBlock = pickYamlBlock(description, ['Behavioral_Blueprint']);
    const speechBlock = pickYamlBlock(description, ['speech_style', 'speech_style_examples', 'speech']);
    const relationshipBlock = pickYamlBlock(description, ['Dynamic_Interaction_Engine', 'relationships']);
    const favoriteBlock = pickYamlBlock(description, ['favorites', 'likes', 'preferences']);

    const familyBlock = pickYamlBlock(description, ['family']);
    const cultivationBlock = pickYamlBlock(description, ['cultivation']);
    const traumaBlock = pickYamlBlock(description, ['past_trauma', 'trauma', 'history']);
    const conflictBlock = pickYamlBlock(description, ['core_conflict', 'conflict']);
    const userBlock = pickYamlBlock(description, ['user']);
    const renPingjiangBlock = pickYamlBlock(description, ['ren_pingjiang']);
    const possessorBlock = pickYamlBlock(description, ['the_possessor', 'possessor']);
    const explicitOtherBlock = pickYamlBlock(description, ['other_settings', 'additional_settings', 'extra_settings']);

    const extraDescriptionBlocks = collectExtraYamlBlocks(description, [
        'Core_Identity',
        'Physical_Manifestation',
        'appearance',
        'Psyche_Matrix',
        'background',
        'backstory',
        'Behavioral_Blueprint',
        'speech_style',
        'speech_style_examples',
        'speech',
        'Dynamic_Interaction_Engine',
        'relationships',
        'favorites',
        'likes',
        'preferences',
        'family',
        'cultivation',
        'past_trauma',
        'trauma',
        'history',
        'core_conflict',
        'conflict',
        'user',
        'ren_pingjiang',
        'the_possessor',
        'possessor',
        'other_settings',
        'additional_settings',
        'extra_settings'
    ]);

    const appearanceParts = [
        pickYamlField(description, ['age']) ? '年龄：' + pickYamlField(description, ['age']) : '',
        pickYamlField(description, ['height']) ? '身高：' + pickYamlField(description, ['height']) : '',
        pickYamlField(description, ['build']) ? '体型：' + pickYamlField(description, ['build']) : '',
        physicalBlock
    ].filter(Boolean);

    const speechParts = [
        behaviorBlock,
        speechBlock,
        String(c.personality || '')
    ].filter(Boolean);

    const memoryParts = [
        familyBlock ? 'family:\n' + familyBlock : '',
        cultivationBlock ? 'cultivation:\n' + cultivationBlock : '',
        traumaBlock ? 'past_trauma:\n' + traumaBlock : '',
        conflictBlock ? 'core_conflict:\n' + conflictBlock : '',
        psycheBlock,
        String(c.scenario || '')
    ].filter(Boolean);

    const highConcept = pickYamlField(description, ['high_concept']);
    const otherSettingParts = [
        explicitOtherBlock,
        highConcept ? 'high_concept:\n' + highConcept : '',
        userBlock ? 'user:\n' + userBlock : '',
        renPingjiangBlock ? 'ren_pingjiang:\n' + renPingjiangBlock : '',
        possessorBlock ? 'the_possessor:\n' + possessorBlock : '',
        relationshipBlock,
        ...extraDescriptionBlocks,
        stringifyExtraCardField('first_mes', c.first_mes),
        stringifyExtraCardField('mes_example', c.mes_example),
        stringifyExtraCardField('system_prompt', c.system_prompt),
        stringifyExtraCardField('post_history_instructions', c.post_history_instructions),
        stringifyExtraCardField('alternate_greetings', c.alternate_greetings),
        stringifyExtraCardField('group_only_greetings', c.group_only_greetings),
        stringifyExtraCardField('character_book', c.character_book),
        stringifyExtraCardField('creator_notes_multilingual', c.creator_notes_multilingual)
    ].filter(Boolean);

    return {
        name: c.name || pickYamlField(description, ['name']) || '',
        nickname: c.nickname || pickYamlField(description, ['epithet', 'nickname']) || '',
        birthday: birth ? birth.replace(/[（(][^）)]+[）)]/g, '').trim() : '',
        constellation: constellationMatch ? constellationMatch[1] : '',
        relationship: pickYamlField(description, ['status', 'relationship']) || '',
        mbti: pickYamlField(description, ['mbti']) || '',
        quote: '',
        appearanceText: appearanceParts.join('\n\n') || description,
        speechHabitsText: speechParts.join('\n\n'),
        onlineStyle: pickYamlField(description, ['onlineStyle', 'online_style']) || '',
        offlineStyle: pickYamlField(description, ['offlineStyle', 'offline_style']) || '',
        memoriesText: memoryParts.join('\n\n') || coreBlock,
        otherSettingsText: otherSettingParts.join('\n\n'),
        secretMemo: String(c.creator_notes || ''),
        favoriteThings: pickYamlField(description, ['favoriteThings', 'likes']) || favoriteBlock,
        dislikes: pickYamlField(description, ['dislikes']) || '',
        selectedTags: Array.isArray(c.tags) ? c.tags : [],
        photoUrl: '',
        photoPositionX: 50,
        photoPositionY: 50
    };
};
const readDossierFromPng = (buffer) => {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 12 || bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) throw new Error('不是有效的 PNG 图片');
    let offset = 8;
    let portable = null;
    let ccv3Card = null;
    let charaCard = null;
    while (offset + 12 <= bytes.length) {
        const view = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
        const length = view.getUint32(0);
        const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
        if (offset + 12 + length > bytes.length) break;
        const data = bytes.slice(offset + 8, offset + 8 + length);
        if (type === DOSSIER_PNG_CHUNK) {
            const payload = JSON.parse(new TextDecoder().decode(data));
            if (payload?.app === 'qingtuan-phone' && payload.dossier) return payload.dossier;
        }
        if (type === 'iTXt') {
            const entry = readITXt(data);
            if (entry?.keyword === 'qingtuan-character') portable = entry.value;
        }
        if (type === 'tEXt') {
            const entry = readTextChunk(data);
            if (entry?.keyword === 'ccv3') {
                try {
                    ccv3Card = JSON.parse(decodeBase64Utf8(entry.value));
                } catch (error) { }
            } else if (entry?.keyword === 'chara') {
                try {
                    charaCard = JSON.parse(decodeBase64Utf8(entry.value));
                } catch (error) { }
            }
        }
        offset += 12 + length;
    }
    if (portable) return normalizePortableCharacter(JSON.parse(portable));
    if (ccv3Card?.spec === 'chara_card_v3' || ccv3Card?.data?.name) return normalizeCharaCardV3(ccv3Card);
    if (charaCard?.spec === 'chara_card_v3' || charaCard?.data?.name) return normalizeCharaCardV3(charaCard);
    throw new Error('这张 PNG 没有可读取的角色档案资料');
};
const loadCanvasImage = (src) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
});
const renderDossierPhotoPng = async (dossier) => {
    if (!dossier.photoUrl) throw new Error('请先添加角色照片');
    const image = await loadCanvasImage(dossier.photoUrl);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width || 1024;
    canvas.height = image.naturalHeight || image.height || 1024;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG 转换失败')), 'image/png'));
    return attachDossierToPng(blob, dossier);
};
const wrapCanvasText = (ctx, value, x, y, maxWidth, lineHeight, maxLines = 3) => {
    const chars = Array.from(String(value || '—'));
    let line = '';
    let row = 0;
    for (let i = 0; i < chars.length && row < maxLines; i++) {
        const test = line + chars[i];
        if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, x, y + row * lineHeight);
            line = chars[i];
            row++;
        } else line = test;
    }
    if (row < maxLines && line) ctx.fillText(line, x, y + row * lineHeight);
};
const renderDossierCardPng = async (dossier) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#F4F1EA';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#FCFBF7';
    ctx.strokeStyle = '#D8D5CE';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(70, 70, 1060, 1460, 26);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5F6772';
    ctx.font = '700 54px sans-serif';
    ctx.fillText('角色档案', 120, 165);
    ctx.font = '600 25px sans-serif';
    ctx.fillStyle = '#8F96A0';
    ctx.fillText(dossier.fileNo || '· FILE', 890, 158);
    ctx.fillStyle = '#DDF2F4';
    ctx.fillRect(120, 192, 960, 8);
    ctx.fillStyle = '#ECEFF2';
    ctx.fillRect(120, 245, 330, 390);
    if (dossier.photoUrl) {
        try {
            const image = await loadCanvasImage(dossier.photoUrl);
            const scale = Math.max(330 / image.width, 390 / image.height);
            const width = image.width * scale;
            const height = image.height * scale;
            const px = Number(dossier.photoPositionX ?? 50) / 100;
            const py = Number(dossier.photoPositionY ?? 50) / 100;
            ctx.save();
            ctx.beginPath();
            ctx.rect(120, 245, 330, 390);
            ctx.clip();
            ctx.drawImage(image, 120 - (width - 330) * px, 245 - (height - 390) * py, width, height);
            ctx.restore();
        } catch (error) { }
    }
    ctx.fillStyle = '#5F6772';
    ctx.font = '700 46px sans-serif';
    ctx.fillText(dossier.name || dossier.nickname || '未命名角色', 510, 300);
    ctx.font = '500 25px sans-serif';
    ctx.fillStyle = '#7E8791';
    const basics = [
        ['昵称', dossier.nickname], ['生日', dossier.birthday], ['星座', dossier.constellation],
        ['关系', dossier.relationship], ['MBTI', dossier.mbti]
    ];
    basics.forEach((item, index) => {
        ctx.fillStyle = '#9AA1AA';
        ctx.fillText(item[0], 510, 365 + index * 58);
        ctx.fillStyle = '#5F6772';
        ctx.fillText(item[1] || '—', 620, 365 + index * 58);
    });
    const sections = [
        ['专属寄语', dossier.quote],
        ['外貌与气质', dossier.appearanceText],
        ['性格标签', (dossier.selectedTags || []).join(' · ')],
        ['说话习惯', dossier.speechHabitsText],
        ['喜欢', dossier.favoriteThings],
        ['不喜欢', dossier.dislikes],
        ['相遇回忆', dossier.memoriesText],
        ['其他设定', dossier.otherSettingsText]
    ];
    let y = 720;
    sections.forEach(([label, value]) => {
        ctx.fillStyle = '#8EB1BB';
        ctx.font = '700 25px sans-serif';
        ctx.fillText(label, 120, y);
        ctx.fillStyle = '#5F6772';
        ctx.font = '400 23px sans-serif';
        wrapCanvasText(ctx, value, 120, y + 40, 940, 34, 2);
        y += 120;
    });
    ctx.save();
    ctx.translate(945, 1370);
    ctx.rotate(-0.16);
    ctx.strokeStyle = '#B84A39';
    ctx.fillStyle = '#B84A39';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 100, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = '700 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MEMORY ARCHIVE', 0, -12);
    ctx.font = '600 22px sans-serif';
    ctx.fillText(dossier.stampDate || todayStampDate(), 0, 28);
    ctx.restore();
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('PNG 生成失败')), 'image/png'));
    return attachDossierToPng(blob, dossier);
};
