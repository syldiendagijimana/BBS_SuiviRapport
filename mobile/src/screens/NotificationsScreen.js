import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../services/notificationsAPI';

import { Colors, Spacing, Radius } from '../theme';

export default function NotificationsScreen() {
  const navigation = useNavigation();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications(50);

      // SAFE RESPONSE
      setNotifications(Array.isArray(data) ? data : data?.messages || []);
    } catch (e) {
      console.log('Erreur notifications:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handlePress = async (item) => {
    try {
      if (!item.lu) {
        setNotifications(prev =>
          prev.map(n => n.id === item.id ? { ...n, lu: 1 } : n)
        );
        await markAsRead(item.id);
      }

      const text = `${item.titre} ${item.message}`.toLowerCase();

      // NAVIGATION SAFE (IMPORTANT)
      if (text.includes('incident')) {
        return navigation.navigate('Incidents');
      }

      if (text.includes('rapport')) {
        return navigation.navigate('Rapports');
      }

      if (text.includes('technicien')) {
        return navigation.navigate('Techniciens');
      }

      if (text.includes('utilisateur')) {
        return navigation.navigate('Users');
      }

      if (text.includes('message')) {
        return navigation.navigate('Messages');
      }

      // ❗ FIX IMPORTANT : éviter crash Notifications
      // navigation.navigate('Notifications') ❌ à éviter si non déclaré

    } catch (e) {
      console.log(e.message);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Supprimer ?', 'Cette notification sera supprimée', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setNotifications(prev => prev.filter(n => n.id !== id));
          await deleteNotification(id);
        },
      },
    ]);
  };

  const handleMarkAll = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, lu: 1 })));
    await markAllAsRead();
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.lu && styles.unread]}
      onPress={() => handlePress(item)}
    >
      <View style={styles.icon}>
        <Icon name="bell" size={20} color={Colors.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{item.titre}</Text>
        <Text style={styles.msg} numberOfLines={2}>{item.message}</Text>
      </View>

      <TouchableOpacity onPress={() => handleDelete(item.id)}>
        <Icon name="close" size={18} color="#999" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={Colors.primary} />

      <View style={styles.header}>
        <Text style={styles.headerText}>Notifications</Text>

        <TouchableOpacity onPress={handleMarkAll}>
          <Text style={styles.readAll}>Tout lire</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={i => String(i.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: Colors.primary,
  },

  headerText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  readAll: { color: '#fff' },

  card: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },

  unread: {
    backgroundColor: '#eef6ff',
  },

  icon: {
    marginRight: 10,
    justifyContent: 'center',
  },

  title: { fontWeight: 'bold' },
  msg: { color: '#555' },
});