import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useTeam } from '../context/TeamContext';
import type { Player } from '../data/players';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import { API_URL, apiFetch } from '../data/api';
import PlayerAvatar from '../components/PlayerAvatar';
import { getPlayerColor } from '../constants/theme';

// ── Types ──
type Tab = 'players' | 'teams';
type TeamRef = { id: number; name: string; color: string };
type PlayerWithTeam = Player & { teamId: number; teamName: string; teamColor: string; allTeams: TeamRef[] };
type PlayerForm = { name: string; numero: string; age: string; taille: string; teamIds: number[] };
type TeamForm   = { name: string; city: string; logoColor: string };

const PRESET_COLORS = ['#4fc3f7','#81c784','#ffb74d','#f06292','#ce93d8','#4db6ac','#ff8a65','#fff176'];

const emptyPlayerForm = (): PlayerForm =>
  ({ name: '', numero: '', age: '', taille: '', teamIds: [] });
const emptyTeamForm = (): TeamForm => ({ name: '', city: '', logoColor: PRESET_COLORS[0] });

type Props = { onClose: () => void };

const PlayerManagementScreen = ({ onClose }: Props) => {
  const { state: teamState, actions: teamActions } = useTeam();
  const { teams } = teamState;

  const [tab, setTab] = useState<Tab>('players');

  // ── Joueurs : formulaire ──
  const [playerForm, setPlayerForm]          = useState<PlayerForm>(emptyPlayerForm());
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);
  const [playerFormOpen, setPlayerFormOpen]  = useState(false);

  // ── Équipes : création équipe ──
  const [teamForm, setTeamForm]         = useState<TeamForm>(emptyTeamForm());
  const [teamFormOpen, setTeamFormOpen] = useState(false);

  // ── Équipes : gestion roster ──
  const [selectedTeamId, setSelectedTeamId]             = useState<number | null>(null);
  const [originalPlayerIds, setOriginalPlayerIds]       = useState<Set<number>>(new Set());
  const [currentPlayerIds, setCurrentPlayerIds]         = useState<Set<number>>(new Set());

  // ── Loading / erreur ──
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Tous les joueurs (y compris sans équipe) ──
  const [allPlayersList, setAllPlayersList] = useState<Player[]>([]);

  useEffect(() => {
    apiFetch(`${API_URL}/api/v1/players`)
      .then(async r => {
        if (!r.ok) {
          const body = await r.text();
          console.error('[PlayerManagementScreen] GET /players HTTP', r.status, body);
          return Promise.reject(r.status);
        }
        return r.json();
      })
      .then((data: { data?: Player[] } | Player[]) => {
        const players = Array.isArray(data) ? data : (data.data ?? []);
        setAllPlayersList(players);
      })
      .catch(() => {});
  }, []); // fetch une seule fois au montage

  // ── Joueurs aplatis avec infos équipes ──
  const allPlayers: PlayerWithTeam[] = useMemo(() => {
    const playerTeams = new Map<number, TeamRef[]>();
    for (const t of teams) {
      for (const p of t.players) {
        const refs = playerTeams.get(p.id) ?? [];
        refs.push({ id: t.id, name: t.name, color: t.logoColor });
        playerTeams.set(p.id, refs);
      }
    }
    // Base = allPlayersList si disponible, sinon fallback teams
    const base: Player[] = allPlayersList.length > 0
      ? allPlayersList
      : teams.flatMap(t => t.players);

    const seen = new Set<number>();
    return base
      .filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; })
      .map(p => {
        const refs = playerTeams.get(p.id) ?? [];
        const first = refs[0];
        return {
          ...p,
          teamId:    first?.id    ?? 0,
          teamName:  first?.name  ?? '',
          teamColor: first?.color ?? COLORS.textDark,
          allTeams:  refs,
        };
      });
  }, [teams, allPlayersList]);

  // ── Diff pour valider le roster ──
  const toAdd    = [...currentPlayerIds].filter(id => !originalPlayerIds.has(id));
  const toRemove = [...originalPlayerIds].filter(id => !currentPlayerIds.has(id));
  const hasChanges = toAdd.length > 0 || toRemove.length > 0;

  // ══════════════════════════════════════════
  //  JOUEURS — handlers
  // ══════════════════════════════════════════

  const openCreatePlayer = () => {
    setEditingPlayerId(null);
    setPlayerForm(emptyPlayerForm());
    setError(null);
    setPlayerFormOpen(true);
  };

  const openEditPlayer = (p: PlayerWithTeam) => {
    setEditingPlayerId(p.id);
    const playerTeamIds = teams.filter(t => t.players.some(tp => tp.id === p.id)).map(t => t.id);
    setPlayerForm({ name: p.name, numero: String(p.numero), age: p.age ? String(p.age) : '', taille: p.taille ?? '', teamIds: playerTeamIds });
    setError(null);
    setPlayerFormOpen(true);
  };

  const closePlayerForm = () => { setPlayerFormOpen(false); setError(null); };

  const handleSavePlayer = async () => {
    if (!playerForm.name.trim() || !playerForm.numero.trim() || playerForm.teamIds.length === 0) return;
    setLoading(true); setError(null);
    try {
      const isEdit = editingPlayerId !== null;
      const url    = isEdit ? `${API_URL}/api/v1/players/${editingPlayerId}` : `${API_URL}/api/v1/players`;
      const res = await apiFetch(url, {
        method:  isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamIds: playerForm.teamIds,
          name:    playerForm.name.trim(),
          numero:  Number(playerForm.numero),
          age:     playerForm.age    ? Number(playerForm.age)   : null,
          taille:  playerForm.taille ? playerForm.taille.trim() : null,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[PlayerManagementScreen] ${isEdit ? 'PUT' : 'POST'} /players HTTP`, res.status, errBody);
        throw new Error(`HTTP ${res.status}`);
      }
      const body = await res.json() as { data?: Player } | Player;
      const saved: Player = ('data' in body && body.data) ? body.data : body as Player;
      if (isEdit) {
        setAllPlayersList(prev => prev.map(p => p.id === saved.id ? saved : p));
      } else {
        setAllPlayersList(prev => [...prev, saved]);
      }
      teamActions.reload(); // met à jour teams.players pour roster view
      closePlayerForm();
    } catch { setError('Erreur réseau.'); }
    finally  { setLoading(false); }
  };

  const handleDeletePlayer = (p: PlayerWithTeam) => {
    Alert.alert('Supprimer', `Supprimer ${p.name} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        const deletedId = p.id;
        setLoading(true);
        try {
          const res = await apiFetch(`${API_URL}/api/v1/players/${deletedId}`, { method: 'DELETE' });
          if (!res.ok) {
            const errBody = await res.text();
            console.error('[PlayerManagementScreen] DELETE /players HTTP', res.status, errBody);
            throw new Error(`HTTP ${res.status}`);
          }
          setAllPlayersList(prev => prev.filter(x => x.id !== deletedId));
          teamActions.reload(); // met à jour teams.players
        } catch { setError('Impossible de supprimer.'); }
        finally  { setLoading(false); }
      }},
    ]);
  };

  // ══════════════════════════════════════════
  //  ÉQUIPES — handlers
  // ══════════════════════════════════════════

  const openTeamRoster = (teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const ids = new Set(team.players.map(p => p.id));
    setOriginalPlayerIds(ids);
    setCurrentPlayerIds(new Set(ids));
    setSelectedTeamId(teamId);
    setError(null);
  };

  const closeTeamRoster = () => {
    setSelectedTeamId(null);
    setOriginalPlayerIds(new Set());
    setCurrentPlayerIds(new Set());
    setError(null);
  };

  const togglePlayer = (playerId: number) => {
    setCurrentPlayerIds(prev => {
      const next = new Set(prev);
      if (next.has(playerId)) next.delete(playerId); else next.add(playerId);
      return next;
    });
  };

  const handleValidateRoster = async () => {
    if (!hasChanges || selectedTeamId === null) return;
    setLoading(true); setError(null);
    try {
      if (toAdd.length > 0) {
        const res = await apiFetch(`${API_URL}/api/v1/teams/${selectedTeamId}:assignPlayers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerIds: toAdd }),
        });
        if (!res.ok) {
          const errBody = await res.text();
          console.error('[PlayerManagementScreen] POST :assignPlayers HTTP', res.status, errBody);
          throw new Error(`HTTP ${res.status}`);
        }
      }
      if (toRemove.length > 0) {
        const res = await apiFetch(`${API_URL}/api/v1/teams/${selectedTeamId}:removePlayers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerIds: toRemove }),
        });
        if (!res.ok) {
          const errBody = await res.text();
          console.error('[PlayerManagementScreen] POST :removePlayers HTTP', res.status, errBody);
          throw new Error(`HTTP ${res.status}`);
        }
      }
      teamActions.reload();
      closeTeamRoster();
    } catch { setError('Erreur réseau lors de la validation.'); }
    finally  { setLoading(false); }
  };

  const handleSaveTeam = async () => {
    if (!teamForm.name.trim() || !teamForm.city.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await apiFetch(`${API_URL}/api/v1/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: teamForm.name.trim(), city: teamForm.city.trim(), logoColor: teamForm.logoColor }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error('[PlayerManagementScreen] POST /teams HTTP', res.status, errBody);
        throw new Error(`HTTP ${res.status}`);
      }
      teamActions.reload();
      setTeamFormOpen(false);
      setTeamForm(emptyTeamForm());
    } catch { setError('Erreur réseau.'); }
    finally  { setLoading(false); }
  };

  const handleDeleteTeam = (teamId: number, teamName: string) => {
    Alert.alert('Supprimer l\'équipe', `Supprimer ${teamName} ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        setLoading(true);
        try {
          const res = await apiFetch(`${API_URL}/api/v1/teams/${teamId}`, { method: 'DELETE' });
          if (!res.ok) {
            const errBody = await res.text();
            console.error('[PlayerManagementScreen] DELETE /teams HTTP', res.status, errBody);
            throw new Error(`HTTP ${res.status}`);
          }
          teamActions.reload();
        } catch { setError('Impossible de supprimer.'); }
        finally  { setLoading(false); }
      }},
    ]);
  };

  const canSavePlayer = playerForm.name.trim().length > 0 && playerForm.numero.trim().length > 0 && playerForm.teamIds.length > 0;
  const canSaveTeam   = teamForm.name.trim().length > 0 && teamForm.city.trim().length > 0;
  const selectedTeam  = teams.find(t => t.id === selectedTeamId);

  // ══════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={selectedTeamId !== null ? closeTeamRoster : onClose}>
          <Text style={styles.backBtn}>
            {selectedTeamId !== null ? `← ${selectedTeam?.name ?? 'Équipes'}` : '← Retour'}
          </Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>
            {selectedTeamId !== null ? 'Joueurs de l\'équipe' : 'Gestion équipes & joueurs'}
          </Text>
          {selectedTeamId !== null && (
            <TouchableOpacity
              style={[styles.validateBtn, (!hasChanges || loading) && styles.validateBtnDisabled]}
              onPress={handleValidateRoster}
              disabled={!hasChanges || loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.validateBtnText}>Valider</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Onglets (masqués pendant gestion roster) */}
      {selectedTeamId === null && (
        <View style={styles.tabBar}>
          {(['players', 'teams'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tabItem, tab === t && styles.tabItemActive]}
              onPress={() => { setTab(t); setPlayerFormOpen(false); setTeamFormOpen(false); setError(null); }}
            >
              <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                {t === 'players' ? 'Joueurs' : 'Équipes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ═══════════════ ROSTER ÉQUIPE ═══════════════ */}
        {selectedTeamId !== null && (
          <>
            {(toAdd.length > 0 || toRemove.length > 0) && (
              <View style={styles.diffBanner}>
                {toAdd.length > 0    && <Text style={styles.diffAdd}>+{toAdd.length} ajout{toAdd.length > 1 ? 's' : ''}</Text>}
                {toRemove.length > 0 && <Text style={styles.diffRemove}>−{toRemove.length} retrait{toRemove.length > 1 ? 's' : ''}</Text>}
              </View>
            )}

            <Text style={styles.sectionLabel}>TOUS LES JOUEURS — cocher pour inclure dans l'équipe</Text>

            {allPlayers.length === 0
              ? <Text style={styles.emptyText}>Aucun joueur. Créez-en dans l'onglet Joueurs.</Text>
              : allPlayers.map(p => {
                  const inTeam    = currentPlayerIds.has(p.id);
                  const wasInTeam = originalPlayerIds.has(p.id);
                  const changed   = inTeam !== wasInTeam;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.rosterRow, changed && (inTeam ? styles.rosterRowAdded : styles.rosterRowRemoved)]}
                      onPress={() => togglePlayer(p.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, inTeam && styles.checkboxChecked]}>
                        {inTeam && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <PlayerAvatar name={p.name} color={getPlayerColor(p.id)} size={30} />
                      <View style={styles.rosterInfo}>
                        <Text style={[styles.rosterName, !inTeam && styles.rosterNameOff]}>{p.name}</Text>
                        <View style={styles.rosterMeta}>
                          <Text style={styles.rosterNumero}>#{p.numero}</Text>
                          {p.allTeams.filter(t => t.id !== selectedTeamId).map(t => (
                            <View key={t.id} style={[styles.otherTeamBadge, { borderColor: t.color + '55', backgroundColor: t.color + '18' }]}>
                              <Text style={[styles.otherTeamText, { color: t.color }]}>{t.name}</Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
            }
          </>
        )}

        {/* ═══════════════ JOUEURS ═══════════════ */}
        {selectedTeamId === null && tab === 'players' && (
          <>
            {!playerFormOpen && (
              <TouchableOpacity style={styles.addBtn} onPress={openCreatePlayer}>
                <Text style={styles.addBtnText}>+ Nouveau joueur</Text>
              </TouchableOpacity>
            )}

            {playerFormOpen && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>
                  {editingPlayerId !== null ? 'Modifier le joueur' : 'Nouveau joueur'}
                </Text>

                <Text style={styles.fieldLabel}>Équipes *</Text>
                <View style={styles.teamChips}>
                  {teams.map(t => {
                    const active = playerForm.teamIds.includes(t.id);
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.teamChip, active && styles.teamChipActive]}
                        onPress={() => setPlayerForm(f => ({
                          ...f,
                          teamIds: active
                            ? f.teamIds.filter(id => id !== t.id)
                            : [...f.teamIds, t.id],
                        }))}
                      >
                        <View style={[styles.teamDot, { backgroundColor: t.logoColor }]} />
                        <Text style={[styles.teamChipText, active && styles.teamChipTextActive]}>{t.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>Nom complet *</Text>
                <TextInput style={styles.input} value={playerForm.name}
                  onChangeText={v => setPlayerForm(f => ({ ...f, name: v }))}
                  placeholder="ex: Léa Martin" placeholderTextColor={COLORS.textDark} autoCapitalize="words" />

                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Numéro *</Text>
                    <TextInput style={styles.input} value={playerForm.numero}
                      onChangeText={v => setPlayerForm(f => ({ ...f, numero: v }))}
                      placeholder="7" placeholderTextColor={COLORS.textDark} keyboardType="number-pad" maxLength={3} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Âge</Text>
                    <TextInput style={styles.input} value={playerForm.age}
                      onChangeText={v => setPlayerForm(f => ({ ...f, age: v }))}
                      placeholder="23" placeholderTextColor={COLORS.textDark} keyboardType="number-pad" maxLength={3} />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Taille</Text>
                <TextInput style={styles.input} value={playerForm.taille}
                  onChangeText={v => setPlayerForm(f => ({ ...f, taille: v }))}
                  placeholder="1m75" placeholderTextColor={COLORS.textDark} autoCapitalize="none" />

                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={closePlayerForm}>
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, (!canSavePlayer || loading) && styles.saveBtnDisabled]}
                    onPress={handleSavePlayer} disabled={!canSavePlayer || loading}
                  >
                    {loading ? <ActivityIndicator color="#fff" size="small" /> :
                      <Text style={styles.saveBtnText}>{editingPlayerId !== null ? 'Enregistrer' : 'Créer'}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {allPlayers.length === 0
              ? <Text style={styles.emptyText}>Aucun joueur.</Text>
              : allPlayers.map(p => (
                <View key={p.id} style={styles.playerRow}>
                  <PlayerAvatar name={p.name} color={getPlayerColor(p.id)} size={32} />
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{p.name}</Text>
                    <View style={styles.playerMeta}>
                      <Text style={styles.playerNumero}>#{p.numero}</Text>
                      {p.allTeams.map(t => (
                        <View key={t.id} style={[styles.teamBadge, { borderColor: t.color + '55', backgroundColor: t.color + '18' }]}>
                          <Text style={[styles.teamBadgeText, { color: t.color }]}>{t.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEditPlayer(p)}>
                    <Text style={styles.editBtnText}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeletePlayer(p)}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            }
          </>
        )}

        {/* ═══════════════ ÉQUIPES ═══════════════ */}
        {selectedTeamId === null && tab === 'teams' && (
          <>
            {!teamFormOpen && (
              <TouchableOpacity style={styles.addBtn} onPress={() => { setTeamFormOpen(true); setError(null); }}>
                <Text style={styles.addBtnText}>+ Nouvelle équipe</Text>
              </TouchableOpacity>
            )}

            {teamFormOpen && (
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Nouvelle équipe</Text>

                <Text style={styles.fieldLabel}>Nom *</Text>
                <TextInput style={styles.input} value={teamForm.name}
                  onChangeText={v => setTeamForm(f => ({ ...f, name: v }))}
                  placeholder="ex: Toulouse Volley" placeholderTextColor={COLORS.textDark} autoCapitalize="words" />

                <Text style={styles.fieldLabel}>Ville *</Text>
                <TextInput style={styles.input} value={teamForm.city}
                  onChangeText={v => setTeamForm(f => ({ ...f, city: v }))}
                  placeholder="ex: Toulouse" placeholderTextColor={COLORS.textDark} autoCapitalize="words" />

                <Text style={styles.fieldLabel}>Couleur</Text>
                <View style={styles.colorPicker}>
                  {PRESET_COLORS.map(c => (
                    <TouchableOpacity key={c}
                      style={[styles.colorChip, { backgroundColor: c }, teamForm.logoColor === c && styles.colorChipSelected]}
                      onPress={() => setTeamForm(f => ({ ...f, logoColor: c }))} />
                  ))}
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setTeamFormOpen(false); setTeamForm(emptyTeamForm()); }}>
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, (!canSaveTeam || loading) && styles.saveBtnDisabled]}
                    onPress={handleSaveTeam} disabled={!canSaveTeam || loading}
                  >
                    {loading ? <ActivityIndicator color="#fff" size="small" /> :
                      <Text style={styles.saveBtnText}>Créer</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {teams.length === 0
              ? <Text style={styles.emptyText}>Aucune équipe.</Text>
              : teams.map(t => (
                <TouchableOpacity key={t.id} style={styles.teamRow} onPress={() => openTeamRoster(t.id)} activeOpacity={0.7}>
                  <View style={[styles.teamLogo, { backgroundColor: t.logoColor + '22', borderColor: t.logoColor + '55' }]}>
                    <Text style={[styles.teamLogoLetter, { color: t.logoColor }]}>{t.name[0]}</Text>
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={styles.teamName}>{t.name}</Text>
                    <Text style={styles.teamCity}>{t.city} · {t.players.length} joueurs</Text>
                  </View>
                  <Text style={styles.teamChevron}>›</Text>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteTeam(t.id, t.name)}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            }
          </>
        )}

        <View style={{ height: SPACING.xxl * 2 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { fontSize: FONT_SIZE.sm, color: COLORS.blue, marginBottom: SPACING.xs },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: FONT_SIZE.xl, fontWeight: '600', color: COLORS.textPrimary },

  validateBtn: {
    backgroundColor: COLORS.blue,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  validateBtnDisabled: { backgroundColor: COLORS.border },
  validateBtnText: { fontSize: FONT_SIZE.md, color: '#fff', fontWeight: '500' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: SPACING.sm + 2 },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: COLORS.blue },
  tabLabel: { fontSize: FONT_SIZE.md, color: COLORS.textMuted },
  tabLabelActive: { color: COLORS.blue, fontWeight: '500' },

  errorBox: {
    marginHorizontal: SPACING.xl, marginTop: SPACING.sm,
    backgroundColor: `${COLORS.red}18`, borderWidth: 1,
    borderColor: `${COLORS.red}44`, borderRadius: RADIUS.md, padding: SPACING.sm,
  },
  errorText: { fontSize: FONT_SIZE.sm, color: COLORS.redLight },

  content: { flex: 1, paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },

  sectionLabel: {
    fontSize: FONT_SIZE.xs, color: COLORS.textMuted, letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  // Diff banner
  diffBanner: {
    flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md,
    padding: SPACING.sm, backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  diffAdd:    { fontSize: FONT_SIZE.sm, color: COLORS.greenLight, fontWeight: '500' },
  diffRemove: { fontSize: FONT_SIZE.sm, color: COLORS.redLight,   fontWeight: '500' },

  // Roster checklist
  rosterRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rosterRowAdded:   { backgroundColor: `${COLORS.green}0e` },
  rosterRowRemoved: { backgroundColor: `${COLORS.red}0e` },
  checkbox: {
    width: 22, height: 22, borderRadius: 4, borderWidth: 1.5,
    borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  checkmark: { fontSize: 13, color: '#fff', fontWeight: '700' },
  rosterInfo: { flex: 1 },
  rosterName: { fontSize: FONT_SIZE.md, fontWeight: '500', color: COLORS.textPrimary },
  rosterNameOff: { color: COLORS.textMuted },
  rosterMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 2 },
  rosterNumero: { fontSize: FONT_SIZE.sm, color: COLORS.textDark },
  otherTeamBadge: { borderWidth: 1, borderRadius: RADIUS.sm, paddingHorizontal: 5, paddingVertical: 1 },
  otherTeamText: { fontSize: FONT_SIZE.xs, fontWeight: '500' },

  addBtn: {
    backgroundColor: COLORS.blue + '18', borderWidth: 1, borderColor: COLORS.blue + '44',
    borderRadius: RADIUS.md, paddingVertical: SPACING.sm, alignItems: 'center', marginBottom: SPACING.md,
  },
  addBtnText: { fontSize: FONT_SIZE.md, color: COLORS.blue, fontWeight: '500' },

  formCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, borderWidth: 1,
    borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.md,
  },
  formTitle: { fontSize: FONT_SIZE.lg, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.md },
  fieldLabel: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginBottom: SPACING.xs, marginTop: SPACING.sm },
  input: {
    backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm + 2,
    fontSize: FONT_SIZE.md, color: COLORS.textPrimary,
  },
  fieldRow: { flexDirection: 'row', gap: SPACING.md },
  teamChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  teamChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgInput,
  },
  teamChipActive: { borderColor: COLORS.blue + '66', backgroundColor: COLORS.blue + '18' },
  teamDot: { width: 8, height: 8, borderRadius: 4 },
  teamChipText: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted },
  teamChipTextActive: { color: COLORS.blue, fontWeight: '500' },

  colorPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  colorChip: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  colorChipSelected: { borderColor: COLORS.textPrimary },

  formActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },
  cancelBtn: {
    flex: 1, backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.md, paddingVertical: SPACING.sm, alignItems: 'center',
  },
  cancelBtnText: { fontSize: FONT_SIZE.md, color: COLORS.textMuted },
  saveBtn: { flex: 2, backgroundColor: COLORS.blue, borderRadius: RADIUS.md, paddingVertical: SPACING.sm, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: COLORS.border },
  saveBtnText: { fontSize: FONT_SIZE.md, color: '#fff', fontWeight: '500' },

  emptyText: { fontSize: FONT_SIZE.md, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.xl },

  playerRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  playerInfo: { flex: 1, minWidth: 0 },
  playerName: { fontSize: FONT_SIZE.md, fontWeight: '500', color: COLORS.textPrimary },
  playerMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginTop: 2 },
  playerNumero: { fontSize: FONT_SIZE.sm, color: COLORS.textDark },
  teamBadge: { borderWidth: 1, borderRadius: RADIUS.sm, paddingHorizontal: 5, paddingVertical: 1 },
  teamBadgeText: { fontSize: FONT_SIZE.xs, fontWeight: '500' },
  editBtn: { padding: SPACING.xs },
  editBtnText: { fontSize: FONT_SIZE.lg, color: COLORS.textMuted },
  deleteBtn: { padding: SPACING.xs },
  deleteBtnText: { fontSize: FONT_SIZE.md, color: COLORS.redLight, fontWeight: '600' },

  teamRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  teamLogo: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  teamLogoLetter: { fontSize: FONT_SIZE.lg, fontWeight: '700' },
  teamInfo: { flex: 1 },
  teamName: { fontSize: FONT_SIZE.md, fontWeight: '500', color: COLORS.textPrimary },
  teamCity: { fontSize: FONT_SIZE.sm, color: COLORS.textMuted, marginTop: 2 },
  teamChevron: { fontSize: FONT_SIZE.lg, color: COLORS.textMuted },
});

export default PlayerManagementScreen;
