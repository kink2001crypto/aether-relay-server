/**
 * ⚙️ AETHER Mobile - Settings Screen
 * Configuration for AI models, API keys, and preferences
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../hooks/useApp';
import { useTheme } from '../theme';
import { APP_VERSION, BUILD_DATE, SERVER_URL } from '../config';

// ============== MODEL CONFIG ==============

const MODEL_ICONS: Record<string, string> = {
  gemini: 'sparkles',
  ollama: 'hardware-chip',
  claude: 'chatbubble-ellipses',
  openai: 'logo-electron',
  deepseek: 'fish',
  grok: 'flash',
  glm: 'diamond',
};

const MODEL_COLORS: Record<string, [string, string]> = {
  gemini: ['#4285f4', '#1a73e8'],
  ollama: ['#00d084', '#00a368'],
  claude: ['#cc785c', '#a65d45'],
  openai: ['#10a37f', '#0d8c6d'],
  deepseek: ['#6366f1', '#4f46e5'],
  grok: ['#f97316', '#ea580c'],
  glm: ['#e11d48', '#be123c'],
};

const MODEL_VARIANTS: Record<string, { id: string; name: string }[]> = {
  gemini: [
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Fast)' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Best)' },
    { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro' },
  ],
  claude: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude 4 Sonnet (Latest)' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Best)' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku (Fast)' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Powerful)' },
  ],
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o (Latest)' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini (Fast)' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'o1', name: 'o1 (Reasoning)' },
    { id: 'o1-mini', name: 'o1 Mini (Fast Reasoning)' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat (Latest)' },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1 (Reasoning)' },
    { id: 'deepseek-coder', name: 'DeepSeek Coder' },
  ],
  grok: [
    { id: 'grok-2-latest', name: 'Grok 2 (Latest)' },
    { id: 'grok-2-vision-1212', name: 'Grok 2 Vision' },
    { id: 'grok-beta', name: 'Grok Beta' },
  ],
  glm: [
    { id: 'glm-4-plus', name: 'GLM-4 Plus (Best)' },
    { id: 'glm-4-air', name: 'GLM-4 Air (Fast)' },
    { id: 'glm-4-flash', name: 'GLM-4 Flash (Fastest)' },
    { id: 'glm-4-long', name: 'GLM-4 Long (1M context)' },
  ],
  ollama: [
    { id: 'qwen2.5:14b', name: 'Qwen 2.5 14B (Best quality)' },
    { id: 'deepseek-coder-v2:16b', name: 'DeepSeek Coder V2 16B' },
    { id: 'qwen2.5-coder:7b', name: 'Qwen 2.5 Coder 7B' },
    { id: 'llama3.1:8b', name: 'Llama 3.1 8B' },
    { id: 'llama3.2:latest', name: 'Llama 3.2 (Fast)' },
  ],
};

interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  free: boolean;
  available: boolean;
  configured: boolean;
}

// ============== COMPONENT ==============

export default function SettingsScreen() {
  const { serverUrl, selectedModel, setSelectedModel, isConnected, apiKeys, setApiKey, modelVariants, setModelVariant } = useApp();
  const { isDarkMode, toggleTheme, colors } = useTheme();

  const [notifications, setNotifications] = useState(true);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [tempApiKey, setTempApiKey] = useState('');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  const styles = createStyles(colors);

  // Fetch providers status from server
  const fetchProviders = useCallback(async () => {
    if (!serverUrl) return;
    setLoadingProviders(true);
    try {
      const response = await fetch(`${serverUrl}/api/ai/providers`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.log('Error fetching providers:', error);
    }
    setLoadingProviders(false);
  }, [serverUrl]);

  useEffect(() => {
    if (isConnected) {
      fetchProviders();
    }
  }, [isConnected, fetchProviders]);

  const handleSelectModel = useCallback((modelId: string) => {
    const provider = providers.find(p => p.id === modelId);
    const hasLocalKey = !!(apiKeys as any)[modelId];
    const hasServerKey = provider?.configured || false;

    if (modelId === 'ollama' || hasLocalKey || hasServerKey) {
      setSelectedModel(modelId);
      Alert.alert('Model Changed', `Using ${modelId.charAt(0).toUpperCase() + modelId.slice(1)}`);
    } else {
      Alert.alert(
        'API Key Required',
        `Add your ${modelId} API key to use this model`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Add Key', onPress: () => setEditingKey(modelId) }
        ]
      );
    }
  }, [providers, apiKeys, setSelectedModel]);

  const getModelStatus = useCallback((modelId: string): { text: string; color: string; icon: string } => {
    const provider = providers.find(p => p.id === modelId);
    const hasLocalKey = !!(apiKeys as any)[modelId];

    if (modelId === 'ollama') {
      return { text: 'Local (Free)', color: colors.success, icon: 'checkmark-circle' };
    }
    if (hasLocalKey) {
      return { text: 'Your Key', color: colors.success, icon: 'key' };
    }
    if (provider?.configured) {
      return { text: 'Server Key', color: colors.primary, icon: 'cloud' };
    }
    return { text: 'Not Configured', color: colors.textMuted, icon: 'add-circle' };
  }, [providers, apiKeys, colors]);

  const handleSaveApiKey = useCallback((modelId: string) => {
    if (tempApiKey.trim()) {
      setApiKey(modelId, tempApiKey.trim());
      Alert.alert('API Key Saved', `Your ${modelId} key is now configured`);
    }
    setEditingKey(null);
    setTempApiKey('');
  }, [tempApiKey, setApiKey]);

  const handleRemoveApiKey = useCallback((modelId: string) => {
    Alert.alert(
      'Remove API Key?',
      `Remove your ${modelId} API key?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setApiKey(modelId, '');
            Alert.alert('Removed', `Your ${modelId} key has been removed`);
          }
        }
      ]
    );
  }, [setApiKey]);

  // ============== RENDER ==============

  return (
    <LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.headerIcon}>
              <Ionicons name="settings" size={28} color="#fff" />
            </LinearGradient>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Configure your AETHER experience</Text>
          </View>

          {/* Connection Status */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>CONNECTION</Text>
            <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={[styles.card, { borderColor: colors.border }]}>
              <View style={styles.statusRow}>
                <View style={styles.statusInfo}>
                  <View style={[styles.statusDot, isConnected ? styles.dotConnected : styles.dotDisconnected]} />
                  <View>
                    <Text style={[styles.statusLabel, { color: colors.text }]}>{isConnected ? 'Connected' : 'Disconnected'}</Text>
                    <Text style={[styles.statusUrl, { color: colors.textMuted }]} numberOfLines={1}>{SERVER_URL}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, isConnected ? styles.badgeSuccess : styles.badgeError]}>
                  <Ionicons name={isConnected ? 'checkmark-circle' : 'close-circle'} size={18} color={isConnected ? colors.success : colors.error} />
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* AI Models */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>AI MODELS</Text>
              <TouchableOpacity onPress={fetchProviders}>
                {loadingProviders ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="refresh" size={20} color={colors.textMuted} />
                )}
              </TouchableOpacity>
            </View>
            <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={[styles.card, { borderColor: colors.border }]}>
              {['ollama', 'gemini', 'claude', 'openai', 'deepseek', 'grok', 'glm'].map((modelId, index, arr) => {
                const isSelected = selectedModel === modelId;
                const status = getModelStatus(modelId);
                const isEditing = editingKey === modelId;
                const modelColors = MODEL_COLORS[modelId] || [colors.primary, colors.primaryDark];

                return (
                  <View key={modelId}>
                    <View style={[styles.modelRow, index < arr.length - 1 && styles.modelRowBorder]}>
                      <TouchableOpacity style={styles.modelMain} onPress={() => handleSelectModel(modelId)}>
                        <LinearGradient
                          colors={isSelected ? modelColors : [colors.surfaceLight, colors.surface]}
                          style={styles.modelIcon}
                        >
                          <Ionicons
                            name={MODEL_ICONS[modelId] as any || 'cube'}
                            size={24}
                            color={isSelected ? '#fff' : colors.textMuted}
                          />
                        </LinearGradient>
                        <View style={styles.modelInfo}>
                          <View style={styles.modelNameRow}>
                            <Text style={[styles.modelName, { color: colors.text }, isSelected && { color: modelColors[0] }]}>
                              {modelId.charAt(0).toUpperCase() + modelId.slice(1)}
                            </Text>
                            {isSelected && (
                              <View style={[styles.activeBadge, { backgroundColor: modelColors[0] }]}>
                                <Text style={styles.activeBadgeText}>Active</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.modelStatusRow}>
                            <Ionicons name={status.icon as any} size={12} color={status.color} />
                            <Text style={[styles.modelStatus, { color: status.color }]}>{status.text}</Text>
                          </View>
                        </View>
                      </TouchableOpacity>

                      {modelId !== 'ollama' && (
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {!!(apiKeys as any)[modelId] && (
                            <TouchableOpacity
                              onPress={() => handleRemoveApiKey(modelId)}
                              style={[styles.keyBtn, { backgroundColor: colors.error + '20' }]}
                            >
                              <Ionicons name="trash" size={18} color={colors.error} />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => {
                              if (isEditing) {
                                setEditingKey(null);
                                setTempApiKey('');
                              } else {
                                setEditingKey(modelId);
                                setTempApiKey((apiKeys as any)[modelId] || '');
                              }
                            }}
                            style={[styles.keyBtn, { backgroundColor: (apiKeys as any)[modelId] ? colors.success + '20' : colors.primary + '20' }]}
                          >
                            <Ionicons
                              name={(apiKeys as any)[modelId] ? 'create' : isEditing ? 'close' : 'add'}
                              size={18}
                              color={(apiKeys as any)[modelId] ? colors.success : colors.primary}
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>

                    {/* Inline API Key Input */}
                    {isEditing && (
                      <View style={styles.keyInputContainer}>
                        <TextInput
                          style={[styles.keyInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                          value={tempApiKey}
                          onChangeText={setTempApiKey}
                          placeholder={`Enter your ${modelId} API key`}
                          placeholderTextColor={colors.textMuted}
                          autoCapitalize="none"
                          autoCorrect={false}
                          secureTextEntry
                          autoFocus
                        />
                        <View style={styles.keyButtonRow}>
                          <TouchableOpacity
                            onPress={() => { setEditingKey(null); setTempApiKey(''); }}
                            style={[styles.keyActionBtn, { backgroundColor: colors.error + '20' }]}
                          >
                            <Text style={[styles.keyActionText, { color: colors.error }]}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleSaveApiKey(modelId)}>
                            <LinearGradient colors={[colors.success, '#059669']} style={styles.keySaveBtn}>
                              <Ionicons name="checkmark" size={18} color="#fff" />
                              <Text style={styles.keySaveText}>Save Key</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Model Variant Selector */}
                    {isSelected && MODEL_VARIANTS[modelId] && (
                      <View style={styles.variantContainer}>
                        <TouchableOpacity
                          style={[styles.variantSelector, { backgroundColor: colors.background, borderColor: colors.border }]}
                          onPress={() => setExpandedModel(expandedModel === modelId ? null : modelId)}
                        >
                          <View style={styles.variantInfo}>
                            <Ionicons name="layers" size={16} color={modelColors[0]} />
                            <Text style={[styles.variantLabel, { color: colors.textMuted }]}>Model:</Text>
                            <Text style={[styles.variantValue, { color: colors.text }]} numberOfLines={1}>
                              {MODEL_VARIANTS[modelId].find(v => v.id === modelVariants[modelId as keyof typeof modelVariants])?.name || modelVariants[modelId as keyof typeof modelVariants]}
                            </Text>
                          </View>
                          <Ionicons
                            name={expandedModel === modelId ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color={colors.textMuted}
                          />
                        </TouchableOpacity>

                        {expandedModel === modelId && (
                          <View style={[styles.variantList, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}>
                            {MODEL_VARIANTS[modelId].map((variant) => {
                              const isCurrentVariant = modelVariants[modelId as keyof typeof modelVariants] === variant.id;
                              return (
                                <TouchableOpacity
                                  key={variant.id}
                                  style={[styles.variantOption, isCurrentVariant && { backgroundColor: modelColors[0] + '20' }]}
                                  onPress={() => {
                                    setModelVariant(modelId, variant.id);
                                    setExpandedModel(null);
                                  }}
                                >
                                  <Text style={[styles.variantOptionText, { color: isCurrentVariant ? modelColors[0] : colors.text }]}>
                                    {variant.name}
                                  </Text>
                                  {isCurrentVariant && (
                                    <Ionicons name="checkmark-circle" size={18} color={modelColors[0]} />
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </LinearGradient>
          </View>

          {/* Preferences */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>PREFERENCES</Text>
            <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={[styles.card, { borderColor: colors.border }]}>
              <View style={[styles.preferenceRow, styles.preferenceRowBorder]}>
                <View style={styles.preferenceInfo}>
                  <Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={22} color={colors.primary} />
                  <Text style={[styles.preferenceName, { color: colors.text }]}>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</Text>
                </View>
                <Switch
                  value={isDarkMode}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={isDarkMode ? colors.primary : colors.textMuted}
                />
              </View>
              <View style={styles.preferenceRow}>
                <View style={styles.preferenceInfo}>
                  <Ionicons name="notifications" size={22} color={colors.warning} />
                  <Text style={[styles.preferenceName, { color: colors.text }]}>Notifications</Text>
                </View>
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: colors.border, true: colors.warning + '60' }}
                  thumbColor={notifications ? colors.warning : colors.textMuted}
                />
              </View>
            </LinearGradient>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ABOUT</Text>
            <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={[styles.card, { borderColor: colors.border }]}>
              <View style={styles.aboutRow}>
                <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Version</Text>
                <Text style={[styles.aboutValue, { color: colors.text }]}>{APP_VERSION}</Text>
              </View>
              <View style={[styles.aboutRow, styles.aboutRowBorder]}>
                <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Build</Text>
                <Text style={[styles.aboutValue, { color: colors.text }]}>{BUILD_DATE}</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={[styles.aboutLabel, { color: colors.textMuted }]}>Server</Text>
                <Text style={[styles.aboutValue, { color: colors.primary }]} numberOfLines={1}>Fly.io</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>AETHER IDE</Text>
            <Text style={[styles.footerSubtext, { color: colors.textMuted }]}>Mobile Coding Companion</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ============== STYLES ==============

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  header: { alignItems: 'center', paddingVertical: 32 },
  headerIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  headerSubtitle: { fontSize: 14, marginTop: 6 },
  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginLeft: 4, marginBottom: 12 },
  card: { borderRadius: 20, padding: 16, borderWidth: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusInfo: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  statusDot: { width: 14, height: 14, borderRadius: 7 },
  dotConnected: { backgroundColor: colors.success },
  dotDisconnected: { backgroundColor: colors.error },
  statusLabel: { fontSize: 16, fontWeight: '600' },
  statusUrl: { fontSize: 12, marginTop: 3, maxWidth: 180 },
  statusBadge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badgeSuccess: { backgroundColor: colors.success + '20' },
  badgeError: { backgroundColor: colors.error + '20' },
  // Model styles
  modelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  modelRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  modelMain: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  modelIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modelInfo: { flex: 1 },
  modelNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modelName: { fontSize: 16, fontWeight: '600' },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  activeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  modelStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  modelStatus: { fontSize: 12 },
  keyBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  keyInputContainer: { paddingVertical: 12, paddingLeft: 62 },
  keyInput: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, borderWidth: 1 },
  keyButtonRow: { flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'flex-end' },
  keyActionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  keyActionText: { fontSize: 14, fontWeight: '600' },
  keySaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  keySaveText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  // Variant selector
  variantContainer: { marginTop: 12, paddingLeft: 62 },
  variantSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  variantInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  variantLabel: { fontSize: 12, fontWeight: '600' },
  variantValue: { fontSize: 13, fontWeight: '500', flex: 1 },
  variantList: { marginTop: 8, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  variantOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  variantOptionText: { fontSize: 14, fontWeight: '500' },
  // Preferences
  preferenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  preferenceRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  preferenceInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  preferenceName: { fontSize: 16, fontWeight: '500' },
  // About
  aboutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  aboutRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  aboutLabel: { fontSize: 14 },
  aboutValue: { fontSize: 14, fontWeight: '500' },
  // Footer
  footer: { alignItems: 'center', paddingVertical: 32 },
  footerText: { fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  footerSubtext: { fontSize: 12, marginTop: 4, opacity: 0.6 },
});
