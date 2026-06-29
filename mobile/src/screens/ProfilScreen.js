// src/screens/ProfilScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Card, Button, Input, Badge } from '../components';
import { Colors, Spacing, Typography, Radius } from '../theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const roleLabels = { admin: 'Administrateur', superviseur: 'Superviseur', technicien: 'Technicien' };
const roleColors = { admin: Colors.danger, superviseur: Colors.warning, technicien: Colors.primary };

export default function ProfilScreen() {
  const navigation = useNavigation();
  const { user, logout, isAdmin, isSuperviseur } = useAuth();
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [ancienPwd, setAncienPwd] = useState('');
  const [nouveauPwd, setNouveauPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleChangePwd() {
    if (!ancienPwd || !nouveauPwd || !confirmPwd) {
      Alert.alert('Erreur', 'Tous les champs sont requis');
      return;
    }
    if (nouveauPwd !== confirmPwd) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (nouveauPwd.length < 6) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit faire au moins 6 caractères');
      return;
    }
    setLoading(true);
    try {
      await authAPI.changePassword({ ancien_password: ancienPwd, nouveau_password: nouveauPwd });
      Alert.alert('Succès', 'Mot de passe modifié avec succès');
      setShowPwdForm(false);
      setAncienPwd(''); setNouveauPwd(''); setConfirmPwd('');
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }

  function confirmLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: logout },
    ]);
  }

  const initiales = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`.toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* Header avec avatar */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{initiales}</Text>
        </View>
        <Text style={styles.userName}>{user?.prenom} {user?.nom}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        <Badge
          label={roleLabels[user?.role] || user?.role}
          color={roleColors[user?.role] || Colors.primary}
          style={styles.roleBadge}
        />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Informations */}
        <Card>
            <View style={styles.titleRow}>
              <Ionicons
                name="person-circle-outline"
                size={24}
                color={Colors.primary}
                style={styles.titleIcon}
              />
              <Text style={styles.sectionTitle}>
                Informations du compte
              </Text>
            </View>
          <InfoRow label="Prénom" value={user?.prenom} />
          <InfoRow label="Nom" value={user?.nom} />
          <InfoRow label="Email" value={user?.email} />
          <InfoRow label="Rôle" value={roleLabels[user?.role]} />
          <InfoRow label="Statut" value={user?.actif ? '✅ Actif' : '❌ Désactivé'} />
        </Card>

        {/* Raccourcis admin */}
        {(isAdmin || isSuperviseur) && (
          <Card>
            <View style={styles.titleRow}>
              <Ionicons
                name="settings-outline"
                size={24}
                color={Colors.primary}
                style={styles.titleIcon}
              />
              <Text style={styles.sectionTitle}>
                Administration
              </Text>
            </View>
            {isAdmin && (
              <MenuItem
                icon="people-outline"
                label="Gestion des utilisateurs"
                onPress={() => navigation.navigate('Users')}
              />
            )}
            <MenuItem
              icon="construct-outline"
              label="Gestion des techniciens"
              onPress={() => navigation.navigate('Techniciens')}
              color="#F59E0B"
            />
            <MenuItem
              icon="bar-chart-outline"
              label="Statistiques"
              onPress={() => navigation.navigate('Statistiques')}
              color="#10B981"
            />
          </Card>
        )}

        {/* Sécurité */}
        <Card>
          <View style={styles.titleRow}>
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color={Colors.primary}
              style={styles.titleIcon}
            />
            <Text style={styles.sectionTitle}>
              Sécurité
            </Text>
          </View>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowPwdForm(!showPwdForm)}
          >
            <Ionicons
              name="lock-closed-outline"
              size={22}
              color={Colors.primary}
              style={styles.menuIcon}
            />
            <Text style={styles.menuLabel}>Changer le mot de passe</Text>
            <Ionicons
              name={
                showPwdForm
                  ? 'chevron-up'
                  : 'chevron-forward'
              }
              size={18}
              color={Colors.textLight}
            />
          </TouchableOpacity>

          {showPwdForm && (
            <View style={styles.pwdForm}>
              <Input
                label="Ancien mot de passe"
                value={ancienPwd}
                onChangeText={setAncienPwd}
                secureTextEntry
                placeholder="••••••••"
              />
              <Input
                label="Nouveau mot de passe"
                value={nouveauPwd}
                onChangeText={setNouveauPwd}
                secureTextEntry
                placeholder="••••••••"
              />
              <Input
                label="Confirmer le mot de passe"
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                secureTextEntry
                placeholder="••••••••"
              />
              <View style={styles.pwdActions}>
                <Button
                  title={loading ? '...' : 'Confirmer'}
                  onPress={handleChangePwd}
                  loading={loading}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Annuler"
                  onPress={() => { setShowPwdForm(false); setAncienPwd(''); setNouveauPwd(''); setConfirmPwd(''); }}
                  variant="ghost"
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </View>
          )}
        </Card>

        {/* À propos */}
        <Card>
          <View style={styles.titleRow}>
            <Ionicons
              name="information-circle-outline"
              size={24}
              color={Colors.primary}
              style={styles.titleIcon}
            />
            <Text style={styles.sectionTitle}>
              À propos
            </Text>
          </View>
          <InfoRow label="Application" value="BBS Mobile" />
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Développeur" value="BBS Team" />
          <InfoRow label="Technologie" value="React Native + Node.js" />
        </Card>

        {/* Déconnexion */}
        <Button
          title="Se déconnecter"
          onPress={confirmLogout}
          variant="danger"
          size="lg"
          style={styles.logoutBtn}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function MenuItem({ icon, label, onPress, color = Colors.primary }) {
  return (
   <TouchableOpacity
     style={styles.menuItem}
     onPress={onPress}
   >
     <Ionicons
       name={icon}
       size={22}
       color={color}
       style={styles.menuIcon}
     />

     <Text style={styles.menuLabel}>
       {label}
     </Text>

     <Ionicons
       name="chevron-forward"
       size={18}
       color={Colors.textLight}
     />
   </TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 10, paddingBottom: 10,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textWhite },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textWhite,
    marginBottom: 3 },
  userEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.md },
  roleBadge: {
   backgroundColor: 'rgba(255,255,255,0.2)',
   borderColor: 'rgba(255,255,255,0.4)' },
  scroll: { flex: 1,
  padding: Spacing.lg },
  sectionTitle: {
  ...Typography.h4,
  color: Colors.primary,
  marginBottom: Spacing.md },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoLabel: { ...Typography.label },
  infoValue: { ...Typography.body, fontWeight: '500' },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  titleIcon: {
    width: 28,
    textAlign: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  menuIcon: {
    width: 28,
    textAlign: 'center',
    marginRight: 12,
  },
 menuLabel: {
   flex: 1,
   fontSize: 15,
   fontWeight: '600',
   color: Colors.textPrimary,
   textAlignVertical: 'center',
 },
  menuArrow: {
     color: Colors.textLight,
     fontSize: 12 },
  pwdForm: {
    paddingTop: Spacing.md },
    pwdActions: {
    flexDirection: 'row',
    marginTop: Spacing.sm },

  logoutBtn: {
  marginTop: Spacing.md },
});
