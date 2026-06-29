// src/screens/MessagesScreen.js
// ─────────────────────────────────────────────────────────────────────────────
// BBS Groupe Officiel — style WhatsApp Android
// REST API + polling 3 s · Aucun Socket.IO · Aucune dépendance supplémentaire
// Compatible React Native 0.73+  •  backend : routes/messages.js fourni
// ─────────────────────────────────────────────────────────────────────────────

import React, {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput,
  TouchableOpacity, TouchableWithoutFeedback,
  StatusBar, Image, Alert, Platform, Keyboard,
  KeyboardAvoidingView, SafeAreaView, ActivityIndicator,
  Modal, ScrollView, Pressable, Dimensions, Clipboard,
  PermissionsAndroid,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';


// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get('window');

const WA = {
  headerBg:     '#075E54',
  headerDark:   '#054C44',
  bubbleMoi:    '#DCF8C6',
  bubbleAutre:  '#FFFFFF',
  fond:         '#ECE5DD',
  inputBg:      '#FFFFFF',
  sendBtn:      '#128C7E',
  online:       '#4CAF50',
  textMain:     '#111827',
  textSub:      '#6B7280',
  textMuted:    '#9CA3AF',
  heure:        '#8696A0',
  cocheLu:      '#34B7F1',
  cocheGris:    '#8696A0',
  danger:       '#EF4444',
  replyBg:      'rgba(0,0,0,0.06)',
  menuBg:       '#1F2937',
  menuTxt:      '#F9FAFB',
  searchBg:     '#FFFFFF',
};

const ROLE_COULEURS = {
  admin:       '#B91C1C',
  superviseur: '#1D4ED8',
  technicien:  '#7C3AED',
  utilisateur: '#065F46',
};

const EMOJIS_REACTION = ['❤️', '😂', '😮', '👍', '🔥', '😢'];

const BASE_URL = Platform.OS === 'android'
  ? 'http://10.139.38.120:3000'
  : 'http://localhost:3000';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function roleColor(r) { return ROLE_COULEURS[(r||'').toLowerCase()] || '#555'; }

function nomComplet(nom, prenom) {
  return [prenom, nom].filter(Boolean).join(' ') || 'Inconnu';
}

function initiales(nom, prenom) {
  const p = (prenom||'')[0] || '';
  const n = (nom   ||'')[0] || '';
  return (p + n).toUpperCase() || '?';
}

function hhmm(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function labelDate(dateStr) {
  if (!dateStr) return '';
  const d   = new Date(dateStr);
  const now = new Date();
  const h   = new Date(now); h.setDate(now.getDate()-1);
  if (d.toDateString() === now.toDateString()) return "AUJOURD'HUI";
  if (d.toDateString() === h.toDateString())   return 'HIER';
  return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'});
}

function photoUrl(chemin) {
  if (!chemin) return null;
  if (chemin.startsWith('http')) return chemin;
  return `${BASE_URL}/${chemin}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// API LAYER
// ─────────────────────────────────────────────────────────────────────────────

const msgApi = {
  // GET ALL
  getAll: async () => {
    const r = await api.get('/messages');

    console.log("GET /messages =", r);

    return Array.isArray(r?.messages)
      ? r.messages
      : [];
  },

  // SEND
  send: async (message) => {
    const r = await api.post('/messages', { message });

    return r?.message || r;
  },

  // EDIT
  edit: async (id, msg) => {
    return await api.put(`/messages/${id}`, {
      message: msg,
    });
  },

  // DELETE
  del: async (id) => {
    return await api.delete(`/messages/${id}`);
  },

  // SEEN
  seen: async (id) => {
    return await api.post(`/messages/seen/${id}`);
  },

  // REACTION
  react: async (id, emoji) => {
    return await api.post(`/messages/reaction/${id}`, {
      reaction: emoji,
    });
  },

  // MEDIA
  sendMedia: async (formData) => {
    const r = await api.post('/messages/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return r?.message || r;
  },
};
// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS ANDROID
// ─────────────────────────────────────────────────────────────────────────────

async function permGalerie() {
  if (Platform.OS !== 'android') return true;
  const p = Platform.Version >= 33
    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const r = await PermissionsAndroid.request(p, {
    title: 'Accès galerie', message: 'Autoriser l\'accès aux photos ?',
    buttonPositive: 'Autoriser', buttonNegative: 'Refuser',
  });
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

async function permCamera() {
  if (Platform.OS !== 'android') return true;
  const r = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    { title: 'Caméra', message: 'Autoriser la caméra ?', buttonPositive: 'Autoriser', buttonNegative: 'Refuser' }
  );
  return r === PermissionsAndroid.RESULTS.GRANTED;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT : Avatar
// ─────────────────────────────────────────────────────────────────────────────

const Avatar = memo(function Avatar({ nom, prenom, role, photo, size = 38 }) {
  const uri = photo ? photoUrl(photo) : null;
  const c   = roleColor(role);
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size/2, backgroundColor: c }}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size/2, backgroundColor: c,
                   alignItems:'center', justifyContent:'center' }}>
      <Text style={{ color:'#FFF', fontWeight:'800', fontSize: size*0.36 }}>
        {initiales(nom, prenom)}
      </Text>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT : Indicateur de statut (✓ ✓✓ ✓✓bleu)
// ─────────────────────────────────────────────────────────────────────────────

function Coches({ status }) {
  if (status === 'seen')      return <Text style={{ color: WA.cocheLu,  fontSize: 13 }}>✓✓</Text>;
  if (status === 'delivered') return <Text style={{ color: WA.cocheGris, fontSize: 13 }}>✓✓</Text>;
  return <Text style={{ color: WA.cocheGris, fontSize: 13 }}>✓</Text>;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT : Séparateur de date
// ─────────────────────────────────────────────────────────────────────────────

const DateSep = memo(function DateSep({ label }) {
  return (
    <View style={s.dateSepWrap}>
      <View style={s.dateSepBulle}>
        <Text style={s.dateSepTxt}>{label}</Text>
      </View>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT : Bulle Reply (citation)
// ─────────────────────────────────────────────────────────────────────────────

const BulleReply = memo(function BulleReply({ msg, estMoi }) {
  if (!msg) return null;
  const auteur = nomComplet(msg.nom, msg.prenom);
  const c      = roleColor(msg.role);
  return (
    <View style={[s.replyBox, { borderLeftColor: c }]}>
      <Text style={[s.replyAuteur, { color: c }]}>{auteur}</Text>
      <Text style={s.replyTxt} numberOfLines={1}>
        {msg.type !== 'text' ? `📎 ${msg.type}` : (msg.message || '')}
      </Text>
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT : Media inline (image/video)
// ─────────────────────────────────────────────────────────────────────────────

const MediaInline = memo(function MediaInline({ media, onPress }) {
  if (!media || media.length === 0) return null;
  return (
    <View style={s.mediaGrid}>
      {media.map((m, i) => {
        const uri = m.url || (m.chemin ? photoUrl(m.chemin) : null);
        if (!uri) return null;
        if (m.type === 'image') {
          return (
            <TouchableOpacity key={i} onPress={() => onPress(uri)}>
              <Image source={{ uri }} style={s.mediaImg} resizeMode="cover" />
            </TouchableOpacity>
          );
        }
        if (m.type === 'video') {
          return (
            <TouchableOpacity key={i} style={s.mediaVideo} onPress={() => onPress(uri)}>
              <Text style={s.mediaVideoIcon}>▶</Text>
            </TouchableOpacity>
          );
        }
         if (m.type === 'audio') {
           return (
             <TouchableOpacity key={i} onPress={() => playAudio(uri)}>
               <View style={{ padding: 10, backgroundColor: '#000', borderRadius: 8 }}>
                 <Text style={{ color: '#fff' }}>▶️ Audio</Text>
               </View>
             </TouchableOpacity>
           );
         }
        return null;
      })}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT : Réactions affichées sous la bulle
// ─────────────────────────────────────────────────────────────────────────────

const Reactions = memo(function Reactions({ reactions }) {
  if (!reactions || reactions.length === 0) return null;
  const counts = {};
  reactions.forEach(r => { counts[r.reaction] = (counts[r.reaction] || 0) + 1; });
  return (
    <View style={s.reactionsRow}>
      {Object.entries(counts).map(([emoji, n]) => (
        <View key={emoji} style={s.reactionChip}>
          <Text style={s.reactionEmoji}>{emoji}</Text>
          {n > 1 && <Text style={s.reactionCount}>{String(n)}</Text>}
        </View>
      ))}
    </View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT : Bulle de message complète
// ─────────────────────────────────────────────────────────────────────────────

const BulleMessage = memo(function BulleMessage({
  item, estMoi, afficherEntete, replyMsg,
  onLongPress, onSwipe, onMediaPress,
}) {
  const { msg } = item;
  const nom    = msg.nom;
  const prenom = msg.prenom;
  const role   = msg.role;
  const h      = hhmm(msg.created_at);
  const status = msg.status?.[0]?.status || (msg.is_seen ? 'seen' : 'sent');

  return (
    <Pressable
      onLongPress={() => onLongPress(msg)}
      delayLongPress={350}
    >
      <View style={[s.ligneMsg, estMoi ? s.ligneMsgD : s.ligneMsgG]}>

        {/* Avatar gauche */}
        {!estMoi && (
          <View style={s.avatarCol}>
            {afficherEntete
              ? <Avatar nom={nom} prenom={prenom} role={role} photo={null} size={32} />
              : <View style={{ width: 32 }} />}
          </View>
        )}

        <View style={[s.bulleContenu, estMoi ? s.bulleContenuD : s.bulleContenuG]}>

          {/* Nom + rôle (reçu, premier de la série) */}
          {!estMoi && afficherEntete && (
            <Text style={[s.bulleNom, { color: roleColor(role) }]}>
              {nomComplet(nom, prenom)}
            </Text>
          )}

          {/* Citation reply */}
          <BulleReply msg={replyMsg} estMoi={estMoi} />

          {/* Bulle */}
          <View style={[s.bulle, estMoi ? s.bulleMoi : s.bulleAutre]}>

            {/* Médias */}
            <MediaInline media={msg.media} onPress={onMediaPress} />

            {/* Texte */}
            {!!msg.message && (
              <Text style={s.bulleTxt}>
                {String(msg.message)}
                {!!msg.is_edited && (
                  <Text style={s.modifieTxt}>{' (modifié)'}</Text>
                )}
              </Text>
            )}

            {/* Pied : heure + coches */}
            <View style={s.bullePied}>
              <Text style={s.bulleHeure}>{h}</Text>
              {estMoi && <Coches status={status} />}
            </View>
          </View>

          {/* Réactions */}
          <Reactions reactions={msg.reactions} />
        </View>

        {/* Avatar droite */}
        {estMoi && (
          <View style={s.avatarCol}>
            {afficherEntete
              ? <Avatar nom={nom} prenom={prenom} role={role} photo={null} size={32} />
              : <View style={{ width: 32 }} />}
          </View>
        )}
      </View>
    </Pressable>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT : Modal image plein écran
// ─────────────────────────────────────────────────────────────────────────────

function ModalImage({ uri, visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.imgModalBg}>
          {!!uri && (
            <Image source={{ uri }} style={s.imgModalFull} resizeMode="contain" />
          )}
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT : Modal menu long press
// ─────────────────────────────────────────────────────────────────────────────

function MenuModal({ visible, msg, monId, onClose, onReact, onReply, onEdit, onDelete, onCopy }) {
  if (!visible || !msg) return null;
  const estMoi = String(msg.sender_id) === String(monId);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.menuOverlay}>
          <TouchableWithoutFeedback>
            <View style={s.menuCard}>

              {/* Réactions rapides */}
              <View style={s.menuReactions}>
                {EMOJIS_REACTION.map(e => (
                  <TouchableOpacity key={e} style={s.menuReactionBtn}
                    onPress={() => { onReact(msg.id, e); onClose(); }}>
                    <Text style={s.menuReactionEmoji}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={s.menuSep} />

              {/* Actions */}
              <MenuItem icon="return-up-back-outline" label="Répondre"  onPress={() => { onReply(msg);  onClose(); }} />
              <MenuItem icon="copy-outline" label="Copier"      onPress={() => { onCopy(msg);   onClose(); }} />
              {estMoi && <MenuItem icon="create-outline" label="Modifier"  onPress={() => { onEdit(msg);   onClose(); }} />}
              {estMoi && (
                <MenuItem icon="trash-outline" label="Supprimer"  danger
                  onPress={() => { onDelete(msg.id); onClose(); }} />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function MenuItem({ icon, label, danger, onPress }) {
  return (
    <TouchableOpacity style={s.menuItem} onPress={onPress}>
      <Ionicons
        name={icon}
        size={22}
        color={danger ? WA.danger : WA.textMain}
        style={{ width: 28 }}
      />

      <Text
        style={[
          s.menuItemTxt,
          danger && { color: WA.danger }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT : Barre de recherche
// ─────────────────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange, onClose }) {
  return (
    <View style={s.searchBar}>
      <TextInput
        style={s.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder="Rechercher dans la conversation…"
        placeholderTextColor={WA.textMuted}
        autoFocus
        returnKeyType="search"
      />
      <TouchableOpacity onPress={onClose} style={s.searchClose}>
        <Ionicons name="close" size={26} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT : Barre de reply (au-dessus de l'input)
// ─────────────────────────────────────────────────────────────────────────────

function ReplyBar({ msg, onCancel }) {
  if (!msg) return null;
  return (
    <View style={s.replyBar}>
      <View style={s.replyBarContent}>
        <Text style={s.replyBarNom}>{nomComplet(msg.nom, msg.prenom)}</Text>
        <Text style={s.replyBarTxt} numberOfLines={1}>
          {msg.type !== 'text' ? `📎 ${msg.type}` : (msg.message || '')}
        </Text>
      </View>
      <TouchableOpacity onPress={onCancel} style={s.replyBarClose}>
        <Text style={{ fontSize: 18, color: WA.textMuted }}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉCRAN PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export default function MessagesScreen() {
  const navigation = useNavigation();
  const { user }   = useAuth();
  const monId      = user?.id ? String(user.id) : null;

  // ── États principaux ───────────────────────────────────────────────────────
  const [messages,     setMessages]     = useState([]);
  const [texte,        setTexte]        = useState('');
  const [chargement,   setChargement]   = useState(true);
  const [envoi,        setEnvoi]        = useState(false);

  // ── États UI ───────────────────────────────────────────────────────────────
  const [replyMsg,     setReplyMsg]     = useState(null);   // message cité
  const [editMsg,      setEditMsg]      = useState(null);   // message en édition
  const [menuMsg,      setMenuMsg]      = useState(null);   // message pour menu
  const [menuVisible,  setMenuVisible]  = useState(false);
  const [imgUri,       setImgUri]       = useState(null);   // image plein écran
  const [imgVisible,   setImgVisible]   = useState(false);
  const [recherche,    setRecherche]    = useState('');
  const [rechercheOn,  setRechercheOn]  = useState(false);
  const [membresVis,   setMembresVis]   = useState(false);

  const flatRef    = useRef(null);
  const pollingRef = useRef(null);
  const monté      = useRef(true);
  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;

  const [recording, setRecording] = useState(false);
  const [audioPath, setAudioPath] = useState(null);




  const startRecording = async () => {
    try {
      const path = Platform.select({
        ios: 'audio.m4a',
        android: `${Date.now()}.mp4`,
      });

      const uri = await audioRecorderPlayer.startRecorder(path);
      audioRecorderPlayer.addRecordBackListener(() => {
        return;
      });

      setRecording(true);
      setAudioPath(uri);
    } catch (e) {
      console.log('startRecording error', e);
    }
  };


   const stopRecording = async () => {
     try {
       const result = await audioRecorderPlayer.stopRecorder();
       audioRecorderPlayer.removeRecordBackListener();

       setRecording(false);

       // ici tu envoies audio comme message
       await envoyerAudio(result);
     } catch (e) {
       console.log('stopRecording error', e);
     }
   };


   const envoyerAudio = async (uri) => {
     const fd = new FormData();

     fd.append('file', {
       uri,
       type: 'audio/mp4',
       name: `audio_${Date.now()}.mp4`,
     });

     fd.append('type', 'audio');

     try {
       const nouveau = await msgApi.sendMedia(fd);
       setMessages(prev => [...prev, nouveau]);

       setTimeout(() => {
         flatRef.current?.scrollToEnd({ animated: true });
       }, 100);
     } catch (e) {
       Alert.alert('Erreur', 'Audio non envoyé');
     }
   };
  // ─────────────────────────────────────────────────────────────────────────
  // CHARGEMENT MESSAGES
  // ─────────────────────────────────────────────────────────────────────────

   const charger = useCallback(async (silencieux = false) => {
     try {
       const data = await msgApi.getAll();

       console.log("MESSAGES RECUS =", data);

       if (!monté.current) return;

       setMessages(Array.isArray(data) ? data : []);
     } catch (e) {
       console.error("[MessagesScreen] charger:", e.message);
     } finally {
       if (!silencieux && monté.current) {
         setChargement(false);
       }
     }
   }, []);

  useEffect(() => {
    monté.current = true;
    charger(false).then(() => {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 100);
    });
    pollingRef.current = setInterval(() => charger(true), 3000);
    return () => {
      monté.current = false;
      clearInterval(pollingRef.current);
    };
  }, [charger]);

  // ─────────────────────────────────────────────────────────────────────────
  // ENVOI MESSAGE TEXTE
  // ─────────────────────────────────────────────────────────────────────────

  const handleEnvoyer = useCallback(async () => {
    const t = texte.trim();
    if (!t || envoi) return;

    // Mode édition
    if (editMsg) {
      setTexte('');
      setEditMsg(null);
      try {
        await msgApi.edit(editMsg.id, t);
        await charger(true);
      } catch (e) {
        Alert.alert('Erreur', 'Impossible de modifier le message.');
      }
      return;
    }

    setTexte('');
    setReplyMsg(null);
    setEnvoi(true);

    // Ajout optimiste
    const opt = {
      id:         `opt_${Date.now()}`,
      sender_id:  monId,
      message:    t,
      type:       'text',
      is_seen:    0,
      is_edited:  0,
      created_at: new Date().toISOString(),
      nom:        user?.nom    || '',
      prenom:     user?.prenom || '',
      role:       user?.role   || 'utilisateur',
      media:      [],
      reactions:  [],
      status:     [],
      _opt:       true,
    };
    setMessages(prev => [...prev, opt]);
    setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 60);

    try {
      const nouveau = await msgApi.send(t);
      if (monté.current) {
        setMessages(prev => prev.map(m => m.id === opt.id ? nouveau : m));
      }
    } catch (e) {
      setMessages(prev => prev.filter(m => m.id !== opt.id));
      setTexte(t);
      Alert.alert('Erreur', 'Impossible d\'envoyer le message.');
    } finally {
      if (monté.current) setEnvoi(false);
    }
  }, [texte, envoi, editMsg, monId, user, charger]);

  // ─────────────────────────────────────────────────────────────────────────
  // ENVOI MÉDIA (photo/vidéo)
  // ─────────────────────────────────────────────────────────────────────────

  const envoyerMedia = useCallback(async (asset, type = 'image') => {
    const fd = new FormData();
    fd.append('file', {
      uri:  asset.uri,
      type: asset.type || 'image/jpeg',
      name: asset.fileName || `media_${Date.now()}.jpg`,
    });
    fd.append('type', type);
    try {
      const nouveau = await msgApi.sendMedia(fd);
      if (monté.current) {
        setMessages(prev => [...prev, nouveau]);
        setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 80);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'envoyer le fichier.');
    }
  }, []);

  const ouvrirGalerie = useCallback(async () => {
    const ok = await permGalerie();
    if (!ok) { Alert.alert('Permission refusée'); return; }
    const r = await launchImageLibrary({ mediaType: 'mixed', quality: 0.8, selectionLimit: 1 });
    if (!r.didCancel && r.assets?.[0]) {
      const a = r.assets[0];
      envoyerMedia(a, a.type?.startsWith('video') ? 'video' : 'image');
    }
  }, [envoyerMedia]);

  const ouvrirCamera = useCallback(async () => {
    const ok = await permCamera();
    if (!ok) { Alert.alert('Permission refusée'); return; }
    const r = await launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: true });
    if (!r.didCancel && r.assets?.[0]) envoyerMedia(r.assets[0], 'image');
  }, [envoyerMedia]);

  // ─────────────────────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────────────────────
  const playAudio = async (uri) => {
    try {
      await audioRecorderPlayer.startPlayer(uri);
      audioRecorderPlayer.setVolume(1.0);
    } catch (e) {
      console.log('play error', e);
    }
  };
  const handleReact = useCallback(async (id, emoji) => {
    try {
      await msgApi.react(id, emoji);
      charger(true);
    } catch (e) { console.error(e); }
  }, [charger]);

  const handleDelete = useCallback(async (id) => {
    Alert.alert('Supprimer', 'Supprimer ce message ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: async () => {
        try {
          await msgApi.del(id);
          setMessages(prev => prev.filter(m => String(m.id) !== String(id)));
        } catch (e) { Alert.alert('Erreur', 'Impossible de supprimer.'); }
      }},
    ]);
  }, []);

  const handleCopy = useCallback((msg) => {
    if (msg.message) {
      Clipboard.setString(msg.message);
      Alert.alert('Copié', 'Message copié dans le presse-papiers.');
    }
  }, []);

  const handleEdit = useCallback((msg) => {
    setEditMsg(msg);
    setTexte(msg.message || '');
  }, []);

  const handleReply = useCallback((msg) => {
    setReplyMsg(msg);
  }, []);

  const handleLongPress = useCallback((msg) => {
    setMenuMsg(msg);
    setMenuVisible(true);
  }, []);

  const handleSeen = useCallback(async (id) => {
    try { await msgApi.seen(id); } catch {}
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // LISTE : construction items (messages + séparateurs de date)
  // ─────────────────────────────────────────────────────────────────────────

  const listeItems = useMemo(() => {
    const msgsFiltres = recherche.trim()
      ? messages.filter(m =>
          m.message?.toLowerCase().includes(recherche.toLowerCase()) ||
          nomComplet(m.nom, m.prenom).toLowerCase().includes(recherche.toLowerCase()))
      : messages;

    const items = [];
    let datePrev = null;
    msgsFiltres.forEach(msg => {
      const d = msg.created_at ? new Date(msg.created_at).toDateString() : '';
      if (d && d !== datePrev) {
        items.push({ type: 'date', key: `date_${d}_${msg.id}`, label: labelDate(msg.created_at) });
        datePrev = d;
      }
      items.push({ type: 'msg', key: `msg_${msg.id}`, msg });
    });
    return items;
  }, [messages, recherche]);

  // Map id → message pour les citations
  const msgMap = useMemo(() => {
    const m = {};
    messages.forEach(msg => { m[String(msg.id)] = msg; });
    return m;
  }, [messages]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER ITEM
  // ─────────────────────────────────────────────────────────────────────────

  const renderItem = useCallback(({ item, index }) => {
    if (item.type === 'date') return <DateSep label={item.label} />;

    const msg    = item.msg;
    const estMoi = String(msg.sender_id) === monId;

    let prevMsg = null;
    for (let i = index - 1; i >= 0; i--) {
      if (listeItems[i]?.type === 'msg') { prevMsg = listeItems[i].msg; break; }
    }
    const afficherEntete = !prevMsg || prevMsg.sender_id !== msg.sender_id;

    // Marquer comme vu automatiquement si message reçu non vu
    if (!estMoi && !msg.is_seen) handleSeen(msg.id);

    return (
      <BulleMessage
        item={item}
        estMoi={estMoi}
        afficherEntete={afficherEntete}
        replyMsg={msg.reply_to ? msgMap[String(msg.reply_to)] : null}
        onLongPress={handleLongPress}
        onSwipe={handleReply}
        onMediaPress={(uri) => { setImgUri(uri); setImgVisible(true); }}
      />
    );
  }, [monId, listeItems, msgMap, handleLongPress, handleReply, handleSeen]);

  const keyExtractor = useCallback((item) => item.key, []);

  // ─────────────────────────────────────────────────────────────────────────
  // HEADER : liste des membres
  // ─────────────────────────────────────────────────────────────────────────

  const membres = useMemo(() => {
    const seen  = new Set();
    const liste = [];
    messages.forEach(m => {
      if (!seen.has(m.sender_id)) {
        seen.add(m.sender_id);
        liste.push({ id: m.sender_id, nom: m.nom, prenom: m.prenom, role: m.role });
      }
    });
    return liste;
  }, [messages]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU PRINCIPAL
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={WA.headerDark} />

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      {rechercheOn ? (
        <SearchBar
          value={recherche}
          onChange={setRecherche}
          onClose={() => { setRechercheOn(false); setRecherche(''); }}
        />
      ) : (

        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity style={s.headerInfo} onPress={() => setMembresVis(v => !v)}>
            <View style={s.headerAvatar}>
              <Ionicons name="people" size={24} color="#FFF" />
            </View>
            <View>
              <Text style={s.headerTitre}>BBS Groupe Officiel</Text>
              <Text style={s.headerSub}>
                {String(membres.length)} membre{membres.length > 1 ? 's' : ''}
              </Text>
            </View>
          </TouchableOpacity>

          <View style={s.headerActions}>
            <TouchableOpacity style={s.headerBtn} onPress={() => setRechercheOn(true)}>
              <Ionicons name="search" size={22} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={s.headerBtn} onPress={() => charger(false)}>
              <Ionicons name="refresh" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ─── Liste membres (dropdown) ────────────────────────────────────── */}
      {membresVis && (
        <View style={s.membresPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ padding: 10 }}>
            {membres.map(m => (
              <View key={String(m.id)} style={s.membreItem}>
                <Avatar nom={m.nom} prenom={m.prenom} role={m.role} size={34} />
                <Text style={s.membreNom} numberOfLines={1}>
                  {(m.prenom || '').split(' ')[0] || m.nom}
                </Text>
                <View style={[s.membreRoleDot, { backgroundColor: roleColor(m.role) }]} />
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ─── Corps ───────────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {chargement ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={WA.sendBtn} size="large" />
            <Text style={s.loadingTxt}>Chargement…</Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={listeItems}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={s.liste}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
            removeClippedSubviews
            maxToRenderPerBatch={20}
            windowSize={15}
            initialNumToRender={30}
            ListEmptyComponent={() => (
              <View style={s.emptyWrap}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={60}
                  color={WA.textMuted}
                />
                <Text style={s.emptyTxt}>Aucun message</Text>
                <Text style={s.emptySub}>Soyez le premier à écrire !</Text>
              </View>
            )}
          />
        )}

        {/* ─── Barre Reply ──────────────────────────────────────────────── */}
        <ReplyBar msg={replyMsg} onCancel={() => setReplyMsg(null)} />

        {/* ─── Barre de saisie ──────────────────────────────────────────── */}

    {/* ─── Barre de saisie ──────────────────────────────────────────── */}
    <View style={s.saisieWrap}>

      <TouchableOpacity style={s.saisieBtn} onPress={ouvrirCamera}>
        <Ionicons name="camera" size={24} color="#54656F" />
      </TouchableOpacity>

       <TouchableOpacity
         style={s.saisieBtn}
         onPress={recording ? stopRecording : startRecording}
       >
         <Ionicons
           name={recording ? "stop-circle" : "mic"}
           size={24}
           color={recording ? "red" : "#54656F"}
         />
       </TouchableOpacity>

      <TouchableOpacity style={s.saisieBtn} onPress={ouvrirGalerie}>
        <Ionicons name="attach" size={24} color="#54656F" />
      </TouchableOpacity>

      <View style={s.inputWrap}>

        {!!editMsg && (
          <View style={s.editBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="create-outline"
                size={18}
                color={WA.sendBtn}
              />
              <Text style={s.editBannerTxt}>
                Modifier le message
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                setEditMsg(null);
                setTexte('');
              }}
            >
              <Ionicons
                name="close"
                size={20}
                color={WA.danger}
              />
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          style={s.input}
          value={texte}
          onChangeText={setTexte}
          placeholder="Message…"
          placeholderTextColor={WA.textMuted}
          multiline
          maxLength={2000}
          editable={!envoi}
        />
      </View>

      <TouchableOpacity
        style={[s.sendBtn, (!texte.trim() || envoi) && s.sendBtnOff]}
        onPress={handleEnvoyer}
        disabled={!texte.trim() || envoi}
      >
        {envoi ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Ionicons
            name="send"
            size={22}
            color="#FFF"
          />
        )}
      </TouchableOpacity>

    </View>

    </KeyboardAvoidingView>

    <MenuModal
      visible={menuVisible}
      msg={menuMsg}
      monId={monId}
      onClose={() => setMenuVisible(false)}
      onReact={handleReact}
      onReply={handleReply}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onCopy={handleCopy}
    />

    <ModalImage
      uri={imgUri}
      visible={imgVisible}
      onClose={() => setImgVisible(false)}
    />

    </SafeAreaView>
    );
     }



// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

 const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: WA.fond },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WA.headerBg,
    paddingTop:    Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 4 : 4,
    paddingBottom: 10, paddingHorizontal: 8, gap: 6,
  },
  backBtn:    { padding: 6 },
  backTxt:    { color: '#FFF', fontSize: 24, lineHeight: 28 },
  headerInfo: { flex: 1,
     flexDirection: 'row',
     alignItems: 'center',
     gap: 10 },
  headerAvatar: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitre: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 11 },
  headerActions: { flexDirection: 'row' },
  headerBtn:   { padding: 8 },
  headerBtnTxt:{ color: '#FFF', fontSize: 19 },

  // ── Membres panel ──
  membresPanel: {
    backgroundColor: WA.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  membreItem:  {
     alignItems: 'center',
     marginRight: 14, gap: 3 },
  membreNom:   {
     color: '#FFF',
     fontSize: 10,
     maxWidth: 50,
     textAlign: 'center' },

  membreRoleDot: {
       width: 6,
       height: 6,
       borderRadius: 3 },

  // ── Recherche ──
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WA.headerBg,
    paddingTop:    Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 4 : 4,
    paddingBottom: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: WA.searchBg,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: WA.textMain,
  },
  searchClose:    {
       padding: 6
       },

  searchCloseTxt: {
      color: '#FFF',
      fontSize: 18 },

  // ── FlatList ──
  liste: {
      paddingVertical: 8,
      paddingBottom: 4,
      flexGrow: 1 },

  // ── Séparateur de date ──
  dateSepWrap:  {
      alignItems: 'center',
      marginVertical: 10 },
  dateSepBulle: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  dateSepTxt: {
     fontSize: 11,
     fontWeight: '700',
     color: WA.textSub },

  // ── Bulle ──
  ligneMsg:    {
     flexDirection: 'row',
     marginVertical: 2,
     paddingHorizontal: 6 },
  ligneMsgG:   {
     justifyContent: 'flex-start' },
     ligneMsgD:   {
    justifyContent: 'flex-end' },
  avatarCol:   {
     justifyContent: 'flex-end',
     marginHorizontal: 4,
     marginBottom: 2 },
  bulleContenu:  {
     maxWidth: SW * 0.74 },
     bulleContenuG: { alignItems: 'flex-start' },
  bulleContenuD: {
      alignItems: 'flex-end' },
     bulleNom: {
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 2,
        marginLeft: 4 },
  bulle: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  bulleMoi:   {
     backgroundColor: WA.bubbleMoi,
     borderTopRightRadius: 2 },
     bulleAutre: {
     backgroundColor: WA.bubbleAutre,
     borderTopLeftRadius:  2 },
     bulleTxt:   {
         fontSize: 14, color: WA.textMain,
         lineHeight: 20 },
  modifieTxt: {
     fontSize: 11,
     color: WA.textMuted,
     fontStyle: 'italic' },
  bullePied:  {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2, gap: 3,
  },
  bulleHeure: {
     fontSize: 10,
     color: WA.heure },

  // ── Reply box (dans la bulle) ──
  replyBox: {
    borderLeftWidth: 3,
    borderRadius: 6,
    backgroundColor: WA.replyBg,
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 5,
  },
  replyAuteur: {
      fontSize: 11,
      fontWeight: '800',
      marginBottom: 1 },
  replyTxt:    {
      fontSize: 12,
      color: WA.textSub },

  // ── Réactions ──
  reactionsRow: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 3, marginTop: 3,
     marginLeft: 4 },
  reactionChip: {
    flexDirection: 'row',
       alignItems: 'center',
       backgroundColor: 'rgba(0,0,0,0.08)',
       borderRadius: 12,
       paddingHorizontal: 7,
       paddingVertical: 2, gap: 2,
  },
  reactionEmoji: {
     fontSize: 14 },
  reactionCount: {
  fontSize: 11,
  color: WA.textSub,
  fontWeight: '700' },

  // ── Médias ──
  mediaGrid: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 4,
     marginBottom: 4 },
  mediaImg:  {
      width: SW * 0.55,
      height: SW * 0.55,
      borderRadius: 8 },
  mediaVideo:{
    width: SW * 0.55,
    height: SW * 0.55,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaVideoIcon: {
     color: '#FFF',
     fontSize: 40 },

  // ── Reply bar (au-dessus input) ──
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8, gap: 8,
  },
  replyBarContent: {
     flex: 1,
     borderLeftWidth: 3,
     borderLeftColor: WA.sendBtn,
     paddingLeft: 8 },
  replyBarNom:  {
     fontSize: 12,
     fontWeight: '700',
     color: WA.sendBtn },

  replyBarTxt:  {
        fontSize: 12,
        color: WA.textSub },
  replyBarClose:{ padding: 4 },

  // ── Zone de saisie ──
  saisieWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 4,
  },
  saisieBtn:    {
     padding: 7,
     justifyContent: 'center' },
  saisieBtnTxt: {
  fontSize: 22 },
  inputWrap: {
  flex: 1 },
  editBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: WA.sendBtn + '18',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  editBannerTxt: {
  fontSize: 12,
  color: WA.sendBtn,
  fontWeight: '700' },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 7,
    fontSize: 14,
    color: WA.textMain,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: WA.sendBtn,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  sendBtnOff: {
     backgroundColor: WA.textMuted,
     elevation: 0 },

  sendBtnTxt: {
      color: '#FFF',
      fontSize: 18,
      marginLeft: 2 },

  // ── Modal image ──
  imgModalBg: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgModalFull: {
     width: SW,
     height: SW * 1.2 },

  // ── Modal menu ──
  menuOverlay: {
    flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        alignItems: 'center',
        justifyContent: 'center',
  },
  menuCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: SW * 0.82,
    overflow: 'hidden',
    elevation: 10,
  },
  menuReactions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: '#FAFAFA',
  },
  menuReactionBtn:   { padding: 6 },
  menuReactionEmoji: { fontSize: 28 },
  menuSep: {
     height: 1,
     backgroundColor: '#F3F4F6' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20, gap: 14,
  },
  menuItemIcon: {
     fontSize: 20,
     width: 28,
     textAlign: 'center' },
  menuItemTxt:  {
  fontSize: 15,
  color: WA.textMain,
  fontWeight: '500' },

  // ── États ──
  loadingWrap: {
     flex: 1,
     alignItems: 'center',
     justifyContent: 'center',
     gap: 12 },
  loadingTxt:  {
     color: WA.textSub,
     fontSize: 14 },
  emptyWrap:   {
     flex: 1,
     alignItems: 'center',
     justifyContent: 'center',
     paddingTop: 80,
     gap: 8 },

  emptyTxt:    {
     fontSize: 16,
     fontWeight: '700',
     color: WA.textSub },

  emptySub:    {
    fontSize: 13,
    color: WA.textMuted },
});