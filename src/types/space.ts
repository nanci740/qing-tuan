export interface RoomPosition {
    x: number;
    y: number;
    z: number;
}
export type RoomLayer = 'architecture' | 'ground' | 'objects' | 'foreground';
export interface RoomObject {
    id: string;
    type: string;
    assetId: string;
    position: RoomPosition;
    direction: 'fixed';
    layer: RoomLayer;
    depthBias: number;
    parentId?: string;
    footprint?: {
        width: number;
        depth: number;
    };
    collision?: {
        solid: boolean;
    };
    state: Record<string, unknown>;
}
export interface RoomConfiguration {
    schemaVersion: number;
    roomId: string;
    roomVersion: number;
    revision: number;
    updatedAt: number;
    objects: RoomObject[];
}
export interface RoomAsset {
    path: string;
    width: number;
    height: number;
    anchor: {
        x: number;
        y: number;
    };
}
export interface RoomCamera {
    zoom: number;
    x: number;
    y: number;
}
export interface RoomViewport {
    width: number;
    height: number;
    dpr: number;
}
