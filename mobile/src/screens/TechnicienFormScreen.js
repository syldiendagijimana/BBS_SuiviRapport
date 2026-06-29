// src/screens/TechnicienFormScreen.js
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    StatusBar
    } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { techniciensAPI } from '../services/api';
import { Button, Input } from '../components';
import { Colors, Spacing } from '../theme';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function TechnicienFormScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const edit = route.params?.technicien;
  const isEdit = !!edit;

  const [matricule, setMatricule] = useState(edit?.matricule || '');
  const [specialite, setSpecialite] = useState(edit?.specialite || '');
  const [zone, setZone] = useState(edit?.zone_intervention || '');
  const [telephone, setTelephone] = useState(edit?.telephone || '');
  const [loading, setLoading] = useState(false);
  const [nom, setNom] = useState(edit?.nom || '');
  const [prenom, setPrenom] = useState(edit?.prenom || '');
  const [email, setEmail] = useState(edit?.email || '');
  const [password, setPassword] = useState('');
 const [showPassword, setShowPassword] = useState(false);
 // les validation
  async function handleSave() {
    if (
      !nom.trim() ||
      !prenom.trim() ||
      !email.trim() ||
      (!isEdit && !password.trim()) ||
      !matricule.trim()
    ) {
      Alert.alert(
        'Erreur',
        'Nom, prénom, email, mot de passe et matricule sont requis'
      );
      return;
    }
    setLoading(true);
    try {
     const data = {
       nom,
       prenom,
       email,
       password,
       matricule,
       specialite,
       zone_intervention: zone,
       telephone
     };
      if (isEdit) { await techniciensAPI.update(edit.id, data);
      Alert.alert('Succès', 'Technicien modifié'); }
      else { await techniciensAPI.create(data);
      Alert.alert('Succès', 'Technicien créé'); }
      navigation.goBack();
    } catch (e) { Alert.alert('Erreur', e.message); }
    finally { setLoading(false); }
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
            {isEdit ? 'Modifier technicien' : 'Nouveau technicien'}
          </Text>
        </View>

        <View style={{ width: 38 }} />
      </View>
      <ScrollView style={styles.form}>
         <Input
           label="Nom"
           value={nom}
           onChangeText={setNom}
         />

         <Input
           label="Prénom"
           value={prenom}
           onChangeText={setPrenom}
         />
         <Input
           label="Email"
           value={email}
           onChangeText={setEmail}
           placeholder="technicien@bbs.bi"
           keyboardType="email-address"
         />
       <Input
         label="Mot de passe"
         value={password}
         onChangeText={setPassword}
         secureTextEntry={!showPassword}
         rightIcon={
           showPassword
             ? 'eye-off-outline'
             : 'eye-outline'
         }
         onRightIconPress={() =>
           setShowPassword(!showPassword)
         }
       />
        <Input label="Matricule" value={matricule}
        onChangeText={setMatricule} placeholder="001" />
        <Input label="Spécialité" value={specialite}
        onChangeText={setSpecialite} placeholder="Réseau fibre optique" />
        <Input label="Zone d'intervention" value={zone}
        onChangeText={setZone} placeholder="Zone Nord" />
        <Input label="Téléphone" value={telephone}
        onChangeText={setTelephone} placeholder="+257 XX XXX XXX" keyboardType="phone-pad" />

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
  container: {
     flex: 1,
     backgroundColor: Colors.background },
  header: {
      backgroundColor: Colors.primary,
      paddingTop: 20,
      paddingBottom: 16,
      paddingHorizontal: Spacing.lg,
      flexDirection: 'row',
      alignItems: 'center' },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
  color: Colors.textWhite,
  fontSize: 24 },

  headerTitle: {
    color: Colors.textWhite,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  form: { padding: Spacing.xl },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
});
