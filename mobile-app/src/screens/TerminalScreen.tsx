import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useApp } from '../hooks/useApp';
import { useTheme } from '../theme';
import { detectError, formatErrorForAI, getErrorIcon, getErrorColor, ErrorInfo } from '../utils/errorDetector';

interface Terminal {
  id: number;
  name: string;
  output: string[];
  history: string[];
}

const MAX_TERMINALS = 3;

export default function TerminalScreen() {
  const { terminalOutput, executeCommand, isConnected, currentProject, sendMessage, lastExitCode } = useApp();
  const { isDarkMode, colors } = useTheme();
  const [command, setCommand] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lastError, setLastError] = useState<ErrorInfo | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Multi-terminal state
  const [terminals, setTerminals] = useState<Terminal[]>([
    { id: 1, name: 'Terminal 1', output: [], history: [] }
  ]);
  const [activeTerminalId, setActiveTerminalId] = useState(1);

  const activeTerminal = terminals.find(t => t.id === activeTerminalId) || terminals[0];

  useEffect(() => {
    // Sync global terminal output with active terminal
    if (terminalOutput.length > 0) {
      setTerminals(prev => prev.map(t =>
        t.id === activeTerminalId
          ? { ...t, output: [...t.output, ...terminalOutput.slice(t.output.length)] }
          : t
      ));
      
      // Detect errors in new output
      const error = detectError(terminalOutput, lastExitCode ?? undefined);
      if (error.isError) {
        setLastError(error);
      }
    }
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [terminalOutput, lastExitCode]);

  const handleExecute = () => {
    if (command.trim()) {
      executeCommand(command.trim());
      setTerminals(prev => prev.map(t =>
        t.id === activeTerminalId
          ? { ...t, history: [command.trim(), ...t.history.slice(0, 49)] }
          : t
      ));
      setCommand('');
      setHistoryIndex(-1);
    }
  };

  const handleHistoryUp = () => {
    const history = activeTerminal.history;
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCommand(history[newIndex]);
    }
  };

  const handleHistoryDown = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCommand(activeTerminal.history[newIndex]);
    } else if (historyIndex === 0) {
      setHistoryIndex(-1);
      setCommand('');
    }
  };

  const handleClearTerminal = () => {
    setTerminals(prev => prev.map(t =>
      t.id === activeTerminalId ? { ...t, output: [] } : t
    ));
  };

  const addTerminal = () => {
    if (terminals.length >= MAX_TERMINALS) {
      Alert.alert('📟 Limite atteinte', `Maximum ${MAX_TERMINALS} terminaux`);
      return;
    }
    const newId = Math.max(...terminals.map(t => t.id)) + 1;
    setTerminals(prev => [...prev, {
      id: newId,
      name: `Terminal ${newId}`,
      output: [],
      history: []
    }]);
    setActiveTerminalId(newId);
  };

  const closeTerminal = (id: number) => {
    if (terminals.length === 1) {
      Alert.alert('⚠️', 'Tu dois garder au moins 1 terminal');
      return;
    }
    setTerminals(prev => prev.filter(t => t.id !== id));
    if (activeTerminalId === id) {
      const remaining = terminals.filter(t => t.id !== id);
      setActiveTerminalId(remaining[0].id);
    }
  };

  // Share terminal output with AI
  const handleShareWithAI = () => {
    const output = activeTerminal.output.slice(-30).join('\n'); // Last 30 lines
    if (!output.trim()) {
      Alert.alert('📋 Empty', 'No terminal output to share');
      return;
    }
    Alert.alert(
      '🤖 Share with AI?',
      'Send the last 30 lines of terminal output to the AI for assistance?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Share',
          onPress: () => {
            sendMessage(`Here is my terminal output, please help me:\n\n\`\`\`terminal\n${output}\n\`\`\``);
            Alert.alert('✅ Sent!', 'Terminal output shared with AI. Check the Chat tab.');
          }
        },
        {
          text: 'Copy Only',
          onPress: () => {
            Share.share({ message: output });
            Alert.alert('📋 Copied!', 'Terminal output copied to clipboard');
          }
        }
      ]
    );
  };

  // Fix error with AI - sends formatted error context
  const handleFixWithAI = () => {
    if (!lastError) return;
    
    const message = formatErrorForAI(lastError, currentProject?.name);
    sendMessage(message);
    setLastError(null); // Clear error after sending
    Alert.alert('🔧 Sent to AI!', 'Check the Chat tab for the fix suggestion.');
  };

  // Clear error banner
  const dismissError = () => {
    setLastError(null);
  };

  const quickCommands = [
    { label: 'ls', command: 'ls -la', icon: 'folder-outline' },
    { label: 'npm', command: 'npm run dev', icon: 'play' },
    { label: 'git', command: 'git status', icon: 'git-branch' },
    { label: 'pwd', command: 'pwd', icon: 'locate' },
  ];

  const formatOutput = (line: string, index: number) => {
    let textColor = colors.text;
    let prefix = '';

    if (line.startsWith('$') || line.startsWith('>')) {
      textColor = colors.success;
      prefix = '➜ ';
    } else if (line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')) {
      textColor = colors.error;
    } else if (line.toLowerCase().includes('warning') || line.toLowerCase().includes('warn')) {
      textColor = colors.warning;
    } else if (line.toLowerCase().includes('success') || line.toLowerCase().includes('done')) {
      textColor = colors.success;
    } else if (line.startsWith('  ') || line.startsWith('\t')) {
      textColor = colors.textSecondary;
    }

    return (
      <View key={index} style={styles.outputLine}>
        {prefix ? <Text style={[styles.outputPrefix, { color: colors.success }]}>{prefix}</Text> : null}
        <Text style={[styles.outputText, { color: textColor }]}>{line}</Text>
      </View>
    );
  };

  const styles = createStyles(colors);

  if (!isConnected) {
    return (
      <LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.container}>
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.disconnectedContainer}>
            <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.disconnectedIcon}>
              <Ionicons name="terminal" size={48} color={colors.textMuted} />
            </LinearGradient>
            <Text style={[styles.disconnectedTitle, { color: colors.text }]}>Terminal Offline</Text>
            <Text style={[styles.disconnectedText, { color: colors.textMuted }]}>Connect to server in Settings to use terminal</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <LinearGradient colors={[colors.success, '#059669']} style={styles.headerIcon}>
              <Ionicons name="terminal" size={22} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Terminal</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{currentProject?.name || 'No project'}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}
              onPress={handleShareWithAI}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleClearTerminal}>
              <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Terminal Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {terminals.map((terminal) => (
              <TouchableOpacity
                key={terminal.id}
                onPress={() => setActiveTerminalId(terminal.id)}
                onLongPress={() => closeTerminal(terminal.id)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: activeTerminalId === terminal.id ? colors.primary + '20' : 'transparent',
                    borderColor: activeTerminalId === terminal.id ? colors.primary : colors.border
                  }
                ]}
              >
                <View style={[styles.tabDot, { backgroundColor: activeTerminalId === terminal.id ? colors.success : colors.textMuted }]} />
                <Text style={[
                  styles.tabText,
                  { color: activeTerminalId === terminal.id ? colors.primary : colors.textSecondary }
                ]}>
                  {terminal.name}
                </Text>
                {terminals.length > 1 && (
                  <TouchableOpacity onPress={() => closeTerminal(terminal.id)} style={styles.tabClose}>
                    <Ionicons name="close" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}

            {/* Add Terminal Button */}
            {terminals.length < MAX_TERMINALS && (
              <TouchableOpacity onPress={addTerminal} style={[styles.addTabBtn, { borderColor: colors.border }]}>
                <Ionicons name="add" size={20} color={colors.primary} />
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Terminal Count Badge */}
          <View style={[styles.terminalCount, { backgroundColor: colors.primary }]}>
            <Text style={styles.terminalCountText}>{terminals.length}/{MAX_TERMINALS}</Text>
          </View>
        </View>

        {/* Error Banner - shows when error detected */}
        {lastError && (
          <View style={[styles.errorBanner, { backgroundColor: getErrorColor(lastError.errorType) + '15', borderColor: getErrorColor(lastError.errorType) }]}>
            <View style={styles.errorBannerLeft}>
              <View style={[styles.errorIconContainer, { backgroundColor: getErrorColor(lastError.errorType) }]}>
                <Ionicons name={getErrorIcon(lastError.errorType) as any} size={18} color="#fff" />
              </View>
              <View style={styles.errorTextContainer}>
                <Text style={[styles.errorType, { color: getErrorColor(lastError.errorType) }]}>
                  {lastError.errorType.toUpperCase()} ERROR
                </Text>
                <Text style={[styles.errorMessage, { color: colors.text }]} numberOfLines={2}>
                  {lastError.message}
                </Text>
              </View>
            </View>
            <View style={styles.errorBannerRight}>
              <TouchableOpacity onPress={handleFixWithAI} style={[styles.fixButton, { backgroundColor: getErrorColor(lastError.errorType) }]}>
                <Ionicons name="flash" size={16} color="#fff" />
                <Text style={styles.fixButtonText}>Fix with AI</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={dismissError} style={styles.dismissButton}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Quick Commands */}
        <View style={[styles.quickCommands, { borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.quickCommandsInner}>
              {quickCommands.map((cmd, i) => (
                <TouchableOpacity key={i} onPress={() => setCommand(cmd.command)}>
                  <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={[styles.quickCommand, { borderColor: colors.border }]}>
                    <Ionicons name={cmd.icon as any} size={16} color={colors.primaryLight} />
                    <Text style={[styles.quickCommandText, { color: colors.text }]}>{cmd.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Terminal Output */}
        <View style={styles.terminalContainer}>
          <LinearGradient colors={[isDarkMode ? '#0d0d12' : '#f8fafc', colors.background]} style={styles.terminalGradient}>
            <ScrollView
              ref={scrollViewRef}
              style={styles.terminalOutput}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.terminalOutputContent}
            >
              {/* Welcome Message */}
              <View style={styles.welcomeMessage}>
                <Text style={[styles.welcomeText, { color: colors.textMuted }]}>┌───────────────────────────────────┐</Text>
                <Text style={[styles.welcomeText, { color: colors.textMuted }]}>│  <Text style={{ color: colors.primaryLight }}>AETHER</Text> Terminal v1.0            │</Text>
                <Text style={[styles.welcomeText, { color: colors.textMuted }]}>│  {activeTerminal.name.padEnd(27)}   │</Text>
                <Text style={[styles.welcomeText, { color: colors.textMuted }]}>└───────────────────────────────────┘</Text>
              </View>

              {/* Output Lines */}
              {activeTerminal.output.map((line, index) => formatOutput(line, index))}

              {/* Current Directory Indicator */}
              <View style={styles.promptLine}>
                <Text style={[styles.promptPath, { color: colors.primaryLight }]}>{currentProject?.name || '~'}</Text>
                <Text style={[styles.promptSymbol, { color: colors.success }]}> ❯ </Text>
                <Text style={[styles.promptCursor, { color: colors.text }]}>_</Text>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>

        {/* Input Area */}
        <BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputArea, { borderTopColor: colors.border }]}>
          {/* History Arrows */}
          <View style={styles.historyButtons}>
            <TouchableOpacity style={[styles.historyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleHistoryUp}>
              <Ionicons name="chevron-up" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.historyBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleHistoryDown}>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Input */}
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.inputPrompt, { color: colors.success }]}>❯</Text>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={command}
              onChangeText={setCommand}
              placeholder="Enter command..."
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleExecute}
              returnKeyType="send"
            />
          </View>

          {/* Execute Button */}
          <TouchableOpacity onPress={handleExecute} disabled={!command.trim()}>
            <LinearGradient
              colors={command.trim() ? [colors.success, '#059669'] : [colors.surfaceLight, colors.surface]}
              style={styles.executeBtn}
            >
              <Ionicons name="play" size={22} color={command.trim() ? '#fff' : colors.textMuted} />
            </LinearGradient>
          </TouchableOpacity>
        </BlurView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 10 },
  headerBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  // Terminal Tabs
  tabsContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1 },
  tabsScroll: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 50 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  tabDot: { width: 8, height: 8, borderRadius: 4 },
  tabText: { fontSize: 13, fontWeight: '600' },
  tabClose: { marginLeft: 4, padding: 2 },
  addTabBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  terminalCount: { position: 'absolute', right: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  terminalCountText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  quickCommands: { paddingVertical: 10, borderBottomWidth: 1 },
  quickCommandsInner: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  quickCommand: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  quickCommandText: { fontSize: 12, fontWeight: '600' },
  terminalContainer: { flex: 1 },
  terminalGradient: { flex: 1 },
  terminalOutput: { flex: 1 },
  terminalOutputContent: { padding: 16 },
  welcomeMessage: { marginBottom: 16 },
  welcomeText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 16 },
  outputLine: { flexDirection: 'row', marginVertical: 2 },
  outputPrefix: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  outputText: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 18, flex: 1 },
  promptLine: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  promptPath: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontWeight: '600' },
  promptSymbol: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  promptCursor: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  inputArea: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10, borderTopWidth: 1 },
  historyButtons: { flexDirection: 'column', gap: 4 },
  historyBtn: { width: 30, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  inputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, minHeight: 46 },
  inputPrompt: { fontSize: 14, fontWeight: '700', marginRight: 8 },
  input: { flex: 1, fontSize: 14, paddingVertical: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', minHeight: 44 },
  executeBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  disconnectedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  disconnectedIcon: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  disconnectedTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  disconnectedText: { fontSize: 15, textAlign: 'center' },

  // Error Banner
  errorBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, marginHorizontal: 0 },
  errorBannerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  errorIconContainer: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  errorTextContainer: { flex: 1 },
  errorType: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  errorMessage: { fontSize: 12, marginTop: 2 },
  errorBannerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fixButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  fixButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  dismissButton: { padding: 4 },
});
