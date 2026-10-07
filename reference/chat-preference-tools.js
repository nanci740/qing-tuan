    function getChatPreferenceDefaults() {
        return {
            readReceipt: true,
            timeDisplay: 'group',
            segmented: true,
            segmentDelay: 600,
            customModel: '',
            contextMessages: 30,
            replyLength: 'natural',
            quotePolicy: 'necessary',
            timeAware: true,
            voiceTranscribe: true,
            voiceDirect: false,
            aiVoice: false,
            voiceAutoText: false,
            voiceAutoTranslate: false,
            typingIndicator: true,
            linkedWorldBooks: [],
            openingText: '',
            wallpaperFade: 54,
            wallpaperBlur: 0,
            fontSize: 10.5,
            fontType: 'inherit',
            fontName: '',
            fontUrl: '',
            bubbleCss: '',
            soundFeedback: false,
            vibrationFeedback: false
        };
    }

    function loadChatPreferences() {
        const defaults = getChatPreferenceDefaults();
        try {
            const store = JSON.parse(localStorage.getItem(CHAT_PREFERENCES_BY_CHAT_KEY) || '{}');
            const legacy = JSON.parse(localStorage.getItem(CHAT_PREFERENCES_KEY) || '{}');
            const saved = store?.[getCurrentChatPreferenceKey()] || (getCurrentChatPreferenceKey() === 'moon' ? legacy : {});
            return {
                readReceipt: saved.readReceipt !== false,
                timeDisplay: ['all','group','hidden'].includes(saved.timeDisplay) ? saved.timeDisplay : defaults.timeDisplay,
                segmented: saved.segmented !== false,
                segmentDelay: Math.min(2000, Math.max(200, Number(saved.segmentDelay) || defaults.segmentDelay)),
                customModel: String(saved.customModel || '').trim(),
                contextMessages: Math.min(200, Math.max(10, Number(saved.contextMessages) || defaults.contextMessages)),
                replyLength: ['short','natural','detailed'].includes(saved.replyLength) ? saved.replyLength : defaults.replyLength,
                quotePolicy: ['never','necessary','free'].includes(saved.quotePolicy) ? saved.quotePolicy : defaults.quotePolicy,
                timeAware: saved.timeAware !== false,
                voiceTranscribe: saved.voiceTranscribe !== false,
                voiceDirect: saved.voiceDirect === true,
                aiVoice: saved.aiVoice === true,
                voiceAutoText: saved.voiceAutoText === true,
                voiceAutoTranslate: saved.voiceAutoTranslate === true,
                typingIndicator: saved.typingIndicator !== false,
                linkedWorldBooks: Array.isArray(saved.linkedWorldBooks) ? saved.linkedWorldBooks.map(String) : [],
                openingText: String(saved.openingText || '').slice(0, 800),
                wallpaperFade: Math.min(85, Math.max(0, Number.isFinite(Number(saved.wallpaperFade)) ? Number(saved.wallpaperFade) : defaults.wallpaperFade)),
                wallpaperBlur: Math.min(8, Math.max(0, Number.isFinite(Number(saved.wallpaperBlur)) ? Number(saved.wallpaperBlur) : defaults.wallpaperBlur)),
                fontSize: Math.min(16, Math.max(9, Number(saved.fontSize) || defaults.fontSize)),
                fontType: ['inherit','file','url'].includes(saved.fontType) ? saved.fontType : defaults.fontType,
                fontName: String(saved.fontName || '').slice(0, 160),
                fontUrl: String(saved.fontUrl || '').slice(0, 1800),
                bubbleCss: String(saved.bubbleCss || '').slice(0, 5000),
                soundFeedback: saved.soundFeedback === true,
                vibrationFeedback: saved.vibrationFeedback === true
            };
        } catch (error) {
            return defaults;
        }
    }
    function saveChatPreferences() {
        try {
            const store = JSON.parse(localStorage.getItem(CHAT_PREFERENCES_BY_CHAT_KEY) || '{}');
            store[getCurrentChatPreferenceKey()] = { ...chatPreferences };
            localStorage.setItem(CHAT_PREFERENCES_BY_CHAT_KEY, JSON.stringify(store));
        }
        catch (error) {}
    }
