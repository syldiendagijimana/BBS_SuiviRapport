// src/screens/DashboardScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  StatusBar
} from 'react-native';

import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { statsAPI, reseauAPI } from '../services/api';
import { getUnreadCount } from '../services/notificationsAPI';
import { Card, StatCard, SectionHeader, LoadingScreen } from '../components';
import { Colors, Spacing, Typography, Radius } from '../theme';

export default function DashboardScreen() {
  const { user, isAdmin, isSuperviseur } = useAuth();
  const navigation = useNavigation();
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pollingRef = useRef(null);

  const load = useCallback(async () => {
    try {
      // Yongereyemo .catch kugira ntizimire niyo API yananiwe
      const [s, n, count] = await Promise.all([
        statsAPI.dashboard().catch(() => ({})),
        reseauAPI.notifications().catch(() => []),
        getUnreadCount().catch(() => 0),
      ]);
      setStats(s);
      setNotifications(n.filter(n => !n.lu).slice(0, 3));
      setUnreadCount(count);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Rafraîchir le compteur de notifications toutes les 15 secondes
    pollingRef.current = setInterval(() => {
      getUnreadCount().then(setUnreadCount).catch(() => {});
    }, 15000);

    return () => clearInterval(pollingRef.current);
  }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return <LoadingScreen />;

  const roleLabels = { admin: 'Administrateur', superviseur: 'Superviseur', technicien: 'Technicien' };

  // Salutation dynamique selon l'heure
  const heureActuelle = new Date().getHours();
  const salutation = heureActuelle < 12 ? 'Bonjour' : heureActuelle < 18 ? 'Bon après-midi' : 'Bonsoir';

  // Indicateur global de santé du réseau (basé sur stats si disponible)
  const santeReseau = stats?.incidentsOuverts > 5 ? 'critique'
                     : stats?.incidentsOuverts > 0 ? 'attention'
                     : 'optimal';
  const santeConfig = {
    optimal:  { icon: 'check-decagram', color: Colors.success, label: 'Tout fonctionne normalement' },
    attention:{ icon: 'alert-decagram', color: Colors.warning, label: 'Quelques incidents en cours' },
    critique: { icon: 'alert-octagram', color: Colors.danger,  label: 'Attention requise' },
  }[santeReseau];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{salutation},</Text>
          <Text style={styles.userName}>{user?.prenom} {user?.nom}</Text>
          <Text style={styles.userRole}>{roleLabels[user?.role]}</Text>
        </View>

        {/* ── Icône notifications avec badge cliquable ── */}
        <TouchableOpacity
          style={styles.notifBtn}
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.7}
        >
          <Icon name="bell-outline" size={24} color="#FFF" />
          {unreadCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Bandeau santé réseau (vue d'ensemble immédiate) ── */}
        <TouchableOpacity
          style={[styles.santeCard, { borderColor: santeConfig.color + '40', backgroundColor: santeConfig.color + '0D' }]}
          onPress={() => navigation.navigate('Réseau')}
          activeOpacity={0.8}
        >
          <Icon name={santeConfig.icon} size={26} color={santeConfig.color} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.santeLabel, { color: santeConfig.color }]}>{santeConfig.label}</Text>
            <Text style={styles.santeSub}>Statut opérationnel du réseau</Text>
          </View>
          <Icon name="chevron-right" size={20} color={santeConfig.color} />
        </TouchableOpacity>

        <View style={styles.statsRow}>
          <StatCard label="Interventions" value={stats?.totalInterventions || 0}
          color={Colors.primary} />
          <View style={{ width: Spacing.md }} />
          <StatCard label="Ce mois" value={stats?.interventionsMois || 0}
          color={Colors.secondary} />
        </View>
        <View style={styles.statsRow}>
          <StatCard label="Incidents ouverts" value={stats?.incidentsOuverts || 0}
          color={Colors.danger} />
          <View style={{ width: Spacing.md }} />
          <StatCard label="Techniciens dispo" value={`${stats?.techDisponibles || 0}/${stats?.totalTechniciens || 0}`}
          color={Colors.success} />
        </View>


        <SectionHeader title="Actions rapides" />
        <View style={styles.actionsGrid}>
          <ActionButton icon="file-plus" label="Nouveau rapport"
          onPress={() => navigation.navigate('Rapports')} color={Colors.primary} />
          {(isAdmin || isSuperviseur) && (
            <ActionButton icon="wrench" label="Techniciens"
            onPress={() => navigation.navigate('Techniciens')} color={Colors.success} />
          )}
          <ActionButton icon="wifi" label="Réseau"
          onPress={() => navigation.navigate('Réseau')} color={Colors.info} />
          {(isAdmin || isSuperviseur) && (
            <ActionButton icon="account-group" label="Utilisateurs"
            onPress={() => navigation.navigate('Users')} color={Colors.secondary} />
          )}
          <ActionButton icon="alert-octagon" label="Signaler incident"
          onPress={() => navigation.navigate('Incidents')} color={Colors.warning} />
          <ActionButton icon="message-text" label="Discussion"
          onPress={() => navigation.navigate('Messages')} color="#075E54" />
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function ActionButton({ icon, label, onPress, color }) {
  return (
    <TouchableOpacity
      style={[styles.actionBtn, {
      borderColor: color + '30',
      backgroundColor: color + '10' }]}
      onPress={onPress}
    >
      {/* Kwirinda ikosa rya name */}
      <Icon name={icon || "help-circle-outline"} size={28}
      color={color} style={{ marginBottom: 6 }} />
      <Text style={[styles.actionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 30,
    paddingBottom: 24,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  greeting: {
   color: 'rgba(255,255,255,0.8)',
   fontSize: 14
   },
  userName: {
    color: Colors.textWhite,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2 },
  userRole: {
   color: 'rgba(255,255,255,0.7)',
   fontSize: 12,
   fontWeight: '600' },
  notifBtn: {
    position: 'relative',
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12 },
  notifBadge: {
    position: 'absolute',
    top: 2, right: 2,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
  color: Colors.textWhite,
  fontSize: 10,
  fontWeight: '700' },
  scroll: { flex: 1,
  padding: Spacing.lg },

  santeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    marginBottom: Spacing.md,
  },
  santeLabel: {
    fontSize: 13,
    fontWeight: '700' },
  santeSub: {
      fontSize: 11,
      color: Colors.textMuted,
      marginTop: 1 },

  statsRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md },
  tempsCard: {
    alignItems: 'center',
    marginBottom: Spacing.md },
  tempsTitre: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4 },
  tempsValeur: {
     fontSize: 36,
     fontWeight: '900',
     color: Colors.primary },
  tempsUnit: {
      fontSize: 16,
      fontWeight: '400',
      color: Colors.textMuted },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  voirToutTxt: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary
    },

  notifCard: {
     padding: Spacing.md,
     marginBottom: Spacing.sm,
     borderLeftWidth: 3 },
  notif_critique: {
     borderLeftColor: Colors.danger,
     backgroundColor: Colors.danger + '08' },
  notif_alerte: {
    borderLeftColor: Colors.warning,
    backgroundColor: Colors.warning + '08' },
  notif_info: {
    borderLeftColor: Colors.info,
    backgroundColor: Colors.info + '08' },
  notif_succes: {
     borderLeftColor: Colors.success,
     backgroundColor: Colors.success + '08' },
  notifTitle: {
     ...Typography.h4,
     fontSize: 13 },
  notifMsg: {
     ...Typography.caption,
     marginTop: 2 },
  actionsGrid: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: Spacing.md },
  actionBtn: {
    width: '47%',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  actionLabel: {
     fontSize: 12,
     fontWeight: '600',
     textAlign: 'center' },
});
