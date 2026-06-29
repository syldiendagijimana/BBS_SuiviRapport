// src/screens/RapportsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { rapportsAPI } from '../services/api';
import { Card, StatutBadge, EmptyState, LoadingScreen } from '../components';
import { Colors, Spacing, Typography, Radius } from '../theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function RapportsScreen() {
  const navigation = useNavigation();
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try { const d = await rapportsAPI.list(); setRapports(d); }
    catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Gestion des Rapports sur terrain</Text>
        <TouchableOpacity onPress={() => navigation.navigate('RapportForm', {})} style={styles.addBtn}>
       <Ionicons
         name="add-circle"
         size={30}
         color="#fff"
       />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rapports}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />}
        ListEmptyComponent={<EmptyState title="Aucun rapport" subtitle="Créez votre premier rapport terrain" icon="📋" />}
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('RapportDetail', { id: item.id })}>
            <View style={styles.rapportHeader}>
              <Text style={styles.rapportTitre} numberOfLines={1}>{item.titre}</Text>
              <StatutBadge statut={item.statut} />
            </View>
            <Text style={styles.rapportDesc} numberOfLines={2}>{item.description_panne}</Text>
            <View style={styles.rapportMeta}>
              <View style={styles.metaItem}>
                <Ionicons
                  name="person-outline"
                  size={15}
                  color={Colors.primary}
                />
                <Text style={styles.metaText}>
                  {item.prenom} {item.nom}
                </Text>
              </View>

              <View style={styles.metaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={Colors.primary}
                />
                <Text style={styles.metaText}>
                  {new Date(item.heure_intervention).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            </View>
            {item.photos?.length > 0 && (
             <View style={styles.photoRow}>
               <Ionicons
                 name="camera-outline"
                 size={16}
                 color={Colors.primary}
               />
               <Text style={styles.photosCount}>
                 {item.photos.length} photo(s)
               </Text>
             </View>
            )}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: Colors.background
  },
  header: {
      backgroundColor: Colors.primary,
      paddingTop: 30,
      paddingBottom: 16,
      paddingHorizontal:
      Spacing.lg,
      flexDirection: 'row',
      alignItems: 'center' },

 headerTitle: {
      flex: 1,
      color: Colors.textWhite,
      fontSize: 18,
      fontWeight: '700' },
 addBtn: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center' },
      addIcon: {
      color: Colors.textWhite,
      fontSize: 24,
      lineHeight: 36 },
  list: {
      padding: Spacing.lg },
      rapportHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 6 },
  rapportTitre: {
       ...Typography.h4, flex: 1,
       marginRight: 8 },
  rapportDesc: {
      ...Typography.body,
      fontSize: 13,
      marginBottom: 8 },
      rapportMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between' },
  metaText: {
      fontSize: 11,
      color: Colors.textMuted },
      photosCount: {
      fontSize: 11,
      color: Colors.primary,
      marginTop: 4,
      fontWeight: '600' },
      metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
      },

  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  metaText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: 4,
  },

  photosCount: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 5,
  },
});
