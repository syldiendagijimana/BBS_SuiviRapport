// src/components/index.js
import React from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, ScrollView
} from 'react-native';
import { Colors, Typography, Spacing, Radius, Shadows, getPrioriteColor, getStatutColor } from '../theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
// ─── Button ────────────────────────────────────────────────────────────
export function Button({ title, onPress, variant = 'primary', size = 'md', loading, disabled, style, icon }) {
  const variants = {
    primary: { bg: Colors.primary, text: Colors.textWhite },
    secondary: { bg: Colors.secondary, text: Colors.textWhite },
    danger: { bg: Colors.danger, text: Colors.textWhite },
    outline: { bg: 'transparent', text: Colors.primary, border: Colors.primary },
    ghost: { bg: Colors.background, text: Colors.textPrimary },
  };
  const sizes = {
    sm: { paddingH: 12, paddingV: 6, fontSize: 13 },
    md: { paddingH: 20, paddingV: 12, fontSize: 15 },
    lg: { paddingH: 28, paddingV: 16, fontSize: 16 },
  };
  const v = variants[variant];
  const s = sizes[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        { backgroundColor: v.bg, paddingHorizontal: s.paddingH, paddingVertical: s.paddingV,
          borderColor: v.border, borderWidth: v.border ? 1.5 : 0,
          opacity: disabled ? 0.5 : 1 },
        variant === 'primary' && Shadows.button,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} size="small" />
      ) : (
        <Text style={{ color: v.text, fontSize: s.fontSize, fontWeight: '600' }}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Input ─────────────────────────────────────────────────────────────
export function Input({
  label,
  error,
  style,
  containerStyle,
  rightIcon,
  onRightIconPress,
  ...props
}) {
  return (
    <View style={[{ marginBottom: Spacing.md }, containerStyle]}>
      {label && (
        <Text style={styles.inputLabel}>
          {label}
        </Text>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          {...props}
          placeholderTextColor={Colors.textLight}
          style={[
            styles.input,
            error && styles.inputError,
            style
          ]}
        />

        {rightIcon && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRightIconPress}
            style={styles.inputIcon}
          >
            <Ionicons
              name={rightIcon}
              size={24}
              color="#666"
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}
// ─── Card ──────────────────────────────────────────────────────────────
export function Card({ children, style, onPress }) {
  const Container = onPress ? TouchableOpacity : View;
  return (
    <Container onPress={onPress} style={[styles.card, style]}>
      {children}
    </Container>
  );
}

// ─── Badge ─────────────────────────────────────────────────────────────
export function Badge({ label, color, style }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }, style]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function PrioriteBadge({ priorite }) {
  const color = getPrioriteColor(priorite);
  const labels = { basse: 'Basse', normale: 'Normale', haute: 'Haute', critique: 'Critique' };
  return <Badge label={labels[priorite] || priorite} color={color} />;
}

export function StatutBadge({ statut }) {
  const color = getStatutColor(statut);
  const labels = {
    ouvert: 'Ouvert', en_cours: 'En cours', resolu: 'Résolu', ferme: 'Fermé',
    normal: 'Normal', congestion: 'Congestion', critique: 'Critique',
    en_attente: 'En attente', terminee: 'Terminée', annulee: 'Annulée',
  };
  return <Badge label={labels[statut] || statut} color={color} />;
}

// ─── StatCard ──────────────────────────────────────────────────────────
export function StatCard({ label, value, color = Colors.primary, icon }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── SectionHeader ─────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── LoadingScreen ─────────────────────────────────────────────────────
export function LoadingScreen() {
  return (
    <View style={styles.loadingScreen}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>Chargement...</Text>
    </View>
  );
}

// ─── EmptyState ────────────────────────────────────────────────────────
export function EmptyState({ title, subtitle, icon = '📭' }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle && <Text style={styles.emptySubtitle}>{subtitle}</Text>}
    </View>
  );
}

// ─── ProgressBar ───────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = color || (pct > 90 ? Colors.danger : pct > 75 ? Colors.warning : Colors.success);
  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
    </View>
  );
}

// ─── Selector ──────────────────────────────────────────────────────────
export function Selector({ label, value, options, onChange, style }) {
  return (
    <View style={[{ marginBottom: Spacing.md }, style]}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[
                styles.selectorOption,
                value === opt.value && styles.selectorOptionActive
              ]}
            >
              <Text style={[
                styles.selectorText,
                value === opt.value && styles.selectorTextActive
              ]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  btn: { borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  inputLabel: { ...Typography.label, marginBottom: 5 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: 12,
    paddingRight: 50, // AJOUTER
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  inputError: {
      borderColor: Colors.danger },
      errorText: {
      ...Typography.caption,
      color: Colors.danger,
      marginTop: 3 },
  card: {
    backgroundColor:
    Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
      fontSize: 11,
      fontWeight: '600' },
  statCard: {
    flex: 1,
    backgroundColor:
    Colors.surface,
    borderRadius:
    Radius.lg,
    padding: Spacing.lg,
    borderLeftWidth: 4,
    ...Shadows.card,
  },
  statValue: {
      fontSize: 26,
      fontWeight: '800',
      marginBottom: 2 },
  statLabel: {
      ...Typography.caption },
      sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.md,
      marginTop: Spacing.sm },
  sectionTitle: {
    ...Typography.h3 },
  sectionAction: {
      color: Colors.primary,
      fontSize: 13,
      fontWeight: '600' },
  loadingScreen: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.background },
  loadingText: {
      marginTop: Spacing.md,
      color: Colors.textMuted,
      fontSize: 14 },
  emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: Spacing.xxxl },
      emptyIcon: {
      fontSize: 48,
      marginBottom: Spacing.lg },
  emptyTitle: {
      ...Typography.h3,
      textAlign: 'center',
      marginBottom: Spacing.sm },
      emptySubtitle: {
      ...Typography.body,
      textAlign: 'center' },
  progressBg: {
      height: 8,
      backgroundColor: Colors.border,
      borderRadius:
      Radius.full, overflow: 'hidden' },
      progressFill: { height: '100%',
      borderRadius: Radius.full },
  selectorOption: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: Radius.full,
        borderWidth: 1.5,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
      },
  selectorOptionActive: {
      backgroundColor: Colors.primary,
      borderColor: Colors.primary },
      selectorText: {
      fontSize: 13,
      fontWeight: '500',
      color: Colors.textSecondary },
      selectorTextActive: {
      color: Colors.textWhite },

 inputContainer: {
   position: 'relative',
 },

 inputIcon: {
   position: 'absolute',
   right: 15,
   top: 12,
   zIndex: 1,
 },
});
