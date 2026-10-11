import type { RoomObject } from '../types/space.ts';
const layers = { architecture: 0, ground: 1, objects: 2, foreground: 3 };
const architecture: Record<string, number> = { floor: 0, wallLeft: 1, wallRight: 2, window: 3, curtains: 4, windowsill: 5, pictureLeft: 6, wallClock: 6, noticeboard: 6, postcardsLeft: 6, wallShelf: 6 };
/** Support groups remain together; lower contents precede the body, top contents
 * follow it, and explicit front parts close the group. Ground depth determines
 * the relationship between independent furniture groups, never insertion order. */
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
    return [...objects].sort((a, b) => {
        const layer = layers[a.layer] - layers[b.layer];
        if (layer)
            return layer;
        if (a.layer === 'architecture')
            return (architecture[a.assetId] ?? 10) - (architecture[b.assetId] ?? 10) || a.depthBias - b.depthBias || a.id.localeCompare(b.id);
        const ar = roots.get(a.id)!, br = roots.get(b.id)!;
        if (ar.id !== br.id)
            return groundDepth(ar) - groundDepth(br) || ar.id.localeCompare(br.id);
        return phase(a) - phase(b) || groundDepth(a) - groundDepth(b) || a.position.z - b.position.z || a.id.localeCompare(b.id);
    });
}
