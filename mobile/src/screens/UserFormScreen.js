// src/screens/UserFormScreen.js
import React, { useState } from 'react';
import {
   View,
   Text,
   StyleSheet,
   ScrollView,
   TouchableOpacity,
   Alert, StatusBar
   } from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import { usersAPI } from '../services/api';
import { Button, Input, Selector } from '../components';
import { Colors, Spacing, Typography } from '../theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const ROLES = [
  { label: 'Admin', value: 'admin' },
  { label: 'Superviseur', value: 'superviseur' },
  { label: 'Technicien', value: 'technicien' },
];

export default function UserFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const editUser = route.params?.user;
  const isEdit = !!editUser;

  const [nom, setNom] = useState(editUser?.nom || '');
  const [prenom, setPrenom] = useState(editUser?.prenom || '');
  const [email, setEmail] = useState(editUser?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(editUser?.role || 'technicien');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  function validate() {
    const e = {};
    if (!nom.trim()) e.nom = 'Nom requis';
    if (!prenom.trim()) e.prenom = 'Prénom requis';
    if (!email.trim()) e.email = 'Email requis';
    if (!isEdit && !password.trim()) {
      e.password = 'Mot de passe requis';
    } else if (password && password.length < 4) {
      e.password = 'Le mot de passe doit contenir au moins 4 caractères';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setLoading(true);
    try {
      const data = { nom, prenom, email, role };
      if (password) data.password = password;

      if (isEdit) {
        await usersAPI.update(editUser.id, data);
        Alert.alert('Succès', 'Utilisateur modifié avec succès');
      } else {
        await usersAPI.create(data);
        Alert.alert('Succès', 'Utilisateur créé avec succès');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color="#fff"
          />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>
            {isEdit
              ? 'Modifier utilisateur'
              : 'Nouvel utilisateur'}
          </Text>
        </View>

        <View style={{ width: 38 }} />
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <Input label="Prénom" value={prenom}
        onChangeText={setPrenom} placeholder="Jean" error={errors.prenom} />
        <Input label="Nom" value={nom}
        onChangeText={setNom} placeholder="Dupont" error={errors.nom} />
        <Input label="Email" value={email}
        onChangeText={setEmail} placeholder="jean.dupont@bbs.com"
          keyboardType="email-address" autoCapitalize="none" error={errors.email} />
        <Input
         label={
           isEdit
             ? "Nouveau mot de passe (laisser vide pour garder)"
             : "Mot de passe (4 caractères minimum)"
         }
          value={password}
          onChangeText={setPassword}
         placeholder={
           isEdit
             ? "(inchangé)"
             : "Min. 4 caractères"
         }
          secureTextEntry={!showPassword}
          rightIcon={
            showPassword
              ? 'eye-off-outline'
              : 'eye-outline'
          }
          onRightIconPress={() =>
            setShowPassword(!showPassword)
          }
          error={errors.password}
        />

        <Selector label="Rôle" value={role} options={ROLES} onChange={setRole} />

        <Button title={loading ? 'Enregistrement...' : (isEdit ? 'Modifier' : 'Créer')}
          onPress={handleSave} loading={loading} size="lg" style={{ marginTop: Spacing.xl }} />
        <Button title="Annuler"
        onPress={() => navigation.goBack()} variant="ghost" size="lg"
          style={{ marginTop: Spacing.md, marginBottom: 40 }} />
      </ScrollView>
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

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  headerTitle: {
    color: Colors.textWhite,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  backIcon: { color: Colors.textWhite, fontSize: 24 },
  form: { padding: Spacing.xl },
});
