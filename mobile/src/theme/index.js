// src/theme/index.js
export const Colors = {
  primary: "#0057B8",
  primaryDark: "#003D82",
  primaryLight: "#4A90D9",
  secondary: "#00A651",
  secondaryDark: "#007A3C",
  accent: "#FF6B35",
  warning: "#F5A623",
  danger: "#D0021B",
  success: "#27AE60",
  info: "#2980B9",

  background: "#F0F4F8",
  surface: "#FFFFFF",
  surfaceAlt: "#F7FAFC",
  border: "#E2E8F0",
  divider: "#EDF2F7",

  textPrimary: "#1A202C",
  textSecondary: "#4A5568",
  textMuted: "#718096",
  textLight: "#A0AEC0",
  textWhite: "#FFFFFF",

  statusNormal: "#27AE60",
  statusCongestion: "#F5A623",
  statusCritique: "#D0021B",

  prioriteBasse: "#27AE60",
  prioriteNormale: "#2980B9",
  prioriteHaute: "#F5A623",
  prioriteCritique: "#D0021B",

  gradientStart: "#0057B8",
  gradientEnd: "#00A651",
};

export const Typography = {
  h1: { fontSize: 28,
  fontWeight: "700",
  color: Colors.textPrimary },

  h2: {
      fontSize: 22,
      fontWeight: "700",
      color: Colors.textPrimary },

  h3: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.textPrimary },

  h4: {
     fontSize: 16,
     fontWeight: "600",
     color: Colors.textPrimary },

  body: {
    fontSize: 14,
    fontWeight: "400",
    color: Colors.textSecondary },

  bodyLarge: {
     fontSize: 16,
     fontWeight: "400",
     color: Colors.textSecondary },

  caption: {
     fontSize: 12,
     fontWeight: "400",
     color: Colors.textMuted },

  label: {
     fontSize: 13,
     fontWeight: "500",
     color: Colors.textSecondary },

  button: {
    fontSize: 15,
    fontWeight: "600" },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const Shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  button: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const getPrioriteColor = (priorite) => {
  const map = {
    basse: Colors.prioriteBasse,
    normale: Colors.prioriteNormale,
    haute: Colors.prioriteHaute,
    critique: Colors.prioriteCritique,
  };
  return map[priorite] || Colors.prioriteNormale;
};

export const getStatutColor = (statut) => {
  const map = {
    normal: Colors.statusNormal,
    congestion: Colors.statusCongestion,
    critique: Colors.statusCritique,
    ouvert: Colors.danger,
    en_cours: Colors.warning,
    resolu: Colors.success,
    ferme: Colors.textMuted,
    en_attente: Colors.warning,
    terminee: Colors.success,
    annulee: Colors.textMuted,
  };
  return map[statut] || Colors.textMuted;
};

export default { Colors, Typography, Spacing, Radius, Shadows };
