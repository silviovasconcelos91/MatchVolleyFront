# CLAUDE.md — React Native + Expo

## Stack
React Native · Expo managed · TypeScript strict · React Navigation · Context API + useReducer · StyleSheet · EAS Build (Android + iOS) · Kotlin REST backend (out of scope)

## Folder structure
```
src/ components/ screens/ context/ data/ constants/ hooks/
assets/
```
Complex component → dedicated folder `ComponentName/` with `index.ts`, `.tsx`, `.styles.ts`, `.types.ts`

---

## Rules

### Expo
- Prefer `expo-*` packages over bare equivalents (e.g. `expo-image` not `react-native-fast-image`)
- Never eject from managed workflow without a strong reason
- API URLs and secrets → `app.config.ts` + `expo-constants`, never hardcoded

### TypeScript
- No `any`, no `!` non-null assertion — use early return instead:
```ts
// ❌ const player = players.find(p => p.id === id)!
// ✅
const player = players.find(p => p.id === id);
if (!player) return null;
```
- Always type component props explicitly:
```ts
type Props = {
  playerId: number;
  onPress: (id: number) => void;
};
```
- Prefer `type` over `interface`

### Components
- Wrap list items in `React.memo()` to avoid unnecessary re-renders:
```tsx
// Every player row in the FlatList should be memoized
const PlayerRow = React.memo(({ player, onPress }: Props) => {
  return <TouchableOpacity onPress={() => onPress(player.id)} />;
});
```
- Stabilize callbacks with `useCallback` when passed to memoized components:
```tsx
// Without this, React.memo is bypassed — the function is recreated every render
const handlePress = useCallback((id: number) => {
  togglePlayer(id);
}, [rosterValidated]);
```
- Never nest a FlatList inside a ScrollView for long lists → use `ListHeaderComponent` instead

### Styles
- Always use `StyleSheet.create()`, no inline styles except isolated dynamic values
- Always use design tokens from `constants/theme.ts`: `COLORS`, `SPACING`, `FONT_SIZE`, `RADIUS`
- If file exceeds ~250 lines → move styles to `Component.styles.ts`

### State management
- Single source of truth — derive values, never duplicate into parallel state:
```tsx
// ❌ Don't maintain a separate starterIds state
const [starterIds, setStarterIds] = useState<number[]>([]);

// ✅ Derive it from the single playerStates source
const starterIds = Object.entries(playerStates)
  .filter(([, s]) => s === STATE_STARTER)
  .map(([id]) => Number(id));
```
- Never use `useEffect` to sync two state variables — derive instead

### API calls
- Every async screen must have explicit `loading` and `error` state:
```tsx
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

fetchPlayers()
  .then(setPlayers)
  .catch(() => setError('Failed to load players'))
  .finally(() => setLoading(false));
```
- Always type API responses explicitly — never use `any`
- Business logic stays in the Kotlin backend, not in RN

### Cross-platform (Android + iOS)
- Use `Platform.OS` for platform-specific adjustments
- Shadows: `elevation` on Android, `shadow*` properties on iOS

---

## Commands
```bash
npx expo start --clear   # start dev server + reset cache
npx tsc --noEmit         # TypeScript check without building
eas build --platform all # production build via EAS
```

---

## Project architecture notes
- `playerStates: Record<number, 0|1|2>` — selection cycle: none → bench → starter
- `MatchContext` — single source of truth for global match state
- `getPlayerColor(id)` — deterministic color per player from `constants/theme.ts`
