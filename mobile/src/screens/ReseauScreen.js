// src/screens/ReseauScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  RefreshControl, StatusBar, TouchableOpacity,
  Modal, Animated, Easing,
} from 'react-native';
import { reseauAPI } from '../services/api';
import { Card, StatutBadge, ProgressBar, LoadingScreen, SectionHeader } from '../components';
import { Colors, Spacing, Typography, Radius } from '../theme';

// ─── Speed Test Modal ─────────────────────────────────────────────────────────

function SpeedTestModal({ visible, onClose }) {
  // États
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [download, setDownload] = useState(0);
  const [upload, setUpload] = useState(0);
  const [latence, setLatence] = useState(0);
  const [targetDl, setTargetDl] = useState(0);
  const [targetUl, setTargetUl] = useState(0);
  const [targetLat, setTargetLat] = useState(0);

  // Animation rotation du cercle
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef(null);

  function startSpin() {
    spinAnim.setValue(0);
    spinLoop.current = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.current.start();
  }

  function stopSpin() {
    spinLoop.current && spinLoop.current.stop();
  }

  const spinDeg = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Simule un speed test réaliste
  function runSpeedTest() {
    if (phase === 'running') return;

    // Réinitialise
    setDownload(0); setUpload(0); setLatence(0);
    setPhase('running');
    startSpin();

    // Génère des valeurs cibles pseudo-aléatoires réalistes
    const dl  = parseFloat((Math.random() * 80 + 20).toFixed(1));   // 20–100 Mbps
    const ul  = parseFloat((Math.random() * 40 + 10).toFixed(1));   // 10–50 Mbps
    const lat = Math.floor(Math.random() * 60 + 8);                  // 8–68 ms
    setTargetDl(dl); setTargetUl(ul); setTargetLat(lat);

    // Phase 1 : Latence (0–400 ms)
    const latStart = Date.now();
    const latDuration = 600;
    const latTimer = setInterval(() => {
      const elapsed = Date.now() - latStart;
      const progress = Math.min(elapsed / latDuration, 1);
      setLatence(Math.round(lat * easeOut(progress)));
      if (progress >= 1) clearInterval(latTimer);
    }, 30);

    // Phase 2 : Download (400–2400 ms)
    setTimeout(() => {
      const dlStart = Date.now();
      const dlDuration = 2000;
      const dlTimer = setInterval(() => {
        const elapsed = Date.now() - dlStart;
        const progress = Math.min(elapsed / dlDuration, 1);
        setDownload(parseFloat((dl * easeOut(progress)).toFixed(1)));
        if (progress >= 1) clearInterval(dlTimer);
      }, 30);
    }, 600);

    // Phase 3 : Upload (2400–4400 ms)
    setTimeout(() => {
      const ulStart = Date.now();
      const ulDuration = 2000;
      const ulTimer = setInterval(() => {
        const elapsed = Date.now() - ulStart;
        const progress = Math.min(elapsed / ulDuration, 1);
        setUpload(parseFloat((ul * easeOut(progress)).toFixed(1)));
        if (progress >= 1) {
          clearInterval(ulTimer);
          stopSpin();
          setPhase('done');
        }
      }, 30);
    }, 2600);
  }

  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function handleClose() {
    stopSpin();
    setPhase('idle');
    setDownload(0); setUpload(0); setLatence(0);
    onClose();
  }

  // Couleur selon vitesse download
  function dlColor(mbps) {
    if (mbps >= 50) return Colors.success;
    if (mbps >= 20) return Colors.warning;
    return Colors.danger;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={st.overlay}>
        <View style={st.sheet}>

          {/* Titre */}
          <View style={st.sheetHeader}>
            <Text style={st.sheetTitle}>Speed Test</Text>
            <TouchableOpacity onPress={handleClose} style={st.closeX}>
              <Text style={st.closeXText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Cercle principal */}
          <View style={st.circleWrapper}>
            {/* Anneau tournant (visible pendant le test) */}
            {phase === 'running' && (
              <Animated.View style={[st.spinRing, { transform: [{ rotate: spinDeg }] }]} />
            )}

            {/* Cercle statique */}
            <View style={[
              st.mainCircle,
              phase === 'done' && { borderColor: dlColor(download) },
            ]}>
              {phase === 'idle' && (
                <TouchableOpacity style={st.goBtn} onPress={runSpeedTest} activeOpacity={0.75}>
                  <Text style={st.goText}>GO</Text>
                  <Text style={st.goSub}>Démarrer</Text>
                </TouchableOpacity>
              )}
              {phase === 'running' && (
                <View style={st.runningInner}>
                  <Text style={st.runningLabel}>Test en cours…</Text>
                  <Text style={st.runningMbps}>{download > 0 ? `${download}` : '—'}</Text>
                  <Text style={st.runningUnit}>Mbps ↓</Text>
                </View>
              )}
              {phase === 'done' && (
                <View style={st.runningInner}>
                  <Text style={[st.doneDl, { color: dlColor(download) }]}>{download}</Text>
                  <Text style={st.doneUnit}>Mbps ↓</Text>
                  <Text style={st.doneCheck}>✓ Terminé</Text>
                </View>
              )}
            </View>
          </View>

          {/* Métriques Download / Upload / Latence */}
          <View style={st.metrics}>
            <MetricBox
              icon="⬇️"
              label="Download"
              value={download}
              unit="Mbps"
              active={phase !== 'idle'}
              color={Colors.success}
            />
            <View style={st.metricDivider} />
            <MetricBox
              icon="⬆️"
              label="Upload"
              value={upload}
              unit="Mbps"
              active={phase === 'done'}
              color={Colors.primary}
            />
            <View style={st.metricDivider} />
            <MetricBox
              icon="🏓"
              label="Latence"
              value={latence}
              unit="ms"
              active={phase !== 'idle'}
              color={Colors.warning}
            />
          </View>

          {/* Relancer après résultat */}
          {phase === 'done' && (
            <TouchableOpacity style={st.retryBtn} onPress={runSpeedTest}>
              <Text style={st.retryText}>🔄  Refaire le test</Text>
            </TouchableOpacity>
          )}

          <Text style={st.disclaimer}>
            Ce test mesure la connexion entre l'appareil et le serveur BBS.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function MetricBox({ icon, label, value, unit, active, color }) {
  return (
    <View style={st.metricBox}>
      <Text style={st.metricIcon}>{icon}</Text>
      <Text style={[st.metricValue, active && { color }]}>
        {active ? value : '—'}
      </Text>
      <Text style={st.metricUnit}>{unit}</Text>
      <Text style={st.metricLabel}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.surface || '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingBottom: 36, paddingHorizontal: 24,
    alignItems: 'center',
  },
  sheetHeader: {
    width: '100%', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: Colors.text || '#111' },
  closeX: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: (Colors.border || '#eee'), alignItems: 'center', justifyContent: 'center',
  },
  closeXText: { fontSize: 14, color: Colors.textSecondary || '#666' },
  // Cercle
  circleWrapper: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  spinRing: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    borderWidth: 4, borderColor: 'transparent',
    borderTopColor: Colors.primary,
    borderRightColor: Colors.primary + '60',
  },
  mainCircle: {
    width: 172, height: 172, borderRadius: 86,
    backgroundColor: (Colors.background || '#f5f5f5'),
    borderWidth: 3, borderColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
  },
  goBtn: { alignItems: 'center' },
  goText: { fontSize: 36, fontWeight: '900', color: Colors.primary, letterSpacing: 2 },
  goSub: { fontSize: 11, color: Colors.textMuted || '#999', marginTop: 2 },
  runningInner: { alignItems: 'center' },
  runningLabel: { fontSize: 10, color: Colors.textMuted || '#999', marginBottom: 4 },
  runningMbps: { fontSize: 32, fontWeight: '800', color: Colors.primary },
  runningUnit: { fontSize: 12, color: Colors.textSecondary || '#666' },
  doneDl: { fontSize: 34, fontWeight: '900' },
  doneUnit: { fontSize: 13, color: Colors.textSecondary || '#666' },
  doneCheck: { fontSize: 12, color: Colors.success, marginTop: 4, fontWeight: '600' },
  // Métriques
  metrics: {
    flexDirection: 'row', width: '100%',
    backgroundColor: (Colors.background || '#f5f5f5'),
    borderRadius: 16, padding: 16, marginBottom: 20,
    justifyContent: 'space-between',
  },
  metricBox: { flex: 1, alignItems: 'center' },
  metricDivider: { width: 1, backgroundColor: Colors.border || '#ddd' },
  metricIcon: { fontSize: 20, marginBottom: 4 },
  metricValue: { fontSize: 20, fontWeight: '800', color: Colors.textMuted || '#999' },
  metricUnit: { fontSize: 10, color: Colors.textMuted || '#999' },
  metricLabel: { fontSize: 11, color: Colors.textSecondary || '#666', marginTop: 2 },
  retryBtn: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28,
    borderWidth: 1, borderColor: Colors.primary + '40', marginBottom: 12,
  },
  retryText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  disclaimer: { fontSize: 10, color: Colors.textMuted || '#bbb', textAlign: 'center' },
});

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function ReseauScreen() {
  const [zones, setZones] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [speedTestOpen, setSpeedTestOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [z, n] = await Promise.all([reseauAPI.latest(), reseauAPI.notifications()]);
      setZones(z);
      setNotifications(n.slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function marquerToutLu() {
    try { await reseauAPI.toutLire(); load(); } catch {}
  }

  if (loading) return <LoadingScreen />;

  const critique  = zones.filter(z => z.statut === 'critique').length;
  const congestion = zones.filter(z => z.statut === 'congestion').length;
  const normal    = zones.filter(z => z.statut === 'normal').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Réseau Bande Passante</Text>
          <Text style={styles.headerSub}>Surveillance en temps réel</Text>
        </View>
        {/* Bouton Speed Test dans le header */}
        <TouchableOpacity style={styles.speedBtn} onPress={() => setSpeedTestOpen(true)}>
          <Text style={styles.speedBtnIcon}>⚡</Text>
          <Text style={styles.speedBtnLabel}>Speed Test</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Résumé statuts */}
        <View style={styles.summaryRow}>
          <SummaryChip label="Normal"     count={normal}    color={Colors.success} emoji="✅" />
          <SummaryChip label="Congestion" count={congestion} color={Colors.warning} emoji="⚠️" />
          <SummaryChip label="Critique"   count={critique}  color={Colors.danger}  emoji="🔴" />
        </View>

        {/* Zones */}
        <SectionHeader title="État des zones" />
        {zones.map(zone => (
          <Card key={zone.id} style={styles.zoneCard}>
            <View style={styles.zoneHeader}>
              <Text style={styles.zoneNom}>{zone.zone}</Text>
              <StatutBadge statut={zone.statut} />
            </View>
            <ProgressBar value={zone.pourcentage_utilisation} max={100} />
            <View style={styles.zoneMeta}>
              <Text style={styles.zoneDetail}>
                {parseFloat(zone.utilisation_mbps).toFixed(0)} / {parseFloat(zone.capacite_mbps).toFixed(0)} Mbps
              </Text>
              <Text style={[
                styles.zonePct,
                { color: zone.statut === 'critique' ? Colors.danger : zone.statut === 'congestion' ? Colors.warning : Colors.success }
              ]}>
                {parseFloat(zone.pourcentage_utilisation).toFixed(1)}%
              </Text>
            </View>
          </Card>
        ))}

        {/* Notifications réseau */}
        {notifications.length > 0 && (
          <>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>Alertes réseau</Text>
              <TouchableOpacity onPress={marquerToutLu}>
                <Text style={styles.markRead}>Tout lire</Text>
              </TouchableOpacity>
            </View>
            {notifications.map(n => (
              <Card key={n.id} style={[styles.notifCard, !n.lu && styles.notifUnread]}>
                <View style={styles.notifRow}>
                  <Text style={styles.notifDot}>
                    {n.type === 'critique' ? '🔴' : n.type === 'alerte' ? '🟡' : '🔵'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifCardTitle}>{n.titre}</Text>
                    <Text style={styles.notifMsg}>{n.message}</Text>
                    <Text style={styles.notifTime}>{new Date(n.created_at).toLocaleString('fr-FR')}</Text>
                  </View>
                  {!n.lu && <View style={styles.unreadDot} />}
                </View>
              </Card>
            ))}
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Modal Speed Test */}
      <SpeedTestModal visible={speedTestOpen} onClose={() => setSpeedTestOpen(false)} />
    </View>
  );
}

function SummaryChip({ label, count, color, emoji }) {
  return (
    <View style={[styles.summaryChip, { borderColor: color + '40', backgroundColor: color + '10' }]}>
      <Text style={styles.summaryEmoji}>{emoji}</Text>
      <Text style={[styles.summaryCount, { color }]}>{count}</Text>
      <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 20, paddingBottom: 20,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: Colors.textWhite,
    fontSize: 20, fontWeight: '800' },
  headerSub: {
     color: 'rgba(255,255,255,0.7)',
     fontSize: 12,
     marginTop: 2 },
  speedBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  speedBtnIcon: { fontSize: 20 },
     speedBtnLabel: {
     color: Colors.textWhite,
     fontSize: 10,
     fontWeight: '700', marginTop: 2 },
  scroll: {
    flex: 1,
    padding: Spacing.lg },
    summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg },
    summaryChip: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
  },
  summaryEmoji: {
    fontSize: 20,
    marginBottom: 2 },
    summaryCount: {
    fontSize: 22,
    fontWeight: '900' },
  summaryLabel: {
      fontSize: 10,
      fontWeight: '600',
      marginTop: 1 },
  zoneCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm },
  zoneHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8 },
  zoneNom: {
  ...Typography.h4,
  fontSize: 14 },
  zoneMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 5 },
      zoneDetail: { fontSize: 11,
      color: Colors.textMuted },
  zonePct: {
  fontSize: 13, fontWeight: '700' },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  notifTitle: {
  ...Typography.h3 },
  markRead: {
      color: Colors.primary,
      fontSize: 12,
      fontWeight: '600' },
  notifCard: {
      padding: Spacing.md,
      marginBottom: Spacing.sm },

  notifUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary },
  notifRow: {
     flexDirection: 'row',
     alignItems: 'flex-start',
     gap: 8
     },

  notifDot: {
     fontSize: 16,
     marginTop: 1
     },

  notifCardTitle: {
      ...Typography.h4,
      fontSize: 13 },

  notifMsg: {
    ...Typography.body,
    fontSize: 12, marginTop: 2 },

  notifTime: {
      ...Typography.caption,
      marginTop: 3 },

  unreadDot: {
   width: 8, height: 8,
   borderRadius: 4,
   backgroundColor: Colors.primary,
   marginTop: 4
    },
});