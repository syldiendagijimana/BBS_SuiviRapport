// src/screens/IncidentFormScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { incidentsAPI } from '../services/api';
import { Button, Input, Selector } from '../components';
import { Colors, Spacing } from '../theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

const PRIORITES = [
  { label: 'Basse', value: 'basse' },
  { label: 'Normale', value: 'normale' },
  { label: 'Haute', value: 'haute' },
  { label: 'Critique', value: 'critique' },
];
const STATUTS = [
  { label: 'Ouvert', value: 'ouvert' },
  { label: 'En cours', value: 'en_cours' },
  { label: 'Résolu', value: 'resolu' },
  { label: 'Fermé', value: 'ferme' },
];

export default function IncidentFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const edit = route.params?.incident;
  const isEdit = !!edit;

  const [titre, setTitre] = useState(edit?.titre || '');
  const [description, setDescription] = useState(edit?.description || '');
  const [priorite, setPriorite] = useState(edit?.priorite || 'normale');
  const [statut, setStatut] = useState(edit?.statut || 'ouvert');
  const [zone, setZone] = useState(edit?.zone || '');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!titre.trim() || !description.trim()) {
      Alert.alert('Erreur', 'Titre et description requis');
      return;
    }
    setLoading(true);
    try {
      const data = { titre, description, priorite, statut, zone };
      if (isEdit) {
        await incidentsAPI.update(edit.id, data);
        Alert.alert('Succès', 'Incident mis à jour');
      } else {
        await incidentsAPI.create(data);
        Alert.alert('Succès', 'Incident signalé');
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
            name="arrow-back"
            size={22}
            color="#fff"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {isEdit ? 'Modifier incident' : 'Signaler un incident'}
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
        <Input
          label="Titre de l'incident"
          value={titre}
          onChangeText={setTitre}
          placeholder="Ex: Coupure fibre Zone Est"
        />

        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez l'incident..."
          multiline
          numberOfLines={4}
          style={{
            height: 120,
            textAlignVertical: 'top',
          }}
        />

        <Input
          label="Zone concernée"
          value={zone}
          onChangeText={setZone}
          placeholder="Ex: Zone Nord"
        />
  <Selector
    label="Priorité"
    value={priorite}
    options={PRIORITES}
    onChange={setPriorite}
  />

  <Selector
    label="Statut"
    value={statut}
    options={STATUTS}
    onChange={setStatut}
  />
        <Button
          title={loading
            ? 'Enregistrement...'
            : (isEdit ? 'Mettre à jour' : 'Signaler')}
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={{
            marginTop: 24,
            borderRadius: 12,
          }}
        />
        <Button
          title="Annuler"
          onPress={() => navigation.goBack()}
          variant="ghost"
          size="lg"
          style={{ marginTop: Spacing.md, marginBottom: 40 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
 header: {
   backgroundColor: Colors.primary,
   paddingTop: 50,
   paddingBottom: 16,
   paddingHorizontal: Spacing.lg,
   flexDirection: 'row',
   alignItems: 'center',
 },
 backBtn: {
   width: 40,
   height: 40,
   borderRadius: 20,
   backgroundColor: 'rgba(255,255,255,0.15)',
   justifyContent: 'center',
   alignItems: 'center',
 },

 headerTitle: {
   flex: 1,
   textAlign: 'center',
   color: Colors.textWhite,
   fontSize: 18,
   fontWeight: '700',
 },
  backIcon: {
     color: Colors.textWhite,
     fontSize: 24 },

  form: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
  },
});
