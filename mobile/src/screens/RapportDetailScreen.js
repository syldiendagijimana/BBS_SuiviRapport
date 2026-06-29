// src/screens/RapportDetailScreen.js
import React, { useState, useEffect } from 'react';
import {View,Text,StyleSheet,ScrollView,TouchableOpacity,Alert,StatusBar,Modal} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { rapportsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Card, StatutBadge, Button, LoadingScreen } from '../components';
import { Colors, Spacing, Typography } from '../theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Image } from 'react-native';
import ImageViewing from 'react-native-image-viewing';

export default function RapportDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isAdmin, isSuperviseur } = useAuth();
  const [rapport, setRapport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);

useEffect(() => {
  rapportsAPI.get(route.params.id)
    .then(data => {
      console.log('RAPPORT =', JSON.stringify(data, null, 2));

      if (data.photos) {
        data.photos.forEach((p, i) => {
          console.log(`PHOTO ${i} =`, p);
        });
      }

      setRapport(data);
    })
    .catch(e => Alert.alert('Erreur', e.message))
    .finally(() => setLoading(false));
}, [route.params.id]);
  async function handleDelete() {
    Alert.alert('Supprimer', 'Supprimer ce rapport ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try { await rapportsAPI.delete(rapport.id); navigation.goBack(); }
        catch (e) { Alert.alert('Erreur', e.message); }
      }}
    ]);
  }

  if (loading) return <LoadingScreen />;
  if (!rapport) return null;

  const Row = ({ label, value }) => (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || '—'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <View style={styles.header}>
       <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
         <Ionicons name="chevron-back" size={26} color="#fff" />
       </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{rapport.titre}</Text>
        <StatutBadge statut={rapport.statut} />
      </View>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.sectionTitle}>Informations</Text>
          <Row label="Nom" value={`${rapport.prenom || ''} ${rapport.nom || ''}`} />
          <Row label="Matricule" value={rapport.matricule} />
          <Row label="Heure d'intervention" value={new Date(rapport.heure_intervention).toLocaleString('fr-FR')} />
          {rapport.heure_fin && <Row label="Heure de fin" value={new Date(rapport.heure_fin).toLocaleString('fr-FR')} />}
          <Row label="Localisation" value={rapport.localisation} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Description de la panne</Text>
          <Text style={styles.descText}>{rapport.description_panne}</Text>
        </Card>

        {rapport.solution_appliquee && (
          <Card>
            <Text style={styles.sectionTitle}>Solution appliquée</Text>
            <Text style={styles.descText}>{rapport.solution_appliquee}</Text>
          </Card>
        )}

   {rapport.photos?.length > 0 && (
     <Card>
       <Text style={styles.sectionTitle}>
         Photos ({rapport.photos.length})
       </Text>

       <ScrollView horizontal showsHorizontalScrollIndicator={false}>
         {rapport.photos.map((p, i) => {
           const uri =
             typeof p === 'string'
               ? p
               : p?.url || p?.uri || p?.path;

           if (!uri) return null;

           return (
             <TouchableOpacity
               key={i}
               onPress={() => {
                 setImageIndex(i);
                 setPhotoVisible(true);
               }}
             >
               <Image
                 source={{ uri }}
                 style={styles.photo}
               />
             </TouchableOpacity>
           );
         })}
       </ScrollView>

       <ImageViewing
         images={rapport.photos.map(p => ({
           uri: p.url || p.uri || p.path
         }))}
         imageIndex={imageIndex}
         visible={photoVisible}
         onRequestClose={() => setPhotoVisible(false)}
       />
     </Card>
   )}
        {(isAdmin || isSuperviseur) && (
          <View style={styles.actions}>
            <Button title="Modifier" onPress={() => navigation.navigate('RapportForm', { rapport })} variant="outline" style={{ flex: 1 }} />
            <View style={{ width: 12 }} />
            <Button title="Supprimer" onPress={handleDelete} variant="danger" style={{ flex: 1 }} />
          </View>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 30,
    paddingBottom: 16,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
   color: Colors.textWhite,
   fontSize: 24 },
  headerTitle: {
      flex: 1,
      color: Colors.textWhite,
      fontSize: 16, fontWeight: '700' },
      scroll: { flex: 1,
      padding: Spacing.lg },
  sectionTitle: {
    ...Typography.h4,
    marginBottom: Spacing.md,
    color: Colors.primary },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider },
  rowLabel: {
       ...Typography.label, flex: 1 },
      rowValue: {
      ...Typography.body,
      flex: 1, textAlign: 'right' },
  descText: {
    ...Typography.body,
    lineHeight: 22 },
  photosNote: {
   color: Colors.textSecondary,
   fontSize: 13 },
  actions: {
  flexDirection: 'row',
  marginTop: Spacing.lg },
 photo: {
   width: 100,
   height: 100,
   borderRadius: 10,
   marginRight: 10,
   backgroundColor: '#eee',
   resizeMode: 'cover',
 },

 modalContainer: {
   flex: 1,
   backgroundColor: 'rgba(0,0,0,0.95)',
   justifyContent: 'center',
   alignItems: 'center',
 },

 fullPhoto: {
   width: '95%',
   height: '80%',
 },
});
