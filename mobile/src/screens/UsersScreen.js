// src/screens/UsersScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, RefreshControl, TextInput, StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, Button, EmptyState, LoadingScreen } from '../components';
import { Colors, Spacing, Typography, Radius } from '../theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const roleColors = { admin: Colors.danger, superviseur: Colors.warning, technicien: Colors.primary };
const roleLabels = { admin: 'Admin', superviseur: 'Superviseur', technicien: 'Technicien' };

export default function UsersScreen() {
  const navigation = useNavigation();
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await usersAPI.list();
      setUsers(data);
      setFiltered(data);
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!search.trim()) { setFiltered(users); return; }
    const q = search.toLowerCase();
    setFiltered(users.filter(u =>
      `${u.nom} ${u.prenom} ${u.email}`.toLowerCase().includes(q)
    ));
  }, [search, users]);

  async function handleToggle(user) {
    const action = user.actif ? 'désactiver' : 'activer';
    Alert.alert('Confirmation', `Voulez-vous ${action} le compte de ${user.prenom} ${user.nom} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: action.charAt(0).toUpperCase() + action.slice(1),
        onPress: async () => {
          try {
            await usersAPI.toggle(user.id);
            load();
          } catch (e) { Alert.alert('Erreur', e.message); }
        }
      }
    ]);
  }

  async function handleDelete(user) {
    Alert.alert('Supprimer', `Supprimer le compte de ${user.prenom} ${user.nom} ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          try {
            await usersAPI.delete(user.id);
            load();
          } catch (e) { Alert.alert('Erreur', e.message); }
        }
      }
    ]);
  }

  if (loading) return <LoadingScreen />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>
            Gestion des Utilisateurs
          </Text>
        </View>

        {isAdmin ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('UserForm', {})}
            style={styles.addBtn}
          >
            <Ionicons
              name="add"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={18}
          color={Colors.textMuted}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un utilisateur..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={Colors.textLight}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} colors={[Colors.primary]} />}
        ListEmptyComponent={<EmptyState title="Aucun utilisateur" icon="👥" />}
        renderItem={({ item }) => (
          <Card style={[styles.userCard, !item.actif && styles.inactiveCard]}>
            <View style={styles.userRow}>
              <View style={[styles.avatar, { backgroundColor: roleColors[item.role] + '20' }]}>
                <Text style={[styles.avatarText, { color: roleColors[item.role] }]}>
                  {item.prenom?.[0]}{item.nom?.[0]}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.prenom} {item.nom}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <View style={styles.userMeta}>
                  <Badge label={roleLabels[item.role]} color={roleColors[item.role]} />
                  <Badge label={item.actif ? 'Actif' : 'Désactivé'} color={item.actif ? Colors.success : Colors.textMuted} style={{ marginLeft: 6 }} />
                </View>
              </View>
            </View>

            {isAdmin && (
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('UserForm', { user: item })}
                  style={[styles.actionBtn, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '40' }]}
                >
                  <View style={styles.actionContent}>
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={Colors.primary}
                    />
                    <Text
                      style={[
                        styles.actionText,
                        { color: Colors.primary }
                      ]}
                    >
                      Modifier
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleToggle(item)}
                  style={[styles.actionBtn, { backgroundColor: (item.actif ? Colors.warning : Colors.success) + '15', borderColor: (item.actif ? Colors.warning : Colors.success) + '40' }]}
                >
                  <View style={styles.actionContent}>
                    <Ionicons
                      name={
                        item.actif
                          ? 'lock-closed-outline'
                          : 'lock-open-outline'
                      }
                      size={16}
                      color={
                        item.actif
                          ? Colors.warning
                          : Colors.success
                      }
                    />

                    <Text
                      style={[
                        styles.actionText,
                        {
                          color: item.actif
                            ? Colors.warning
                            : Colors.success
                        }
                      ]}
                    >
                      {item.actif ? 'Désactiver' : 'Activer'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={[styles.actionBtn, { backgroundColor: Colors.danger + '10', borderColor: Colors.danger + '30' }]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={Colors.danger}
                  />

                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
header: {
  backgroundColor: Colors.primary,
  paddingTop: 20,
  paddingBottom: 16,
  paddingHorizontal: Spacing.lg,
  flexDirection: 'row',
  alignItems: 'center',
},
headerTitle: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '700',
},
 backBtn: {
   width: 40,
   height: 40,
   borderRadius: 12,
   backgroundColor: 'rgba(255,255,255,0.15)',
   justifyContent: 'center',
   alignItems: 'center',
 },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  backIcon: {
    color: Colors.textWhite,
    fontSize: 24 },

  headerTitle: {
     flex: 1,
     color: Colors.textWhite,
     fontSize: 18,
     fontWeight: '700' },

  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIcon: {
     color: Colors.textWhite,
     fontSize: 24, lineHeight: 36 },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0,
    height: 1 },
    shadowOpacity: 0.05,
    elevation: 2,
  },

  searchIcon: {
     fontSize: 16,
     marginRight: 8 },

  searchInput: {
      flex: 1,
      fontSize: 14,
      color: Colors.textPrimary },

  list: {
     padding: Spacing.lg,
     paddingTop: 0 },
  userCard: {
      padding: Spacing.md },

  inactiveCard: {
      opacity: 0.7 },

  userRow: {
     flexDirection: 'row',
     alignItems: 'center' },

  avatar: {
     width: 48,
     height: 48,
     borderRadius: 24,
     alignItems: 'center',
     justifyContent: 'center',
     marginRight: Spacing.md },
  avatarText: {
     fontSize: 16,
     fontWeight: '700' },

  userInfo: {
     flex: 1 },

  userName: {
     ...Typography.h4,
     fontSize: 15 },

  userEmail: {
     ...Typography.caption,
     marginBottom: 6 },

  userMeta: {
      flexDirection: 'row' },

  actions: {
     flexDirection: 'row',
     gap: 8,
     marginTop: Spacing.md,
     paddingTop: Spacing.md,
     borderTopWidth: 1,
     borderTopColor: Colors.divider },

  actionBtn: {
     flex: 1,
     paddingVertical: 7,
     borderRadius: Radius.md,
     alignItems: 'center',
     borderWidth: 1 },

  actionText: {
     fontSize: 12,
     fontWeight: '600' },

  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
