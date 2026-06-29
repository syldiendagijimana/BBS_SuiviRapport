import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>

      {/* LOGO BOX */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logo}
        />
      </View>

      {/* TITRE */}
      <Text style={styles.title}>Bienvenue</Text>

      {/* SOUS-TITRE */}
      <Text style={styles.subtitle}>
        Gestion des rapports sur terrain
      </Text>

      {/* BUTTON */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.buttonText}>Se connecter</Text>
      </TouchableOpacity>

      {/* LINK */}
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>
          Clique ici pour se connecter
        </Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  // LOGO CONTAINER (shadow + elevation ici)
  logoContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,

    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  logo: {
    width: 120,
    height: 120,
    resizeMode: "contain",
  },

  title: {
    color: "white",
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 10,
  },

  subtitle: {
    color: "white",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 30,
  },

  button: {
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 35,
    borderRadius: 8,
    marginBottom: 20,
  },

  buttonText: {
    color: "#dc2626",
    fontWeight: "bold",
    fontSize: 18,
  },

  link: {
    color: "white",
    textDecorationLine: "underline",
    fontSize: 16,
  },
});