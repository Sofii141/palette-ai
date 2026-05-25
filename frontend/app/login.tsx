import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { useAuth } from '@/services/auth';
import { Logo } from '@/components/Logo';
import { fonts, fontSize, spacing, radius } from '@/theme/tokens';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError('');
    setSubmitting(true);
    try {
      await login(username.trim(), password);
    } catch (e: any) {
      setError(e?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.wrap}>
          <Logo size={68} showTagline={false} />

          <Text style={[styles.eyebrow, { color: colors.textMuted, fontFamily: fonts.body }]}>
            Welcome to
          </Text>
          <Text style={[styles.title, { color: colors.text, fontFamily: fonts.display }]}>
            PALETTE
          </Text>
          <Text
            style={[styles.sub, { color: colors.textSecondary, fontFamily: fonts.serifItalic }]}
          >
            Step into the museum.{'\n'}Sign in to save what moves you.
          </Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textMuted, fontFamily: fonts.body }]}>
                Username
              </Text>
              <TextInput
                style={[styles.input, {
                  color: colors.text,
                  borderBottomColor: colors.borderStrong,
                  fontFamily: fonts.serif,
                }]}
                placeholder="your username"
                placeholderTextColor={colors.textMuted}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.textMuted, fontFamily: fonts.body }]}>
                Password
              </Text>
              <TextInput
                style={[styles.input, {
                  color: colors.text,
                  borderBottomColor: colors.borderStrong,
                  fontFamily: fonts.serif,
                }]}
                placeholder="your password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                returnKeyType="go"
                onSubmitEditing={onSubmit}
              />
            </View>

            <Text style={[styles.error, { color: colors.heart, fontFamily: fonts.serifItalic }]}>
              {error || ' '}
            </Text>

            <Pressable
              onPress={onSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: colors.accent,
                  opacity: submitting || pressed ? 0.85 : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textInverse} />
              ) : (
                <>
                  <Text style={[styles.buttonText, { color: colors.textInverse, fontFamily: fonts.bodyMedium }]}>
                    Enter the Gallery
                  </Text>
                  <Feather name="arrow-right" size={16} color={colors.textInverse} />
                </>
              )}
            </Pressable>
          </View>

          <Text style={[styles.hint, { color: colors.textMuted, fontFamily: fonts.body }]}>
            Try <Text style={{ color: colors.text, fontWeight: '700' }}>sofi</Text>
            {' '}/{' '}
            <Text style={{ color: colors.text, fontWeight: '700' }}>sofi</Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: 40,
    letterSpacing: 5,
    textAlign: 'center',
  },
  sub: {
    fontSize: fontSize.md + 1,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: (fontSize.md + 1) * 1.4,
  },
  form: {
    width: '100%',
    marginTop: spacing.xxl,
    gap: spacing.lg,
  },
  field: { gap: spacing.xs },
  label: {
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  input: {
    fontSize: 18,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  error: {
    fontSize: 12,
    textAlign: 'center',
    minHeight: 18,
    marginTop: -spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md + 2,
    borderRadius: radius.pill,
  },
  buttonText: {
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  hint: {
    marginTop: spacing.xl,
    fontSize: 11,
    letterSpacing: 2,
  },
});
