import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar,
  Image,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { Button, Input } from "../components";
import { Colors, Spacing, Radius, Typography } from "../theme";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function LoginScreen() {
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      setError("Veuillez remplir tous les champs");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (e) {
      setError(e.message || "Erreur de connexion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={Colors.primaryDark}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.appName}>BBS SuiviRapport</Text>
          <Text style={styles.tagline}>Gestion des rapports terrain</Text>
        </View>

        {/* FORM */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Authentification</Text>
          <Text style={styles.formSubtitle}>
            Connectez-vous à votre compte
          </Text>

          {error ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {error}</Text>
            </View>
          ) : null}

          <Input
            label="Adresse email"
            value={email}
            onChangeText={setEmail}
            placeholder="Adresse email"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={{ marginBottom: Spacing.lg }}>
            <Text style={styles.inputLabel}>Mot de passe</Text>

            <View style={styles.passwordRow}>
              <View style={{ flex: 1 }}>
                <Input
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Mot de passe"
                  secureTextEntry={!showPassword}
                  containerStyle={{ marginBottom: 0 }}
                />
              </View>

              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={22}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <Button
            title={loading ? "Connexion..." : "Se connecter"}
            onPress={handleLogin}
            loading={loading}
            size="lg"
          />

          <View style={styles.demoBox}>
            <Text style={styles.demoText}>
              BBS: Burundi Backbone System
            </Text>
          </View>

          <Text style={styles.footer}>BBS v1.0.0 © 2026</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    backgroundColor: Colors.primaryDark,
    paddingVertical: Spacing.xl,
  },

  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },

  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },

  logoImage: {
    width: 70,
    height: 70,
  },

  appName: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.textWhite,
  },

  tagline: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },

  form: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
  },

  formTitle: {
    ...Typography.h2,
    textAlign: "center",
  },

  formSubtitle: {
    ...Typography.body,
    marginBottom: Spacing.xl,
    textAlign: "center",
  },

  errorBanner: {
    backgroundColor: Colors.danger + "15",
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },

  errorBannerText: {
    color: Colors.danger,
  },

  inputLabel: {
    ...Typography.label,
    marginBottom: 5,
  },

  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  eyeButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  demoBox: {
    marginTop: Spacing.lg,
    alignItems: "center",
  },

  demoText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF0000",
  },

  footer: {
    textAlign: "center",
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    marginTop: Spacing.xl,
  },
});