// src/screens/StatistiquesScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, StatusBar, Dimensions
} from 'react-native';
import { statsAPI } from '../services/api';
import { Card, StatCard, LoadingScreen, SectionHeader, PrioriteBadge } from '../components';
import { Colors, Spacing, Typography, Radius } from '../theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SCREEN_W = Dimensions.get('window').width;

export default function StatistiquesScreen() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await statsAPI.dashboard();
      setStats(d);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingScreen />;

  const maxInterv = stats?.interventionsParMois?.length
    ? Math.max(...stats.interventionsParMois.map(m => m.count), 1)
    : 1;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Ionicons
            name="stats-chart"
            size={24}
            color="#fff"
          />
          <Text style={styles.headerTitle}>
            Les Statistiques
          </Text>
        </View>

        <Text style={styles.headerSub}>
          Tableau de bord analytique
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />
        }
      >
        {/* KPIs */}
        <SectionHeader title="Indicateurs clés" />
        <View style={styles.kpiRow}>
          <StatCard label="Total interventions" value={stats?.totalInterventions || 0} color={Colors.primary} />
          <View style={{ width: Spacing.md }} />
          <StatCard label="Ce mois" value={stats?.interventionsMois || 0} color={Colors.secondary} />
        </View>
        <View style={styles.kpiRow}>
          <StatCard label="Incidents ouverts" value={stats?.incidentsOuverts || 0} color={Colors.danger} />
          <View style={{ width: Spacing.md }} />
          <StatCard label="Incidents résolus" value={stats?.incidentsResolus || 0} color={Colors.success} />
        </View>

        {/* Temps moyen */}
        <Card style={styles.tempsCard}>
         <View style={styles.titleRowCenter}>
           <Ionicons
             name="time-outline"
             size={26}
             color={Colors.primary}
             style={styles.titleIcon}
           />
           <Text style={styles.tempsTitre}>
             Temps moyen de réparation
           </Text>
         </View>
          <Text style={styles.tempsValeur}>
            {stats?.tempsMoyenRep || 0}
            <Text style={styles.tempsUnit}> min</Text>
          </Text>
          <Text style={styles.tempsNote}>
            {stats?.tempsMoyenRep < 60
              ? '✅ Bon niveau de performance'
              : stats?.tempsMoyenRep < 180
                ? '⚠️ Délai à améliorer'
                : '🔴 Délai trop élevé'}
          </Text>
        </Card>

        {/* Techniciens */}
        <Card>
          <View style={styles.titleRow}>
            <Ionicons
              name="people-outline"
              size={24}
              color={Colors.primary}
              style={styles.titleIcon}
            />
            <Text style={styles.cardTitle}>
              Équipe technique
            </Text>
          </View>
          <View style={styles.techRow}>
            <View style={styles.techStat}>
              <Text style={[styles.techVal, { color: Colors.primary }]}>{stats?.totalTechniciens || 0}</Text>
              <Text style={styles.techLabel}>Total</Text>
            </View>
            <View style={styles.techDivider} />
            <View style={styles.techStat}>
              <Text style={[styles.techVal, { color: Colors.success }]}>{stats?.techDisponibles || 0}</Text>
              <Text style={styles.techLabel}>Disponibles</Text>
            </View>
            <View style={styles.techDivider} />
            <View style={styles.techStat}>
              <Text style={[styles.techVal, { color: Colors.warning }]}>
                {(stats?.totalTechniciens || 0) - (stats?.techDisponibles || 0)}
              </Text>
              <Text style={styles.techLabel}>Occupés</Text>
            </View>
          </View>
          {/* Barre disponibilité */}
          <View style={styles.availBar}>
            <View style={[styles.availFill, {
              width: `${stats?.totalTechniciens ? (stats.techDisponibles / stats.totalTechniciens) * 100 : 0}%`,
              backgroundColor: Colors.success
            }]} />
          </View>
          <Text style={styles.availPct}>
            {stats?.totalTechniciens
              ? Math.round((stats.techDisponibles / stats.totalTechniciens) * 100)
              : 0}% disponibilité
          </Text>
        </Card>

        {/* Interventions par mois - Graphe barres manuel */}
        {stats?.interventionsParMois?.length > 0 && (
          <Card>
          <View style={styles.titleRow}>
            <Ionicons
              name="calendar-outline"
              size={24}
              color={Colors.primary}
              style={styles.titleIcon}
            />
            <Text style={styles.cardTitle}>
              Interventions par mois
            </Text>
          </View>
            <View style={styles.barChart}>
              {stats.interventionsParMois.slice(0, 6).reverse().map((item, i) => (
                <View key={i} style={styles.barItem}>
                  <Text style={styles.barCount}>{item.count}</Text>
                  <View style={styles.barWrapper}>
                    <View style={[styles.bar, {
                      height: Math.max((item.count / maxInterv) * 80, 4),
                      backgroundColor: i === 0 ? Colors.primary : Colors.primaryLight,
                    }]} />
                  </View>
                  <Text style={styles.barLabel}>{item.mois?.slice(5)}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* Incidents par priorité */}
        {stats?.incidentsParPriorite?.length > 0 && (
          <Card>
            <View style={styles.titleRow}>
              <Ionicons
                name="warning-outline"
                size={24}
                color="#F59E0B"
                style={styles.titleIcon}
              />
              <Text style={styles.cardTitle}>
                Incidents par priorité
              </Text>
            </View>
            {stats.incidentsParPriorite.map((item, i) => (
              <View key={i} style={styles.prioriteRow}>
                <PrioriteBadge priorite={item.priorite} />
                <View style={styles.prioriteBar}>
                  <View style={[styles.prioriteBarFill, {
                    width: `${(item.count / Math.max(...stats.incidentsParPriorite.map(p => p.count))) * 100}%`,
                    backgroundColor: item.priorite === 'critique' ? Colors.danger
                      : item.priorite === 'haute' ? Colors.warning
                        : item.priorite === 'normale' ? Colors.primary : Colors.success,
                  }]} />
                </View>
                <Text style={styles.prioriteCount}>{item.count}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Congestion réseau */}
        {stats?.congestionZones?.length > 0 && (
          <Card>
            <View style={styles.titleRow}>
              <Ionicons
                name="alert-circle-outline"
                size={22}
                color={Colors.danger}
              />
              <Text style={styles.cardTitle}>
                Zones en congestion
              </Text>
            </View>
            {stats.congestionZones.map((z, i) => (
              <View key={i} style={styles.congestionRow}>
                <Text style={styles.congestionZone}>{z.zone}</Text>
                <Text style={[styles.congestionPct, {
                  color: z.statut === 'critique' ? Colors.danger : Colors.warning
                }]}>
                  {parseFloat(z.pourcentage_utilisation).toFixed(1)}%
                </Text>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: Spacing.xl,
  },
  headerTitle: {
    color: Colors.textWhite,
    fontSize: 20, fontWeight: '800' },
  headerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2 },

  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  titleIcon: {
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
   titleRowCenter: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'center',
     marginBottom: 20,
   },
  scroll: { flex: 1, padding: Spacing.lg },
  kpiRow: { flexDirection: 'row', marginBottom: Spacing.md },
   tempsCard: {
     alignItems: 'center',
     marginBottom: Spacing.md,
     paddingVertical: 24,
     borderRadius: 22,
   },

   card: {
     borderRadius: 22,
     padding: 20,
   },
  tempsTitre: {
       color: Colors.textSecondary,
       fontSize: 13,
       fontWeight: '500',
       marginBottom: 4 },
  tempsValeur: {
      fontSize: 48,
      fontWeight: '900',
      color: Colors.primary },
  tempsUnit: {
       fontSize: 18,
       fontWeight: '400',
       color: Colors.textMuted },

  tempsNote: {
      fontSize: 12,
      color: Colors.textMuted,
      marginTop: 4 },

  cardTitle: {
      ...Typography.h4,
      marginBottom: Spacing.lg },
  techRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: Spacing.md },
  techStat: {
      alignItems: 'center' },

  techVal: {
      fontSize: 30, fontWeight: '900' },

  techLabel: {
     fontSize: 11,
     color: Colors.textMuted,
     marginTop: 2 },

  techDivider: {
    width: 1,
    backgroundColor: Colors.divider },

  availBar: {
       height: 8,
       backgroundColor: Colors.border,
       borderRadius: Radius.full,
       overflow: 'hidden' },

  availFill: {
      height: '100%',
      borderRadius: Radius.full },

  availPct: {
      fontSize: 11,
      color: Colors.textMuted,
      marginTop: 4,
      textAlign: 'center' },

  barChart: {
     flexDirection: 'row',
     alignItems: 'flex-end',
     justifyContent: 'space-around',
     height: 110,
     marginTop: 8 },

  barItem: {
       alignItems: 'center',
       flex: 1 },

  barCount: {
      fontSize: 10,
      color: Colors.textMuted,
      marginBottom: 3 },
  barWrapper: {
     width: 28,
     justifyContent: 'flex-end',
     height: 80 },
  bar: {
     width: 28,
     borderRadius: 6 },

  barLabel: {
     fontSize: 9,
     color: Colors.textMuted,
     marginTop: 4 },

  prioriteRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 10 },

  prioriteBar: {
     flex: 1,
     height: 8,
     backgroundColor: Colors.border,
     borderRadius: Radius.full,
     overflow: 'hidden' },

  prioriteBarFill: {
  height: '100%',
  borderRadius: Radius.full },

  prioriteCount: {
      fontSize: 13,
      fontWeight: '700',
      color: Colors.textPrimary,
      minWidth: 24, textAlign: 'right' },

  congestionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: Colors.divider },

  congestionZone: {
      ...Typography.body,
      fontSize: 13 },

  congestionPct: {
     fontSize: 14,
     fontWeight: '700' },
});
