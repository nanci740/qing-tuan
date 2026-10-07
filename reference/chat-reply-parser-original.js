    function extractChatAiReply(data) {
        const content = data?.choices?.[0]?.message?.content ?? data?.content ?? data?.text;
        if (typeof content === 'string') return content.trim();
        if (Array.isArray(content)) return content.map(part => part?.text || '').join('').trim();
        return '';
    }
    // 將不同模型可能回傳的 JSON 外殼統一還原。除了標準 JSON，也兼容：
    // Markdown code fence、JSON 前後夾雜說明、被再次字串化，以及字串內誤放真實換行。
    function parseChatAiJsonEnvelope(raw) {
        const source = String(raw || '').replace(/^\uFEFF/, '').trim();
        if (!source) return null;
        const fenced = source.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
        const candidates = [fenced ? fenced[1].trim() : source];

        function escapeControlsInsideStrings(text) {
            let result = '';
            let inString = false;
            let escaped = false;
            for (const char of text) {
                if (inString) {
                    if (escaped) {
                        result += char;
                        escaped = false;
                    } else if (char === '\\') {
                        result += char;
                        escaped = true;
                    } else if (char === '"') {
                        result += char;
                        inString = false;
                    } else if (char === '\n') result += '\\n';
                    else if (char === '\r') result += '\\r';
                    else if (char === '\t') result += '\\t';
                    else result += char;
                } else {
                    result += char;
                    if (char === '"') inString = true;
                }
            }
            return result;
        }

        // 抽出前後夾有自然語言時的第一個完整物件。
        for (let start = 0; start < source.length; start++) {
            if (source[start] !== '{') continue;
            let depth = 0;
            let inString = false;
            let escaped = false;
            for (let end = start; end < source.length; end++) {
                const char = source[end];
                if (inString) {
                    if (escaped) escaped = false;
                    else if (char === '\\') escaped = true;
                    else if (char === '"') inString = false;
                } else if (char === '"') inString = true;
                else if (char === '{') depth++;
                else if (char === '}' && --depth === 0) {
                    const embedded = source.slice(start, end + 1);
                    if (!candidates.includes(embedded)) candidates.push(embedded);
                    break;
                }
            }
        }

        for (const candidate of candidates) {
            for (const variant of [candidate, escapeControlsInsideStrings(candidate)]) {
                try {
                    let parsed = JSON.parse(variant);
                    // 少數相容接口會把整個 JSON 再包成一個 JSON 字串。
                    if (typeof parsed === 'string' && /^[\s\n]*\{/.test(parsed)) parsed = JSON.parse(parsed);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
                } catch (err) {}
            }
        }
        return null;
    }

    function extractLooseChatAiReplies(raw) {
        const text = String(raw || '');
        const key = /["']replies["']\s*:\s*\[/i.exec(text);
        if (!key) return null;
        const start = key.index + key[0].lastIndexOf('[');
        let end = -1;
        let depth = 0;
        let inString = false;
        let escaped = false;
        for (let index = start; index < text.length; index++) {
            const char = text[index];
            if (inString) {
                if (escaped) escaped = false;
                else if (char === '\\') escaped = true;
                else if (char === '"') inString = false;
            } else if (char === '"') inString = true;
            else if (char === '[') depth++;
            else if (char === ']' && --depth === 0) {
                end = index;
                break;
            }
        }
        if (end < 0) return null;
        const arrayText = text.slice(start, end + 1);
        let replies = [];
        try {
            replies = JSON.parse(arrayText);
        } catch (err) {
            // 最後一道保護：逐個讀取雙引號字串，避免把整包 JSON 顯示給使用者。
            const decode = raw => { try { return JSON.parse('"' + raw + '"'); } catch (decodeError) { return raw.replace(/\\n/g, '\n'); } };
            // 新格式：每则是 {"text":"…","quote_id":"…"}，先照这个读
            const objectPattern = /"text"\s*:\s*"((?:\\.|[^"\\])*)"(?:\s*,\s*"quote_id"\s*:\s*"([^"]*)")?(?:\s*,\s*"recall"\s*:\s*(true|false))?/g;
            let match;
            while ((match = objectPattern.exec(arrayText))) replies.push({ text: decode(match[1]), quote_id: match[2] || '', recall: match[3] === 'true' });
            if (!replies.length) {
                const stringPattern = /"((?:\\.|[^"\\])*)"/g;
                while ((match = stringPattern.exec(arrayText))) replies.push(decode(match[1]));
            }
        }
        replies = Array.isArray(replies)
            ? replies.filter(item => item && (typeof item === 'object' ? String(item.text || item.content || '').trim() : String(item).trim()))
            : [];
        if (!replies.length) return null;
        const quoteMatch = text.match(/["']quote_id["']\s*:\s*["']([^"']*)["']/i);
        return { replies, quote_id: quoteMatch?.[1] || '' };
    }
    // 兼容模型输出纯文本、JSON 代码块、正文 + JSON，以及格式不完整的 JSON。
    // 引用只接受本轮提供的编号；绝不将 JSON 原样显示在聊天气泡中。
    function parseChatAiQuotedReply(raw, quoteChoices = []) {
        const plain = String(raw || '').trim();
        if (!plain) return { reply: '', quote: '', quoteTargetId: '' };
        const availableQuotes = Array.isArray(quoteChoices) ? quoteChoices : [];

        function validReply(obj) {
            return obj && typeof obj === 'object' && !Array.isArray(obj)
                && typeof obj.reply === 'string' && obj.reply.trim();
        }
        function formattedReply(obj) {
            const requestedId = typeof obj.quote_id === 'string' ? obj.quote_id.trim() : '';
            const selected = availableQuotes.find(choice => choice.id === requestedId);
            return {
                reply: obj.reply.trim(),
                quote: selected ? selected.text : '',
                quoteTargetId: selected?.targetId || ''
            };
        }
        function textReply(reply, requestedId = '') {
            const selected = availableQuotes.find(choice => choice.id === String(requestedId || '').trim());
            return {
                reply: String(reply || '').trim(),
                quote: selected ? selected.text : '',
                quoteTargetId: selected?.targetId || ''
            };
        }
        // 舊格式或指令遵循較弱的模型，可能把內部標籤直接輸出。
        // 這裡將它還原為真正的引用卡與回覆正文，不讓標籤顯示在氣泡內。
        const taggedReply = plain.match(/^\s*【引用消息】([\s\S]*?)\s*【本次回复】([\s\S]+)$/);
        if (taggedReply) {
            const quotedText = taggedReply[1].trim();
            const normalizedQuote = quotedText.replace(/\s+/g, ' ');
            const selected = availableQuotes.find(choice =>
                String(choice?.text || '').trim().replace(/\s+/g, ' ') === normalizedQuote
            );
            const parsedInner = parseChatAiQuotedReply(taggedReply[2], availableQuotes);
            return {
                reply: parsedInner.reply,
                quote: selected ? selected.text : parsedInner.quote,
                quoteTargetId: selected?.targetId || parsedInner.quoteTargetId || ''
            };
        }
        // 优先完整 JSON；兼容 Markdown 包裹。
        const fenced = plain.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
        const direct = fenced ? fenced[1] : plain;
        const envelope = parseChatAiJsonEnvelope(direct);
        if (validReply(envelope)) return formattedReply(envelope);
        // collectCurrentChatContext 也會走這裡；順手清理舊版本曾顯示出的 replies JSON。
        const replyList = Array.isArray(envelope?.replies)
            ? envelope.replies.map(item => String((item && typeof item === 'object') ? (item.text ?? item.content ?? '') : (item || '')).trim()).filter(Boolean)
            : (extractLooseChatAiReplies(direct)?.replies || []).map(item => String((item && typeof item === 'object') ? (item.text ?? item.content ?? '') : (item || '')).trim()).filter(Boolean);
        if (replyList.length) {
            return textReply(replyList.join('\n\n'), envelope?.quote_id || '');
        }

        // 查找夹杂在普通正文里的 JSON 对象。逐字符配对花括号，
        // 正确处理字符串中的引号和转义字符，避免用贪婪正则误截断。
        function findEmbeddedReply(text) {
            for (let start = 0; start < text.length; start++) {
                if (text[start] !== '{') continue;
                let depth = 0;
                let inString = false;
                let escaped = false;
                for (let end = start; end < text.length; end++) {
                    const char = text[end];
                    if (inString) {
                        if (escaped) escaped = false;
                        else if (char === '\\') escaped = true;
                        else if (char === '"') inString = false;
                    } else if (char === '"') inString = true;
                    else if (char === '{') depth++;
                    else if (char === '}') {
                        depth--;
                        if (depth === 0) {
                            try {
                                const parsed = JSON.parse(text.slice(start, end + 1));
                                if (validReply(parsed)) return formattedReply(parsed);
                            } catch (err) {}
                            break;
                        }
                    }
                }
            }
            return null;
        }
        const embedded = findEmbeddedReply(plain);
        if (embedded) return embedded;

        // 兼容模型遺失 {"reply":" 開頭，只剩「正文","quote_id":""}」的回覆。
        // quote_id 只會從本輪候選編號取值，不會因殘缺格式產生錯誤引用。
        const danglingQuoteSuffix = plain.match(/^([\s\S]*?)["']\s*,\s*["']quote_id["']\s*:\s*["']([^"']*)["']\s*\}?\s*`{0,3}\s*$/i);
        if (danglingQuoteSuffix) {
            const reply = danglingQuoteSuffix[1]
                .replace(/^(?:```(?:json)?\s*)?\{\s*["']reply["']\s*:\s*["']/i, '')
                .trim();
            if (reply) return textReply(reply, danglingQuoteSuffix[2]);
        }
        // 另一種常見殘缺：正文後面只多了一個 {"quote_id":""}。
        const trailingQuoteObject = plain.match(/^([\s\S]*?)\s*\{\s*["']quote_id["']\s*:\s*["']([^"']*)["']\s*\}\s*$/i);
        if (trailingQuoteObject?.[1]?.trim()) {
            return textReply(trailingQuoteObject[1], trailingQuoteObject[2]);
        }

        // JSON 不完整时，只提取正文，去掉无法解析的结构化片段。
        // 不试图从无效 JSON 里猜测引用编号，以免显示错引文。
        const looksLikeReplyJson = /["']reply["']\s*:/i.test(plain);
        if (looksLikeReplyJson) {
            const match = plain.match(/["']reply["']\s*:\s*"((?:\\.|[^"\\])*)"/);
            if (match) {
                try {
                    const content = JSON.parse('"' + match[1] + '"').trim();
                    if (content) return { reply: content, quote: '' };
                } catch (err) {}
            }
            // 格式损坏但含有自然语言前缀时，仅保留前缀。
            const beforeJson = plain.split(/(?:```(?:json)?\s*)?\{\s*["']reply["']\s*:/i)[0]
                .replace(/```(?:json)?\s*$/i, '').trim();
            if (beforeJson) return { reply: beforeJson, quote: '' };
            return { reply: '这条回复的格式有误，请重试。', quote: '' };
        }
        return { reply: plain.replace(/^```(?:text)?\s*|\s*```$/gi, '').trim(), quote: '' };
    }
    function parseChatAiSegmentedReply(raw, quoteChoices = []) {
        const plain = String(raw || '').trim();
        const availableQuotes = Array.isArray(quoteChoices) ? quoteChoices : [];
        // 外层 JSON 坏掉时，解析器可能只抓到里面某一则 {"text":…}，那不算数，改用宽松解析读整串 replies
        const envelope = parseChatAiJsonEnvelope(plain);
        const parsedObject = Array.isArray(envelope?.replies) ? envelope : (extractLooseChatAiReplies(plain) || envelope);
        // replies 每一则可以是字串，也可以是 {"text":"…","quote_id":"u3"}：每则各自引用（引用会挂在那一则上面）
        const structuredItems = Array.isArray(parsedObject?.replies)
            ? parsedObject.replies.map(item => {
                if (item && typeof item === 'object') {
                    return {
                        text: String(item.text ?? item.content ?? item.message ?? '').trim(),
                        quoteId: String(item.quote_id ?? item.quoteId ?? '').trim(),
                        recall: item.recall === true || item.recall === 'true',
                        voice: item.voice === true || item.voice === 'true'
                    };
                }
                return { text: String(item || '').trim(), quoteId: '', recall: false, voice: false };
            }).filter(item => item.text)
            : [];
        if (structuredItems.length) {
            // 旧格式：整包只有一个 quote_id → 挂在第一则
            const topId = typeof parsedObject.quote_id === 'string' ? parsedObject.quote_id.trim() : '';
            if (topId && !structuredItems.some(item => item.quoteId)) structuredItems[0].quoteId = topId;
            const quotes = structuredItems.map(item => {
                const selected = item.quoteId ? availableQuotes.find(choice => choice.id === item.quoteId) : null;
                return selected ? { quote: selected.text, quoteTargetId: selected.targetId || '' } : null;
            });
            const firstQuote = quotes.find(Boolean);
            return {
                presence: parsedObject.presence && typeof parsedObject.presence === 'object' ? parsedObject.presence : null,
                segments: structuredItems.map(item => item.text),
                recalls: structuredItems.map(item => item.recall),
                voices: structuredItems.map(item => item.voice),
                quotes,
                quote: firstQuote?.quote || '',
                quoteTargetId: firstQuote?.quoteTargetId || ''
            };
        }
        const parsed = parseChatAiQuotedReply(plain, availableQuotes);
        // 含結構化鍵但仍無法解析時，顯示可重試提示，絕不把 JSON 原文塞進氣泡。
        if (/["'](?:replies|reply|quote_id)["']\s*:/i.test(plain) && parsed.reply === plain) {
            return { segments: ['这条回复的格式有误，请重试。'], quotes: [null], quote: '', quoteTargetId: '' };
        }
        const segments = String(parsed.reply || '')
            .split(/\n\s*\n|\s*<split>\s*/i)
            .map(item => item.trim()).filter(Boolean);
        const finalSegments = segments.length ? segments : ['这条回复的格式有误，请重试。'];
        return {
            segments: finalSegments,
            quotes: finalSegments.map((_, index) => index === 0 && parsed.quote ? { quote: parsed.quote, quoteTargetId: parsed.quoteTargetId || '' } : null),
            quote: parsed.quote || '',
            quoteTargetId: parsed.quoteTargetId || ''
        };
    }
