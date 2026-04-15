// ─────────────────────────────────────────────
//  ÉCRAN : STATISTIQUES
//
//  Liste tous les joueurs (terrain + banc)
//  triés par points décroissants.
//  Affiche pour chaque joueur :
//    - Total points positifs
//    - Total fautes
//    - Détail : Atk, Bloc, Ace, Out
//  Badge "P1–P6" pour les joueurs sur le terrain,
//  badge "banc" pour les remplaçants.
// ─────────────────────────────────────────────

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useMatch } from '../context/MatchContext';
import { getPlayerColor } from '../constants/theme';
import { COLORS, SPACING, FONT_SIZE, RADIUS } from '../constants/theme';
import { getTotalPoints, getTotalFaults } from '../data/players';
import PlayerAvatar from '../components/PlayerAvatar';

const StatsScreen = () => {
  const { state } = useMatch();
  const { matchPlayers, rosterValidated } = state;

  if (!rosterValidated) {
    return (
      <View style={styles.notReady}>
        <Text style={styles.notReadyText}>
          Valider l'équipe dans l'onglet Roster pour voir les statistiques.
        </Text>
      </View>
    );
  }

  // Trier les joueurs par points totaux décroissants
  const sortedPlayers = [...matchPlayers].sort(
    (a, b) => getTotalPoints(b.stats) - getTotalPoints(a.stats)
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <Text style={styles.sectionLabel}>STATS JOUEURS</Text>

      {sortedPlayers.map(player => {
        const color      = getPlayerColor(player.id);
        const totalPts   = getTotalPoints(player.stats);
        const totalFaults = getTotalFaults(player.stats);
        const { stats }  = player;

        return (
          <View key={player.id} style={styles.playerCard}>

            {/* ── Ligne principale : avatar + nom + total ── */}
            <View style={styles.mainRow}>
              <PlayerAvatar name={player.name} color={color} size={34} />

              <View style={styles.playerInfo}>
                {/* Nom + badge de position */}
                <View style={styles.nameRow}>
                  <Text style={styles.playerName}>{player.name}</Text>
                  {player.onCourt ? (
                    // Joueur sur le terrain : afficher son poste
                    <View style={[styles.badge, styles.badgeCourt]}>
                      <Text style={styles.badgeCourtText}>P{player.pos}</Text>
                    </View>
                  ) : (
                    // Joueur au banc
                    <View style={[styles.badge, styles.badgeBench]}>
                      <Text style={styles.badgeBenchText}>banc</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.playerRole}>{player.role} · #{player.numero}</Text>
              </View>

              {/* Total points + fautes */}
              <View style={styles.totals}>
                <Text style={styles.totalPts}>{totalPts}</Text>
                {totalFaults > 0 && (
                  <Text style={styles.totalFaults}>−{totalFaults}</Text>
                )}
              </View>
            </View>

            {/* ── Ligne de détail des stats ── */}
            <View style={styles.statsRow}>
              {/* Attaques réussies */}
              <View style={[styles.statChip, styles.statChipBlue]}>
                <Text style={[styles.statChipText, { color: COLORS.blue }]}>
                  Atk ✓ {stats.atk}
                </Text>
              </View>

              {/* Contres */}
              <View style={[styles.statChip, styles.statChipPurple]}>
                <Text style={[styles.statChipText, { color: '#e040fb' }]}>
                  Bloc {stats.block}
                </Text>
              </View>

              {/* Service ace */}
              <View style={[styles.statChip, styles.statChipGreen]}>
                <Text style={[styles.statChipText, { color: COLORS.greenLight }]}>
                  Ace {stats.ace}
                </Text>
              </View>

              {/* Out (attaque + service) */}
              <View style={[styles.statChip, styles.statChipRed]}>
                <Text style={[styles.statChipText, { color: COLORS.redLight }]}>
                  Out {stats.atk_out + stats.srv_out}
                </Text>
              </View>

              {/* Réceptions ratées */}
              {stats.recv > 0 && (
                <View style={[styles.statChip, styles.statChipRed]}>
                  <Text style={[styles.statChipText, { color: COLORS.redLight }]}>
                    Recv {stats.recv}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );
      })}

      <View style={{ height: SPACING.xxl }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
  },

  notReady: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  notReadyText: {
    fontSize: FONT_SIZE.lg,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  sectionLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: SPACING.sm,
  },

  // Carte joueur
  playerCard: {
    paddingVertical: SPACING.sm + 1,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  // Ligne principale
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  playerInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexWrap: 'wrap',
  },
  playerName: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  playerRole: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Badges position / banc
  badge: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.xs + 2,
    paddingVertical: 1,
  },
  badgeCourt: {
    backgroundColor: `${COLORS.blue}22`,
    borderColor: `${COLORS.blue}44`,
  },
  badgeCourtText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.blue,
  },
  badgeBench: {
    backgroundColor: `${COLORS.borderLight}22`,
    borderColor: COLORS.border,
  },
  badgeBenchText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },

  // Total points + fautes
  totals: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  totalPts: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '500',
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZE.xxl * 1.1,
  },
  totalFaults: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.redLight,
  },

  // Chips de stats détaillées
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginLeft: 34 + SPACING.md, // aligné après l'avatar
  },
  statChip: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  statChipText: {
    fontSize: FONT_SIZE.xs,
  },
  statChipBlue: {
    backgroundColor: `${COLORS.blue}22`,
    borderColor: `${COLORS.blue}44`,
  },
  statChipPurple: {
    backgroundColor: '#e040fb22',
    borderColor: '#e040fb44',
  },
  statChipGreen: {
    backgroundColor: `${COLORS.green}22`,
    borderColor: `${COLORS.green}44`,
  },
  statChipRed: {
    backgroundColor: `${COLORS.red}22`,
    borderColor: `${COLORS.red}44`,
  },
});

export default StatsScreen;