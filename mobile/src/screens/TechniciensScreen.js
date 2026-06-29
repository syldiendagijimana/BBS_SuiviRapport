// src/screens/TechniciensScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
     View,
     Text,
     StyleSheet,
     FlatList,
     TouchableOpacity,
     Alert,
     RefreshControl,
     StatusBar
     } from 'react-native';

import { useNavigation } from '@react-navigation/native';
import { techniciensAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, EmptyState, LoadingScreen } from '../components';
import { Colors, Spacing, Typography, Radius } from '../theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function TechniciensScreen() {
  const navigation = useNavigation();
  const { canManageTechniciens } = useAuth();
  const [techniciens, setTechniciens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await techniciensAPI.list();
      setTechniciens(data);
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
   <View style={styles.header}>
     <TouchableOpacity
       onPress={() => navigation.goBack()}
       style={styles.backBtn}
     >
       <Ionicons
         name="arrow-back"
         size={22}
         color="#fff"
       />
     </TouchableOpacity>

     <Text style={styles.headerTitle}>
       Techniciens
     </Text>

     {canManageTechniciens ? (
       <TouchableOpacity
         onPress={() => navigation.navigate('TechnicienForm', {})}
         style={styles.addBtn}
       >
         <Ionicons
           name="person-add"
           size={22}
           color="#fff"
         />
       </TouchableOpacity>
     ) : (
       <View style={{ width: 40 }} />
     )}
   </View>

      <FlatList
        data={techniciens}
        keyExtractor={i => i.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing}
        onRefresh={() => {
                    setRefreshing(true); load(); }}
                    colors={[Colors.primary]} />}
        ListEmptyComponent={<EmptyState title="Aucun technicien" icon="🔧" />}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.avatar, {
                       backgroundColor: item.disponible ?
                       Colors.success + '20' : Colors.danger + '20' }]}>
                <Ionicons
                  name="construct"
                  size={24}
                  color={item.disponible ? Colors.success : Colors.warning}
                />
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.prenom} {item.nom}</Text>
                {item.email && (
                  <Text style={styles.sub}>
                    {item.email}
                  </Text>
                )}
                <Text style={styles.matricule}>Matricule: {item.matricule}</Text>
                {item.specialite && <Text style={styles.sub}>{item.specialite}</Text>}
                {item.zone_intervention && <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                             <Ionicons
                                               name="location"
                                               size={14}
                                               color={Colors.danger}
                                             />
                                             <Text style={[styles.sub, { marginLeft: 4 }]}>
                                               {item.zone_intervention}
                                             </Text>
                                           </View>}
                <Badge
                  label={item.disponible ? 'Disponible' : 'Occupé'}
                  color={item.disponible ? Colors.success : Colors.warning}
                  style={{ marginTop: 6 }}
                />
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => navigation.navigate('TachesList', { technicienId: item.id, technicienNom: `${item.prenom} ${item.nom}` })}
                style={[styles.cardBtn, { borderColor: Colors.primary + '40' }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name="document-text-outline"
                    size={14}
                    color={Colors.primary}
                  />
                  <Text
                    style={[
                      styles.cardBtnText,
                      { color: Colors.primary, marginLeft: 4 }
                    ]}
                  >
                    Missions
                  </Text>
                </View>
              </TouchableOpacity>
              {canManageTechniciens && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('TechnicienForm', { technicien: item })}
                  style={[styles.cardBtn, { borderColor: Colors.secondary + '40' }]}
                >
                 <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                   <Ionicons
                     name="create-outline"
                     size={14}
                     color={Colors.secondary}
                   />
                   <Text
                     style={[
                       styles.cardBtnText,
                       { color: Colors.secondary, marginLeft: 4 }
                     ]}
                   >
                     Modifier
                   </Text>
                 </View>
                </TouchableOpacity>
              )}
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 30,
    paddingBottom: 16,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  headerTitle: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: Colors.textWhite,
    fontSize: 20,
    fontWeight: '700',
  },
 backBtn: {
   width: 40,
   height: 40,
   borderRadius: 12,
   backgroundColor: 'rgba(255,255,255,0.15)',
   justifyContent: 'center',
   alignItems: 'center',
   zIndex: 1,
 },

 addBtn: {
   width: 40,
   height: 40,
   borderRadius: 12,
   backgroundColor: 'rgba(255,255,255,0.15)',
   justifyContent: 'center',
   alignItems: 'center',
   zIndex: 1,
 },
  backIcon: {
     color: Colors.textWhite,
     fontSize: 24 },


  addIcon: {
      color: Colors.textWhite,
      fontSize: 24,
      lineHeight: 36 },

  list: {
      padding: Spacing.lg },
  card: {
      padding: Spacing.md },

  row: {
      flexDirection: 'row',
      alignItems: 'flex-start' },

  avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: Spacing.md },

  info: { flex: 1 },
  name: {
     ...Typography.h4 },

  matricule: {
      fontSize: 12,
      color: Colors.primary,
      fontWeight: '600',
      marginBottom: 2 },
  sub: {
     ...Typography.caption,
     marginBottom: 1 },
  cardActions: {
     flexDirection: 'row',
     gap: 8,
     marginTop: Spacing.md,
     borderTopWidth: 1,
     borderTopColor: Colors.divider,
     paddingTop: Spacing.md },
  cardBtn: {
     flex: 1,
     paddingVertical: 7,
     borderRadius: Radius.md,
     alignItems: 'center',
     borderWidth: 1,
     backgroundColor: Colors.background },

  cardBtnText: { fontSize: 12, fontWeight: '600' },
});
