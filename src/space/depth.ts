import type { RoomObject } from '../types/space.ts';
const layers = { architecture: 0, ground: 1, objects: 2, foreground: 3 };
const architecture: Record<string, number> = { floor: 0, wallLeft: 1, wallRight: 2, window: 3, door: 4 };
/** Support groups remain together; lower contents precede the body, top contents
 * follow it, and explicit front parts close the group. Furniture groups are ordered
 * by footprint (whatever sits fully behind another and overlaps it on screen comes
 * first), then ground depth; never insertion order. */
export function orderRoomObjects(objects: readonly RoomObject[]): RoomObject[] {
    const map = new Map(objects.map(o => [o.id, o]));
    function owner(o: RoomObject): RoomObject { let current = o; const seen = new Set<string>(); while (current.parentId) {
        if (seen.has(current.id))
            throw Error('家具支撑关系存在循环');
        seen.add(current.id);
        const parent = map.get(current.parentId);
        if (!parent)
            throw Error('家具支撑对象不存在');
        current = parent;
    } return current; }
    const roots = new Map(objects.map(o => [o.id, owner(o)]));
    function groundDepth(o: RoomObject) { return o.position.x + o.position.y + (o.footprint?.width ?? 0) + (o.footprint?.depth ?? 0) + o.depthBias; }
    function phase(o: RoomObject) { if (o.state.renderPhase === 'front')
        return 2; if (!o.parentId)
        return 0; return o.position.z <= roots.get(o.id)!.position.z ? -1 : 1; }
    const extent = (o: RoomObject) => ({ x1: o.position.x, y1: o.position.y, x2: o.position.x + (o.footprint?.width ?? 0), y2: o.position.y + (o.footprint?.depth ?? 0) });
    /** a 整个在 b 的后面（x 或 y 方向完全靠墙那侧），而且两者在画面上左右有重叠时才算。 */
    function behind(a: RoomObject, b: RoomObject) {
        const p = extent(a), q = extent(b);
        if (p.x1 - q.y2 >= q.x2 - q.y1 || q.x1 - q.y2 >= p.x2 - p.y1) return false;
        return p.x2 <= q.x1 + .001 || p.y2 <= q.y1 + .001;
    }
    function sortRoots(list: RoomObject[]) {
        const rest = [...list].sort((a, b) => groundDepth(a) - groundDepth(b) || a.id.localeCompare(b.id)), out: RoomObject[] = [];
        while (rest.length) {
            const i = rest.findIndex(o => !rest.some(other => other !== o && behind(other, o)));
            out.push(...rest.splice(i < 0 ? 0 : i, 1));
        }
        return out;
    }
    const rootOrder = new Map(sortRoots([...new Set(objects.filter(o => o.layer === 'objects').map(o => roots.get(o.id)!))]).map((o, i) => [o.id, i]));
    return [...objects].sort((a, b) => {
        const layer = layers[a.layer] - layers[b.layer];
        if (layer)
            return layer;
        if (a.layer === 'architecture')
            return (architecture[a.assetId] ?? 10) - (architecture[b.assetId] ?? 10) || a.depthBias - b.depthBias || a.id.localeCompare(b.id);
        const ar = roots.get(a.id)!, br = roots.get(b.id)!;
        if (ar.id !== br.id)
            return (rootOrder.get(ar.id) ?? 0) - (rootOrder.get(br.id) ?? 0) || groundDepth(ar) - groundDepth(br) || ar.id.localeCompare(br.id);
        return phase(a) - phase(b) || groundDepth(a) - groundDepth(b) || a.position.z - b.position.z || a.id.localeCompare(b.id);
    });
}
