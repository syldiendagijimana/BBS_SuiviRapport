// src/screens/RapportFormScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, StatusBar, Image, Platform, PermissionsAndroid
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { rapportsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Selector } from '../components';
// Note : techniciensAPI est conservé au cas où l'admin veut voir la liste ailleurs
import { Colors, Spacing, Radius, Typography } from '../theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Geolocation from 'react-native-geolocation-service';

const STATUTS = [
  { label: 'En cours', value: 'en_cours' },
  { label: 'Résolu', value: 'resolu' },
  { label: 'Escaladé', value: 'escalade' },
];

// ─── Permissions ──────────────────────────────────────────────────────────────

async function requestCameraPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Permission caméra',
        message: "BBS Mobile a besoin d'accéder à votre caméra.",
        buttonNeutral: 'Plus tard',
        buttonNegative: 'Refuser',
        buttonPositive: 'Autoriser',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch { return false; }
}

async function requestStoragePermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const permission = Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const granted = await PermissionsAndroid.request(permission, {
      title: 'Permission galerie',
      message: "BBS Mobile a besoin d'accéder à votre galerie.",
      buttonNeutral: 'Plus tard',
      buttonNegative: 'Refuser',
      buttonPositive: 'Autoriser',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch { return false; }
}

async function requestLocationPermission() {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Permission GPS',
        message: "BBS Mobile a besoin d'accéder à votre position GPS.",
        buttonPositive: 'Autoriser',
        buttonNegative: 'Refuser',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch { return false; }
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function RapportFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  // ✅ MODIF 1 : récupérer user depuis AuthContext pour afficher nom/prénom
  const { user, isTechnicien } = useAuth();

  const edit = route.params?.rapport;
  const isEdit = !!edit;

  // ✅ Nom complet de l'utilisateur connecté pour l'afficher dans le header
  const nomConnecte = [user?.prenom, user?.nom].filter(Boolean).join(' ') || 'Utilisateur';
  const roleConnecte = user?.role || '';

  function getNow() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }

  // ── États formulaire ──────────────────────────────────────────────────────
  const [titre,             setTitre]              = useState(edit?.titre || '');
  const [descPanne,         setDescPanne]          = useState(edit?.description_panne || '');
  const [solution,          setSolution]           = useState(edit?.solution_appliquee || '');
  const [heureIntervention, setHeureIntervention]  = useState(edit?.heure_intervention || getNow());
  const [localisation,      setLocalisation]       = useState(edit?.localisation || '');
  const [statut,            setStatut]             = useState(edit?.statut || 'en_cours');
  const [photos,            setPhotos]             = useState([]);
  const [loading,           setLoading]            = useState(false);


  // ── Résoudre l'id technicien de l'utilisateur connecté ───────────────────
  // C'est TOUJOURS l'utilisateur connecté qui est l'auteur du rapport.
  // On cherche son profil dans la table techniciens pour obtenir son technicien_id.


  function refreshTime() {
    setHeureIntervention(getNow());
    Alert.alert('⏱️ Heure mise à jour', `Heure actuelle : ${getNow().replace('T', ' ')}`);
  }

  async function getCurrentLocation() {
    const granted = await requestLocationPermission();
    if (!granted) {
      Alert.alert('Permission refusée', "Autorisez l'accès à la localisation.");
      return;
    }
    Geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
            { headers: { 'Accept': 'application/json', 'User-Agent': 'BBS-Mobile/1.0' } }
          );
          if (!response.ok) {
            setLocalisation(`${latitude}, ${longitude}`);
            Alert.alert('Adresse indisponible', 'Coordonnées GPS enregistrées.');
            return;
          }
          const data = await response.json();
          if (data?.display_name) {
            const route2   = data.address.road || '';
            const quartier = data.address.suburb || data.address.neighbourhood || data.address.village || '';
            const ville    = data.address.city || data.address.town || data.address.municipality || '';
            const pays     = data.address.country || '';
            setLocalisation(
              `${route2}, ${quartier}, ${ville}, ${pays}\nGPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
            );
            Alert.alert('Localisation trouvée', data.display_name);
          } else {
            setLocalisation(`${latitude}, ${longitude}`);
            Alert.alert('Adresse introuvable', 'Coordonnées GPS récupérées.');
          }
        } catch (error) {
          setLocalisation(`${latitude}, ${longitude}`);
          Alert.alert('Erreur réseau', 'Coordonnées GPS enregistrées.');
        }
      },
      error => Alert.alert('Erreur GPS', error.message),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000,
        forceRequestLocation: true, showLocationDialog: true }
    );
  }

  async function pickFromGallery() {
    const ok = await requestStoragePermission();
    if (!ok) { Alert.alert('Permission refusée', "Autorisez la galerie."); return; }
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo', selectionLimit: 5 - photos.length, quality: 0.7,
      });
      if (!result.didCancel && result.assets) {
        setPhotos(prev => [...prev, ...result.assets].slice(0, 5));
      }
    } catch { Alert.alert('Erreur', "Impossible d'accéder à la galerie."); }
  }

  async function pickFromCamera() {
    const okCam = await requestCameraPermission();
    if (!okCam) { Alert.alert('Permission refusée', "Autorisez la caméra."); return; }
    if (Platform.OS === 'android' && Platform.Version < 33) await requestStoragePermission();
    try {
      const result = await launchCamera({ mediaType: 'photo', quality: 0.7, saveToPhotos: true });
      if (!result.didCancel && result.assets) {
        setPhotos(prev => [...prev, ...result.assets].slice(0, 5));
      }
    } catch { Alert.alert('Erreur', "Impossible d'ouvrir la caméra."); }
  }

 async function handleSave() {
   if (!titre.trim() || !descPanne.trim()) {
     Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
     return;
   }

   setLoading(true);

   try {
     const formData = new FormData();
     formData.append('titre', titre);
     formData.append('description_panne', descPanne);
     formData.append('solution_appliquee', solution);
     formData.append('heure_intervention', heureIntervention);
     formData.append('localisation', localisation);
     formData.append('statut', statut);

     photos.forEach((p, index) => {
       formData.append('photos', {
         uri: p.uri,
         type: p.type || 'image/jpeg',
         name: p.fileName || `photo_${index}.jpg`,
       });
     });

     // 🔥 appel API
     if (isEdit) {
       await rapportsAPI.update(edit.id, formData);
       Alert.alert('Succès', 'Rapport modifié');
     } else {
       await rapportsAPI.create(formData);
       Alert.alert('Succès', 'Rapport créé');
     }

     navigation.goBack();

   } catch (e) {
     console.log('ERREUR SAVE:', e);
     Alert.alert('Erreur serveur', e.message || 'Erreur inconnue');
   } finally {
     setLoading(false);
   }
 }
  // ─── Rendu ────────────────────────────────────────────────────────────────

  const ROLE_LABELS = {
    admin: 'Administrateur', superviseur: 'Superviseur',
    technicien: 'Technicien', utilisateur: 'Utilisateur',
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />

      {/* ── Header avec nom/prénom de l'utilisateur connecté ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={Colors.textWhite} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {isEdit ? 'Modifier rapport' : 'Nouveau rapport'}
          </Text>
          {/* ✅ MODIF 3 : afficher nom + prénom + rôle du connecté sous le titre */}
          <View style={styles.headerUserRow}>
            <Ionicons name="person-circle-outline" size={13} color="rgba(255,255,255,0.8)" />
            <Text style={styles.headerUserName}>
              {nomConnecte}
            </Text>
            {!!roleConnecte && (
              <View style={styles.headerRoleBadge}>
                <Text style={styles.headerRoleTxt}>
                  {ROLE_LABELS[roleConnecte] || roleConnecte}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>

        {/* ── Informations générales ── */}
        <Text style={styles.sectionLabel}>Informations générales</Text>

        <Input
          label="Titre du rapport"
          value={titre}
          onChangeText={setTitre}
          placeholder="Ex: Panne fibre Zone Nord"
        />

        {/* Heure */}
        <Text style={styles.fieldLabel}>Heure d'intervention</Text>
        <View style={styles.timeRow}>
          <Input
            value={heureIntervention}
            onChangeText={setHeureIntervention}
            placeholder="YYYY-MM-DDTHH:MM"
            style={styles.timeInput}
            containerStyle={{ flex: 1, marginBottom: 0 }}
          />
          <TouchableOpacity style={styles.timeRefreshBtn} onPress={refreshTime}>
            <Text style={styles.timeRefreshIcon}>⏱️</Text>
            <Text style={styles.timeRefreshLabel}>Maintenant</Text>
          </TouchableOpacity>
        </View>

        {/* Localisation */}
        <Text style={styles.fieldLabel}>Localisation</Text>
        <View style={styles.locationRow}>
          <Input
            value={localisation}
            onChangeText={setLocalisation}
            placeholder="Adresse ou coordonnées GPS"
            multiline
            numberOfLines={4}
            style={{ minHeight: 90, textAlignVertical: 'top' }}
            containerStyle={{ flex: 1, marginBottom: 0 }}
          />
          <TouchableOpacity style={styles.gpsBtn} onPress={getCurrentLocation}>
            <Ionicons name="locate" size={22} color={Colors.textWhite} />
          </TouchableOpacity>
        </View>

        {/* ✅ MODIF 4 : Selector technicien toujours visible
            - si isTechnicien → pré-sélectionné + désactivé (lecture seule)
            - si admin/superviseur → liste complète sélectionnable */}


        <View style={styles.techReadOnly}>
          <Text style={styles.techReadOnlyLabel}>
            Utilisateur connecté
          </Text>

          <View style={styles.techReadOnlyBox}>
            <Ionicons
              name="person-circle"
              size={20}
              color={Colors.primary}
            />

            <Text style={styles.techReadOnlyNom}>
              {nomConnecte}
            </Text>
          </View>
        </View>
        {/* ── Détails intervention ── */}
        <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>
          Détails de l'intervention
        </Text>

        <Input
          label="Description de la panne"
          value={descPanne}
          onChangeText={setDescPanne}
          placeholder="Décrivez la nature de la panne..."
          multiline
          numberOfLines={4}
          style={{ height: 100, textAlignVertical: 'top' }}
        />
        <Input
          label="Solution appliquée"
          value={solution}
          onChangeText={setSolution}
          placeholder="Décrivez la solution mise en place..."
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: 'top' }}
        />

        <Selector label="Statut" value={statut} options={STATUTS} onChange={setStatut} />

        {/* ── Photos ── */}
        {!isEdit && (
          <>
            <Text style={styles.sectionLabel}>Photos d'incidents</Text>
            <View style={styles.photoBtnsRow}>
              <TouchableOpacity style={[styles.photoSourceBtn, styles.cameraBtn]} onPress={pickFromCamera}>
                <Ionicons name="camera-outline" size={24} color={Colors.primary} />
                <Text style={styles.photoSourceLabel}>Caméra</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoSourceBtn, styles.galleryBtn]} onPress={pickFromGallery}>
                <Ionicons name="images-outline" size={24} color={Colors.textSecondary} />
                <Text style={styles.photoSourceLabel}>Galerie</Text>
              </TouchableOpacity>
            </View>
            {photos.length > 0 && (
              <>
                <Text style={styles.photoCount}>
                  {String(photos.length)}/5 photo(s) sélectionnée(s)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                  {photos.map((p, i) => (
                    <View key={i} style={styles.photoThumb}>
                      <Image source={{ uri: p.uri }} style={styles.photoImg} />
                      <TouchableOpacity
                        style={styles.removePhoto}
                        onPress={() => setPhotos(photos.filter((_, j) => j !== i))}
                      >
                        <Text style={{ color: Colors.textWhite, fontSize: 12 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}

        <Button
          title={loading ? 'Enregistrement...' : (isEdit ? 'Modifier' : 'Créer le rapport')}
          onPress={handleSave}
          loading={loading}
          size="lg"
          style={{ marginTop: Spacing.xl }}
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

  // ── Header ──
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerCenter: { flex: 1 },
  headerTitle: {
  color: Colors.textWhite,
  fontSize: 18,
  fontWeight: '700' },

  // ✅ Nom + rôle du connecté dans le header
  headerUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  headerUserName: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  headerRoleBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  headerRoleTxt: {
      color: 'rgba(255,255,255,0.95)',
      fontSize: 10,
      fontWeight: '700' },

  form: {
     padding: Spacing.xl },
  sectionLabel: {
    ...Typography.label,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
  },
  fieldLabel: {
     ...Typography.label,
     color: Colors.textSecondary,
     marginBottom: 6 },

  // Heure
  timeRow: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: 8,
     marginBottom: Spacing.md },
  timeInput: { flex: 1 },
  timeRefreshBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: Radius.md,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    minWidth: 72,
  },
  timeRefreshIcon: {
     fontSize: 18 },
    timeRefreshLabel: {
    fontSize: 9,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 2 },

  // Localisation
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
  },
  gpsBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ✅ Technicien lecture seule (quand isTechnicien)
  techReadOnly: {
     marginBottom: Spacing.md },
     techReadOnlyLabel: {
     ...Typography.label,
     color: Colors.textSecondary,
     marginBottom: 6 },
  techReadOnlyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primary + '10',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary + '30',
  },
  techReadOnlyNom: {
     flex: 1,
     fontSize: 14,
     fontWeight: '700',
     color: Colors.primary },
  techBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  techBadgeTxt: {
     color: '#FFF',
     fontSize: 10,
     fontWeight: '800' },

  // Photos
  photoBtnsRow: {
     flexDirection: 'row',
     gap: 10,
     marginBottom: Spacing.md },
  photoSourceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    paddingVertical: 14,
    gap: 8,
    borderWidth: 1.5,
  },
  cameraBtn: {
  backgroundColor: Colors.primary + '12',
  borderColor: Colors.primary + '60' },
  galleryBtn: {
  backgroundColor: Colors.surface,
     borderColor: Colors.border,
     borderStyle: 'dashed' },
  photoSourceLabel: {
     color: Colors.textSecondary,
     fontSize: 14, fontWeight: '600' },
  photoCount: {
     color: Colors.textMuted,
     fontSize: 12,
     marginBottom: 8 },
  photoScroll: {
     marginBottom: Spacing.lg },
  photoThumb: {
     width: 80,
     height: 80,
     borderRadius: 10,
     marginRight: 8,
     position: 'relative' },
  photoImg: {
     width: 80,
     height: 80,
     borderRadius: 10 },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});