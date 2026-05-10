import rawRotations from './rotations51.json';

export type Role    = 'S' | 'OPP' | 'MB1' | 'MB2' | 'OH1' | 'OH2';
export type PinRole = 'setter' | 'receiver' | 'net';

export type RoleCoord = { x: number; y: number; pinRole: PinRole };

export type RotationDef = {
  label:     string;
  setterPos: number;
  coords:    Record<Role, RoleCoord>;
};

export type Roster = Partial<Record<Role, string>>;

export type Pin = {
  name:    string;
  role:    Role;
  pinRole: PinRole;
  x:       number;
  y:       number;
};

export const ROTATIONS = rawRotations as RotationDef[];

export function resolvePlayers(
  rotation: RotationDef,
  roster:   Roster,
  width:    number,
  height:   number,
): Pin[] {
  return (Object.keys(rotation.coords) as Role[]).map(role => ({
    name:    roster[role] ?? role,
    role,
    pinRole: rotation.coords[role].pinRole,
    x:       rotation.coords[role].x * width,
    y:       rotation.coords[role].y * height,
  }));
}
