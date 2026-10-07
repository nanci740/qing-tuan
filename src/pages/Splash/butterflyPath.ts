// 原蝴蝶轨迹计算保留；按需计算，不使用全局可变状态。
export function createButterflyPath() {
        function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number) {
            const t2 = t * t;
            const t3 = t2 * t;
            return 0.5 * (
                (2 * p1) +
                (-p0 + p2) * t +
                (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                (-p0 + 3 * p1 - 3 * p2 + p3) * t3
            );
        }

        function catmullRomDeriv(p0: number, p1: number, p2: number, p3: number, t: number) {
            const t2 = t * t;
            return 0.5 * (
                (-p0 + p2) +
                (2 * p0 - 5 * p1 + 4 * p2 - p3) * 2 * t +
                (-p0 + 3 * p1 - 3 * p2 + p3) * 3 * t2
            );
        }

        const CONTROL_POINTS = [
            [-70, 60], [-35, 68], [45, 86], [116, 112], [168, 70],
            [222, 32], [258, 38], [265, 70], [240, 96], [180, 105],
            [112, 108], [45, 112], [18, 132], [22, 162], [48, 192],
            [82, 206], [112, 200], [125, 184], [132, 133]
        ];

        const numSegs = CONTROL_POINTS.length - 3;
        const SAMPLES: {x:number;y:number;heading:number;dist:number}[] = [];
        let prevHeading: number | null = null;

        for (let i = 0; i < numSegs; i++) {
            const p0 = CONTROL_POINTS[i];
            const p1 = CONTROL_POINTS[i + 1];
            const p2 = CONTROL_POINTS[i + 2];
            const p3 = CONTROL_POINTS[i + 3];
            const SUB = 40;
            for (let s = 0; s <= SUB; s++) {
                if (i > 0 && s === 0) continue;
                const t = s / SUB;
                const x = catmullRom(p0[0], p1[0], p2[0], p3[0], t);
                const y = catmullRom(p0[1], p1[1], p2[1], p3[1], t);
                const dx = catmullRomDeriv(p0[0], p1[0], p2[0], p3[0], t);
                const dy = catmullRomDeriv(p0[1], p1[1], p2[1], p3[1], t);
                let heading = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
                if (prevHeading !== null) {
                    while (heading - prevHeading > 180) heading -= 360;
                    while (heading - prevHeading < -180) heading += 360;
                }
                prevHeading = heading;
                SAMPLES.push({ x, y, heading, dist: 0 });
            }
        }

        let butterflyTotalLen = 0;
        SAMPLES[0].dist = 0;
        for (let i = 1; i < SAMPLES.length; i++) {
            butterflyTotalLen += Math.hypot(
                SAMPLES[i].x - SAMPLES[i - 1].x,
                SAMPLES[i].y - SAMPLES[i - 1].y
            );
            SAMPLES[i].dist = butterflyTotalLen;
        }



        const BUTTERFLY_LANDED_POSE = {
            x: 125,
            y: 184,
            heading: 15.0,
            opacity: 1,
            scale: 0.78
        };


return {samples:SAMPLES,totalLength:butterflyTotalLen,landedPose:BUTTERFLY_LANDED_POSE};
}
