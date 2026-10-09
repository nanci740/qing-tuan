export type ThemeTone = 'mist' | 'vivid';
export function normalizeThemeTone(value: unknown): ThemeTone { return value === 'vivid' ? 'vivid' : 'mist'; }
export function themeToneSettings(tone: ThemeTone) {
    return tone === 'vivid'
        ? { lightness: 0.7, chroma: 0.85, limit: 1 }
        : { lightness: 0.25, chroma: 0.55, limit: 0.025 };
}
export const DEFAULT_THEME_COLOR = '#DDF2F4';
    export function normalizeThemeColor(value: unknown) {
        const color = String(value || '').trim().toUpperCase();
        return /^#[0-9A-F]{6}$/.test(color) ? color : DEFAULT_THEME_COLOR;
    }

    export function themeColorToRgb(hex: string) {
        const value = normalizeThemeColor(hex).slice(1);
        return [
            parseInt(value.slice(0, 2), 16),
            parseInt(value.slice(2, 4), 16),
            parseInt(value.slice(4, 6), 16)
        ];
    }

    export function rgbToHsv(r: number, g: number, b: number) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const d = max - min;
        let h = 0;
        const s = max === 0 ? 0 : d / max;
        const v = max;

        if (d !== 0) {
            switch (max) {
                case r: h = 60 * (((g - b) / d) % 6); break;
                case g: h = 60 * (((b - r) / d) + 2); break;
                default: h = 60 * (((r - g) / d) + 4); break;
            }
        }

        if (h < 0) h += 360;
        return [Math.round(h), Math.round(s * 100), Math.round(v * 100)];
    }

    export function hexToHsv(hex: string) {
        const [r, g, b] = themeColorToRgb(hex);
        return rgbToHsv(r, g, b);
    }

    export function hsvToHex(h: number, s: number, v: number) {
        s /= 100;
        v /= 100;
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        let r1 = 0, g1 = 0, b1 = 0;

        if (h >= 0 && h < 60) [r1, g1, b1] = [c, x, 0];
        else if (h < 120) [r1, g1, b1] = [x, c, 0];
        else if (h < 180) [r1, g1, b1] = [0, c, x];
        else if (h < 240) [r1, g1, b1] = [0, x, c];
        else if (h < 300) [r1, g1, b1] = [x, 0, c];
        else [r1, g1, b1] = [c, 0, x];

        const toHex = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, '0').toUpperCase();
        return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
    }

    // 与 CSS 共用模式参数；保留原始选色，雾灰柔化、鲜明保留更多色度。
    export function themeFrameRgb(rgb: number[], tone: ThemeTone = 'mist') {
        const toLin = (v: number) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const [r, g, b] = rgb.map(toLin);
        const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
        const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
        const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
        let L = 0.2104542553 * l_ + 0.7936617850 * m_ - 0.0040720468 * s_;
        let A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
        let B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
        const C = Math.hypot(A, B);
        const settings = themeToneSettings(tone);
        const Cf = Math.min(settings.limit, C * settings.chroma);
        if (C > 0) { A *= Cf / C; B *= Cf / C; }
        L = 0.94 + (L - 0.94) * settings.lightness;
        const l2 = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
        const m2 = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
        const s2 = Math.pow(L - 0.0894841775 * A - 1.2914855480 * B, 3);
        const lin = [
            4.0767416621 * l2 - 3.3077115913 * m2 + 0.2309699292 * s2,
            -1.2684380046 * l2 + 2.6097574011 * m2 - 0.3413193965 * s2,
            -0.0041960863 * l2 - 0.7034186147 * m2 + 1.7076147010 * s2
        ];
        return lin.map(v => {
            v = Math.min(1, Math.max(0, v));
            return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
        });
    }
