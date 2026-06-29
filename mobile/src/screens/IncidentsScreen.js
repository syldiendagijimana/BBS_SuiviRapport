// src/screens/IncidentsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { incidentsAPI } from '../services/api';
import { Card, PrioriteBadge, StatutBadge, EmptyState, LoadingScreen, Selector } from '../components';
import { Colors, Spacing, Typography } from '../theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const FILTRES_STATUT = [
  { label: 'Tous', value: '' }, { label: 'Ouvert', value: 'ouvert' },
  { label: 'En cours', value: 'en_cours' }, { label: 'Résolu', value: 'resolu' },
];

export default function IncidentsScreen() {
  const navigation = useNavigation();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtreStatut, setFiltreStatut] = useState('');

  const load = useCallback(async () => {
    try {
      const params = {};
      if (filtreStatut) params.statut = filtreStatut;
      const d = await incidentsAPI.list(params);
      setIncidents(d);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [filtreStatut]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>
          Gestion des Incidents
        </Text>

        <Text style={styles.headerSubTitle}>
          Suivi et gestion des incidents réseau
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => navigation.navigate('IncidentForm', {})}
        style={styles.addBtn}
      >
        <Ionicons
          name="add"
          size={24}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
      <View style={styles.filterContainer}>
        <Selector value={filtreStatut} options={FILTRES_STATUT} onChange={setFiltreStatut} />
      </View>

      <FlatList
        data={incidents}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />}
        ListEmptyComponent={<EmptyState title="Aucun incident" subtitle="Aucun incident signalé" icon="✅" />}
        renderItem={({ item }) => (
          <Card
            onPress={() => navigation.navigate('IncidentForm', { incident: item })}
            style={styles.card}
          >
            <View style={styles.incidentHeader}>
              <Text style={styles.incidentTitre} numberOfLines={1}>
                {item.titre}
              </Text>

              <StatutBadge statut={item.statut} />
            </View>

            <Text
              style={styles.incidentDesc}
              numberOfLines={2}
            >
              {item.description}
            </Text>

            <View style={styles.separator} />

            <View style={styles.metaContainer}>

              <View style={styles.topRow}>
                {item.zone && (
                  <View style={styles.metaItem}>
                    <Ionicons
                      name="location-outline"
                      size={15}
                      color={Colors.primary}
                    />
                    <Text style={styles.metaText}>
                      {item.zone}
                    </Text>
                  </View>
                )}

                <View style={styles.metaItem}>
                  <Ionicons
                    name="warning-outline"
                    size={15}
                    color={Colors.warning}
                  />
                  <Text
                    style={[
                      styles.metaText,
                      {
                        color:
                          item.priorite === 'critique'
                            ? '#DC2626'
                            : item.priorite === 'haute'
                            ? '#F59E0B'
                            : item.priorite === 'normale'
                            ? '#2563EB'
                            : '#10B981',
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {item.priorite}
                  </Text>
                </View>
              </View>

              <View style={styles.dateRow}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={Colors.textMuted}
                />
                <Text style={styles.metaText}>
                  {new Date(item.date_signalement).toLocaleDateString('fr-FR')}
                </Text>
              </View>

            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: {
    borderRadius: 16,
  },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 30,
    paddingBottom: 20,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },

  headerSubTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 3,
  },

  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },

  incidentTitre: {
    ...Typography.h4,
    flex: 1,
    marginRight: 10,
  },

  incidentDesc: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: 10,
    lineHeight: 20,
  },

  separator: {
    height: 1,
    backgroundColor: '#ECECEC',
    marginVertical: 10,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
filterContainer: {
  paddingHorizontal: Spacing.lg,
  paddingTop: Spacing.md,
  paddingBottom: 4,
},

list: {
  padding: Spacing.lg,
  paddingBottom: 20,
},
metaContainer: {
  marginTop: 8,
},

topRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},

dateRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 8,
},

metaItem: {
  flexDirection: 'row',
  alignItems: 'center',
},

metaText: {
  marginLeft: 4,
  fontSize: 12,
  color: Colors.textMuted,
},
priorityText: {
  fontWeight: '700',
  textTransform: 'capitalize',
},
});
