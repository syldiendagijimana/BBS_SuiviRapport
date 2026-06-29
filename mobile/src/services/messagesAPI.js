// src/services/messagesAPI.js

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.139.38.120:3000/api';

/**
 * Récupération du token utilisateur
 */
const getToken = async () => {
  try {
    return await AsyncStorage.getItem('bbs_token');
  } catch (error) {
    return null;
  }
};

/**
 * Headers avec authentification
 */
const authHeaders = async () => {
  const token = await getToken();

  return {
    'Content-Type': 'application/json',
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

/**
 * GET /api/messages
 * Charger tous les messages
 */
export const getMessages = async () => {
  const headers = await authHeaders();

  const response = await fetch(
    `${API_URL}/messages`,
    {
      method: 'GET',
      headers,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || 'Erreur chargement messages'
    );
  }

  return data;
};

/**
 * POST /api/messages
 * Envoyer un message
 */
export const sendMessage = async (messageText) => {
  const headers = await authHeaders();

  const response = await fetch(
    `${API_URL}/messages`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: messageText,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || 'Erreur envoi message'
    );
  }

  return data;
};