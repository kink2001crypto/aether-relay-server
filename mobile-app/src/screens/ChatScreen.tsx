import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, ScrollView, Alert, Share, Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useApp } from '../hooks/useApp';
import { useTheme, useSyntaxColors } from '../theme';
import { CodeLine } from '../components/SyntaxHighlighter';
import { DiffModal } from '../components/DiffModal';

export default function ChatScreen() {
  const {
    messages, sendMessage, isLoading, isConnected,
    selectedModel, availableModels, setSelectedModel,
    applyCode, projects, currentProject, setCurrentProject,
    serverUrl, executeCommand, deleteFile, deleteFolder, clearHistory,
    undoLastChange, lastApplied, fileContent, openFile
  } = useApp();
  const { isDarkMode, colors } = useTheme();
  const syntaxColors = useSyntaxColors();
  const [input, setInput] = useState('');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [expandedCode, setExpandedCode] = useState<{ code: string, language: string } | null>(null);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [pendingCode, setPendingCode] = useState<{ code: string, language: string } | null>(null);
  const [targetFileName, setTargetFileName] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [codeBlockActions, setCodeBlockActions] = useState<Record<string, 'applied' | 'refused'>>({});
  const [isListening, setIsListening] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [diffData, setDiffData] = useState<{ filePath: string; oldContent: string | null; newContent: string } | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
      Keyboard.dismiss();
    }
  };

  const handleVoiceInput = async () => {
    // Pour l'instant, on affiche un message - la vraie implémentation nécessite expo-speech ou react-native-voice
    Alert.alert(
      '🎤 Commande Vocale',
      'Pour activer la reconnaissance vocale, installe:\n\nnpx expo install expo-speech\n\nOu utilise le clavier vocal de ton téléphone (icône micro sur le clavier iOS/Android)',
      [{ text: 'OK' }]
    );
  };

  const handleApplyCode = (code: string, language: string) => {
    if (!currentProject) {
      Alert.alert('⚠️ No Project', 'Select a project first to save code');
      return;
    }

    // Try to extract filename from code comments
    // Patterns: // filename.ts, # filename.py, /* filename */, <!-- filename -->
    const lines = code.split('\n');
    let extractedFilename: string | null = null;

    for (const line of lines.slice(0, 5)) { // Check first 5 lines only
      // Match: // path/file.ext or # path/file.py or /* path/file */
      const match = line.match(/^(?:\/\/|#|\/\*|\<\!--)\s*([^\s*\->]+\.[a-zA-Z]+)/);
      if (match) {
        extractedFilename = match[1];
        break;
      }
      // Match: File: path/file.ext
      const fileMatch = line.match(/(?:File|Path):\s*([^\s]+\.[a-zA-Z]+)/i);
      if (fileMatch) {
        extractedFilename = fileMatch[1];
        break;
      }
    }

    if (extractedFilename) {
      // Use extracted filename - this will UPDATE existing file
      applyCode(code, extractedFilename);
      Alert.alert('✅ Applied', `Updated: ${extractedFilename}`);
    } else {
      // No filename found - create new file with timestamp
      const extensions: Record<string, string> = {
        typescript: '.ts', tsx: '.tsx', javascript: '.js', jsx: '.jsx',
        python: '.py', json: '.json', html: '.html', css: '.css',
        bash: '.sh', shell: '.sh', sh: '.sh',
      };
      const ext = extensions[language.toLowerCase()] || '.txt';
      const timestamp = Date.now().toString().slice(-6);
      const filename = `code_${timestamp}${ext}`;
      applyCode(code, filename);
      Alert.alert('📁 Created', `New file: ${filename}`);
    }
  };

  // Apply all code blocks from a message at once
  const handleApplyAllCode = (codeBlocks: { code: string; language: string }[]) => {
    if (!currentProject) {
      Alert.alert('⚠️ No Project', 'Select a project first');
      return;
    }

    // Extract filenames from each block
    const filesToApply: { filename: string; code: string }[] = [];

    for (const block of codeBlocks) {
      // Skip non-code blocks (terminal, delete, git)
      if (['bash', 'shell', 'sh', 'terminal', 'delete', 'git'].includes(block.language.toLowerCase())) {
        continue;
      }

      // Extract filename from first line comment
      const lines = block.code.split('\n');
      let filename: string | null = null;

      for (const line of lines.slice(0, 3)) {
        const match = line.match(/^(?:\/\/|#|\/\*|<!--)\s*([^\s*\->]+\.[a-zA-Z]+)/);
        if (match) {
          filename = match[1];
          break;
        }
      }

      if (filename) {
        filesToApply.push({ filename, code: block.code });
      }
    }

    if (filesToApply.length === 0) {
      Alert.alert('⚠️ No Files', 'No code blocks with valid filenames found');
      return;
    }

    // Show confirmation with file list
    const fileList = filesToApply.map(f => `• ${f.filename}`).join('\n');
    Alert.alert(
      `📦 Apply ${filesToApply.length} Files?`,
      `The following files will be modified:\n\n${fileList}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply All',
          onPress: () => {
            filesToApply.forEach(({ filename, code }) => {
              applyCode(code, filename);
            });
            Alert.alert('✅ Applied!', `${filesToApply.length} files updated`);
          }
        }
      ]
    );
  };

  // Preview diff before applying
  const handlePreview = async (code: string, language: string) => {
    if (!currentProject) {
      Alert.alert('⚠️ No Project', 'Select a project first');
      return;
    }

    // Generate filename
    const extensions: Record<string, string> = {
      typescript: '.ts', tsx: '.tsx', javascript: '.js', jsx: '.jsx',
      python: '.py', json: '.json', html: '.html', css: '.css',
    };
    const ext = extensions[language.toLowerCase()] || '.txt';
    const timestamp = Date.now().toString().slice(-6);
    const filename = `code_${timestamp}${ext}`;

    // For now, show diff as new file (we'd need to fetch existing content for real diff)
    // In a real implementation, we'd fetch the file content first
    setDiffData({
      filePath: filename,
      oldContent: null, // New file
      newContent: code,
    });
    setShowDiffModal(true);
  };

  const handleDiffApply = () => {
    if (diffData) {
      applyCode(diffData.newContent, diffData.filePath);
      setShowDiffModal(false);
      setDiffData(null);
    }
  };

  const handleDiffCancel = () => {
    setShowDiffModal(false);
    setDiffData(null);
  };

  const confirmApplyCode = () => {
    if (pendingCode && targetFileName.trim()) {
      applyCode(pendingCode.code, targetFileName.trim());
      Alert.alert('✓ Code Applied', `Saved to: ${targetFileName}`);
      setShowFilePicker(false);
      setPendingCode(null);
      setTargetFileName('');
    }
  };

  const handleRunCommand = (command: string) => {
    if (!currentProject) {
      Alert.alert('Error', 'Select a project first');
      return;
    }
    // Show confirmation dialog before running
    Alert.alert(
      '🖥️ Run Command?',
      command.trim(),
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run',
          style: 'default',
          onPress: () => {
            executeCommand(command.trim());
            Alert.alert('✅ Executing...', 'Command sent to terminal');
          }
        }
      ]
    );
  };

  // Handle delete block - parse paths and delete with confirmation
  const handleDelete = (content: string) => {
    if (!currentProject) {
      Alert.alert('Error', 'Select a project first');
      return;
    }

    // Parse paths from delete block (one per line)
    const paths = content.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#')); // Filter empty and comments

    if (paths.length === 0) {
      Alert.alert('Error', 'No valid paths to delete');
      return;
    }

    Alert.alert(
      '🗑️ Delete Files?',
      `Are you sure you want to delete:\n\n${paths.join('\n')}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            paths.forEach(filePath => {
              // Detect if it's a folder (ends with /)
              if (filePath.endsWith('/')) {
                deleteFolder(filePath.slice(0, -1));
              } else {
                deleteFile(filePath);
              }
            });
            Alert.alert('✅ Deleted', `${paths.length} item(s) deleted`);
          }
        }
      ]
    );
  };

  // Detect if code block is a terminal command
  const isTerminalCommand = (lang: string): boolean => {
    const terminalLangs = ['bash', 'shell', 'sh', 'zsh', 'terminal', 'console', 'cmd', 'powershell'];
    return terminalLangs.includes(lang.toLowerCase());
  };

  // Detect if code block is a delete command
  const isDeleteBlock = (lang: string): boolean => {
    return lang.toLowerCase() === 'delete';
  };

  const getLanguageColor = (lang: string): [string, string] => {
    const langColors: Record<string, [string, string]> = {
      typescript: ['#3178c6', '#225eab'], tsx: ['#3178c6', '#225eab'], ts: ['#3178c6', '#225eab'],
      javascript: ['#f7df1e', '#d4c516'], jsx: ['#f7df1e', '#d4c516'], js: ['#f7df1e', '#d4c516'],
      python: ['#3776ab', '#2d5f8a'], py: ['#3776ab', '#2d5f8a'],
      json: ['#6366f1', '#4f46e5'], html: ['#e34c26', '#c43d1e'], css: ['#264de4', '#1e3eb3'],
      // Terminal commands - orange for visibility
      bash: ['#f97316', '#ea580c'], shell: ['#f97316', '#ea580c'], sh: ['#f97316', '#ea580c'],
      zsh: ['#f97316', '#ea580c'], terminal: ['#f97316', '#ea580c'], console: ['#f97316', '#ea580c'],
      // Delete blocks - red for danger
      delete: ['#dc2626', '#b91c1c'],
    };
    return langColors[lang.toLowerCase()] || [colors.primary, colors.primaryDark];
  };

  const styles = createStyles(colors);

  const renderCodeBlock = (block: any, index: number) => {
    const langColors = getLanguageColor(block.language);
    const key = `${index}-${block.code.slice(0, 20)}`;
    const lines = block.code.split('\n');
    const isTerminal = isTerminalCommand(block.language);
    const isDelete = isDeleteBlock(block.language);

    // Determine border color and width
    const borderColor = isDelete ? '#dc2626' : isTerminal ? '#f97316' : colors.border;
    const borderWidth = isDelete || isTerminal ? 2 : 1;

    // Determine icon and label
    const iconName = isDelete ? 'trash' : isTerminal ? 'terminal' : 'code-slash';
    const labelText = isDelete ? '🗑️ DELETE' : isTerminal ? '⚡ TERMINAL' : block.language.toUpperCase();

    return (
      <View key={index} style={[styles.codeBlock, { backgroundColor: colors.background, borderColor, borderWidth }]}>
        <View style={[styles.codeHeader, { backgroundColor: colors.surface }]}>
          <LinearGradient colors={langColors} style={styles.langBadge}>
            <Ionicons name={iconName as any} size={12} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.langText}>{labelText}</Text>
          </LinearGradient>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeActionBtn} onPress={() => setExpandedCode(block)}>
              <Ionicons name="expand" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            {!codeBlockActions[key] ? (
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                {/* Refuse button */}
                <TouchableOpacity
                  onPress={() => {
                    setCodeBlockActions(prev => ({ ...prev, [key]: 'refused' }));
                    Alert.alert('❌ Refused', 'Declined');
                  }}
                  style={[styles.actionBtn, { backgroundColor: colors.error }]}
                >
                  <Ionicons name="close" size={14} color="#fff" />
                </TouchableOpacity>
                {/* Copy button */}
                <TouchableOpacity
                  onPress={() => {
                    Share.share({ message: block.code });
                    Alert.alert('📋 Copied!', 'Copied to clipboard');
                  }}
                  style={[styles.actionBtn, { backgroundColor: colors.textMuted }]}
                >
                  <Ionicons name="copy" size={14} color="#fff" />
                </TouchableOpacity>
                {/* Delete: Show DELETE button */}
                {isDelete ? (
                  <TouchableOpacity
                    onPress={() => {
                      setCodeBlockActions(prev => ({ ...prev, [key]: 'applied' }));
                      handleDelete(block.code);
                    }}
                    style={[styles.actionBtn, { backgroundColor: '#dc2626', paddingHorizontal: 8 }]}
                  >
                    <Ionicons name="trash" size={12} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 2 }}>Del</Text>
                  </TouchableOpacity>
                ) : isTerminal ? (
                  /* Terminal: Show RUN button */
                  <TouchableOpacity
                    onPress={() => {
                      setCodeBlockActions(prev => ({ ...prev, [key]: 'applied' }));
                      handleRunCommand(block.code);
                    }}
                    style={[styles.actionBtn, { backgroundColor: '#f97316', paddingHorizontal: 8 }]}
                  >
                    <Ionicons name="play" size={12} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 2 }}>Run</Text>
                  </TouchableOpacity>
                ) : (
                  /* Code File: Show Preview and SAVE buttons */
                  <>
                    <TouchableOpacity
                      onPress={() => handlePreview(block.code, block.language)}
                      style={[styles.actionBtn, { backgroundColor: colors.primary, paddingHorizontal: 6 }]}
                    >
                      <Ionicons name="eye" size={12} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setCodeBlockActions(prev => ({ ...prev, [key]: 'applied' }));
                        handleApplyCode(block.code, block.language);
                      }}
                      style={[styles.actionBtn, { backgroundColor: colors.success, paddingHorizontal: 8 }]}
                    >
                      <Ionicons name="save" size={12} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 2 }}>Save</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                <View style={[styles.applyBtn, { backgroundColor: codeBlockActions[key] === 'applied' ? colors.success : colors.error }]}>
                  <Ionicons name={codeBlockActions[key] === 'applied' ? 'checkmark-circle' : 'close-circle'} size={14} color="#fff" />
                  <Text style={[styles.applyBtnText, { fontSize: 11 }]}>{codeBlockActions[key] === 'applied' ? '✓' : '✗'}</Text>
                </View>
                {codeBlockActions[key] === 'applied' && lastApplied && (Date.now() - lastApplied.timestamp < 60000) && (
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert(
                        '↩️ Undo?',
                        `Revert changes to ${lastApplied.path}?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Undo', style: 'destructive', onPress: undoLastChange }
                        ]
                      );
                    }}
                    style={[styles.actionBtn, { backgroundColor: colors.warning || '#f59e0b', paddingHorizontal: 6 }]}
                  >
                    <Ionicons name="arrow-undo" size={12} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.codeContent}>
            {lines.slice(0, 10).map((line: string, i: number) => (
              <CodeLine key={i} line={line} lineNumber={i + 1} language={block.language} fontSize={11} />
            ))}
            {lines.length > 10 && (
              <TouchableOpacity style={styles.showMoreBtn} onPress={() => setExpandedCode(block)}>
                <Text style={[styles.showMoreText, { color: colors.primary }]}>+ {lines.length - 10} more lines</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && (
          <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.avatar}>
            <Ionicons name="sparkles" size={18} color="#fff" />
          </LinearGradient>
        )}
        <View style={[styles.messageContent, isUser && styles.userMessageContent]}>
          {isUser ? (
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.userMessageBg}>
              <Text style={styles.userText}>{item.content}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.assistantMessageBg, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.assistantText, { color: colors.text }]}>{item.content}</Text>
              {item.codeBlocks?.map((block: any, index: number) => renderCodeBlock(block, index))}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyChat = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.logoContainer}>
        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.logo}>
          <Ionicons name="flash" size={56} color="#fff" />
        </LinearGradient>
      </LinearGradient>
      <Text style={[styles.welcomeTitle, { color: colors.text }]}>AETHER AI</Text>
      <Text style={[styles.welcomeSubtitle, { color: colors.textMuted }]}>Your intelligent coding companion</Text>
      {currentProject && (
        <View style={styles.contextBadge}>
          <LinearGradient colors={[colors.success + '30', colors.success + '10']} style={styles.contextGradient}>
            <Ionicons name="folder" size={16} color={colors.success} />
            <Text style={[styles.contextText, { color: colors.success }]}>{currentProject.name}</Text>
          </LinearGradient>
        </View>
      )}
      <View style={styles.suggestionsContainer}>
        {['Analyze code', 'Find bugs', 'Explain', 'Optimize'].map((suggestion, i) => (
          <TouchableOpacity key={i} onPress={() => setInput(suggestion)}>
            <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={[styles.suggestionChip, { borderColor: colors.border }]}>
              <Text style={[styles.suggestionText, { color: colors.primaryLight }]}>{suggestion}</Text>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );


  return (
    <LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusDot, isConnected ? { backgroundColor: colors.success } : { backgroundColor: colors.error }]} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>AETHER</Text>
          </View>
          <View style={styles.headerRight}>
            {messages.length > 0 && (
              <TouchableOpacity
                style={[styles.clearBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => {
                  Alert.alert(
                    '🗑️ Clear History?',
                    'This will delete all messages for this project.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Clear', style: 'destructive', onPress: clearHistory }
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.projectBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowProjectPicker(true)}>
              <Ionicons name="folder" size={16} color={currentProject ? colors.success : colors.textMuted} />
              <Text style={[styles.projectBtnText, { color: colors.textSecondary }]} numberOfLines={1}>{currentProject?.name || 'Project'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowModelPicker(!showModelPicker)}>
              <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={[styles.modelBtn, { borderColor: colors.border }]}>
                <Ionicons name="cube-outline" size={16} color={colors.primaryLight} />
                <Text style={[styles.modelBtnText, { color: colors.primaryLight }]}>{selectedModel}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Model Picker */}
        {showModelPicker && (
          <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={[styles.modelPicker, { borderBottomColor: colors.border }]}>
            {availableModels.map((model) => (
              <TouchableOpacity
                key={model}
                style={[styles.modelOption, selectedModel === model && { backgroundColor: colors.primary + '20' }]}
                onPress={() => { setSelectedModel(model); setShowModelPicker(false); }}
              >
                <Ionicons name={model === 'gemini' ? 'sparkles' : model === 'ollama' ? 'hardware-chip' : 'cube'} size={20} color={selectedModel === model ? colors.primary : colors.textMuted} />
                <Text style={[styles.modelOptionText, { color: selectedModel === model ? colors.text : colors.textSecondary }]}>
                  {model.charAt(0).toUpperCase() + model.slice(1)}
                </Text>
                {selectedModel === model && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </BlurView>
        )}

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.messageListContent}
          ListEmptyComponent={renderEmptyChat}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
        />

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Thinking...</Text>
          </View>
        )}

        {/* Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputContainer, { borderTopColor: colors.border }]}>
            <TouchableOpacity onPress={handleVoiceInput} style={styles.voiceBtn}>
              <Ionicons name="mic" size={22} color={isListening ? colors.error : colors.textMuted} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={input}
              onChangeText={setInput}
              placeholder={currentProject ? `Ask about ${currentProject.name}...` : "Ask anything..."}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={4000}
            />
            <TouchableOpacity onPress={handleSend} disabled={!input.trim() || isLoading}>
              <LinearGradient
                colors={input.trim() && !isLoading ? [colors.primary, colors.primaryDark] : [colors.surfaceLight, colors.surface]}
                style={styles.sendBtn}
              >
                <Ionicons name="arrow-up" size={22} color={input.trim() && !isLoading ? '#fff' : colors.textMuted} />
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </KeyboardAvoidingView>

        {/* Project Picker Modal */}
        <Modal visible={showProjectPicker} animationType="slide" transparent>
          <BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.modalGradient}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <View style={[styles.modalHandle, { backgroundColor: colors.textMuted }]} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Project Context</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Select a project for AI analysis</Text>
                  <TouchableOpacity style={styles.createProjectButton} onPress={() => { setShowProjectPicker(false); setShowCreateProject(true); }}>
                    <LinearGradient colors={[colors.success, '#059669']} style={styles.createProjectGradient}>
                      <Ionicons name="add" size={20} color="#fff" />
                      <Text style={styles.createProjectText}>New Project</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.projectList}>
                  <TouchableOpacity
                    style={[styles.projectItem, { backgroundColor: colors.background, borderColor: !currentProject ? colors.primary : colors.border }]}
                    onPress={() => { setCurrentProject(null as any); setShowProjectPicker(false); }}
                  >
                    <View style={[styles.projectItemIcon, { backgroundColor: colors.surface }]}>
                      <Ionicons name="globe" size={24} color={colors.textMuted} />
                    </View>
                    <View style={styles.projectItemInfo}>
                      <Text style={[styles.projectItemName, { color: colors.text }]}>No project</Text>
                      <Text style={[styles.projectItemPath, { color: colors.textMuted }]}>General questions</Text>
                    </View>
                  </TouchableOpacity>
                  {projects.map((project) => (
                    <TouchableOpacity
                      key={project.path}
                      style={[styles.projectItem, { backgroundColor: colors.background, borderColor: currentProject?.path === project.path ? colors.primary : colors.border }]}
                      onPress={() => { setCurrentProject(project); setShowProjectPicker(false); }}
                    >
                      <LinearGradient colors={currentProject?.path === project.path ? [colors.primary, colors.primaryDark] : ['#f59e0b', '#d97706']} style={styles.projectItemGradient}>
                        <Ionicons name="folder" size={24} color="#fff" />
                      </LinearGradient>
                      <View style={styles.projectItemInfo}>
                        <Text style={[styles.projectItemName, { color: currentProject?.path === project.path ? colors.primaryLight : colors.text }]}>{project.name}</Text>
                        <Text style={[styles.projectItemPath, { color: colors.textMuted }]}>{project.folder}</Text>
                      </View>
                      {currentProject?.path === project.path && (
                        <View style={[styles.checkmarkBadge, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.primary }]} onPress={() => setShowProjectPicker(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </BlurView>
        </Modal>

        {/* Create New Project Modal */}
        <Modal visible={showCreateProject} animationType="slide" transparent>
          <BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.modalGradient}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <View style={[styles.modalHandle, { backgroundColor: colors.textMuted }]} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Project</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Enter project details</Text>
                </View>
                <View style={styles.filePickerContent}>
                  <Text style={[styles.createProjectLabel, { color: colors.textSecondary }]}>Project Name</Text>
                  <TextInput
                    style={[styles.createProjectInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    placeholder="my-awesome-project"
                    placeholderTextColor={colors.textMuted}
                    value={newProjectName}
                    onChangeText={setNewProjectName}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <View style={styles.createProjectButtons}>
                    <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => { setShowCreateProject(false); setNewProjectName(''); }}>
                      <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        if (!newProjectName.trim()) { Alert.alert('Error', 'Please enter a project name'); return; }
                        try {
                          const response = await fetch(`${serverUrl}/api/projects/create`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ name: newProjectName.trim() }),
                          });
                          const data = await response.json();
                          if (data.success) {
                            Alert.alert('Success', `Project "${newProjectName}" created!`);
                            setShowCreateProject(false); setNewProjectName('');
                          } else { Alert.alert('Error', data.error || 'Failed to create project'); }
                        } catch (error) { Alert.alert('Error', 'Failed to connect to server'); }
                      }}
                    >
                      <LinearGradient colors={[colors.success, '#059669']} style={styles.confirmButton}>
                        <Ionicons name="add-circle" size={20} color="#fff" />
                        <Text style={styles.confirmButtonText}>Create</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </View>
          </BlurView>
        </Modal>

        {/* Expanded Code Modal */}
        <Modal visible={!!expandedCode} animationType="slide">
          <LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.codeModalContainer}>
            <SafeAreaView style={styles.codeModalContainer} edges={['top', 'bottom']}>
              <View style={[styles.codeModalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <LinearGradient colors={getLanguageColor(expandedCode?.language || '')} style={styles.codeModalLangBadge}>
                  <Text style={styles.codeModalLangText}>{expandedCode?.language.toUpperCase()}</Text>
                </LinearGradient>
                <View style={styles.codeModalActions}>
                  <TouchableOpacity onPress={() => { if (expandedCode) handleApplyCode(expandedCode.code, expandedCode.language); setExpandedCode(null); }}>
                    <LinearGradient colors={[colors.success, '#059669']} style={styles.applyBtnLarge}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.applyBtnText}>Apply</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setExpandedCode(null)} style={styles.closeModalBtn}>
                    <Ionicons name="close" size={26} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </View>
              <ScrollView style={styles.codeModalContent} horizontal>
                <ScrollView>
                  <View style={styles.codeModalCode}>
                    {expandedCode?.code.split('\n').map((line, i) => (
                      <CodeLine key={i} line={line} lineNumber={i + 1} language={expandedCode.language} fontSize={13} />
                    ))}
                  </View>
                </ScrollView>
              </ScrollView>
            </SafeAreaView>
          </LinearGradient>
        </Modal>

        {/* Diff Modal */}
        {diffData && (
          <DiffModal
            visible={showDiffModal}
            filePath={diffData.filePath}
            oldContent={diffData.oldContent}
            newContent={diffData.newContent}
            onApply={handleDiffApply}
            onCancel={handleDiffCancel}
          />
        )}

        {/* File Picker Modal */}
        <Modal visible={showFilePicker} animationType="slide" transparent>
          <BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.modalGradient}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <View style={[styles.modalHandle, { backgroundColor: colors.textMuted }]} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Save Code To File</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>{currentProject ? `In: ${currentProject.name}` : 'Enter file path'}</Text>
                </View>
                <View style={styles.filePickerContent}>
                  <Text style={[styles.filePickerLabel, { color: colors.textSecondary }]}>File Name / Path:</Text>
                  <TextInput
                    style={[styles.fileNameInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    value={targetFileName}
                    onChangeText={setTargetFileName}
                    placeholder="e.g. src/utils/helper.ts"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {pendingCode && (
                    <View style={[styles.codePreview, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[styles.codePreviewLabel, { color: colors.textMuted }]}>Code Preview ({pendingCode.language}):</Text>
                      <Text style={[styles.codePreviewText, { color: colors.textSecondary }]} numberOfLines={5}>{pendingCode.code.substring(0, 200)}...</Text>
                    </View>
                  )}
                </View>
                <View style={styles.filePickerButtons}>
                  <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => { setShowFilePicker(false); setPendingCode(null); }}>
                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={confirmApplyCode}>
                    <LinearGradient colors={[colors.success, '#059669']} style={styles.confirmButton}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                      <Text style={styles.confirmButtonText}>Apply Code</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </BlurView>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}


const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 1.5 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  projectBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, maxWidth: 100, borderWidth: 1 },
  clearBtn: { padding: 8, borderRadius: 10, borderWidth: 1 },
  projectBtnText: { fontSize: 12, fontWeight: '600' },
  modelBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  modelBtnText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  modelPicker: { borderBottomWidth: 1, paddingVertical: 8 },
  modelOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  modelOptionText: { flex: 1, fontSize: 15, fontWeight: '500' },
  messageList: { flex: 1 },
  messageListContent: { padding: 16, gap: 16 },
  emptyList: { flex: 1 },
  messageBubble: { flexDirection: 'row', gap: 12 },
  userBubble: { justifyContent: 'flex-end' },
  assistantBubble: { justifyContent: 'flex-start' },
  avatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  messageContent: { maxWidth: '85%' },
  userMessageContent: { alignItems: 'flex-end' },
  userMessageBg: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderBottomRightRadius: 4 },
  userText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  assistantMessageBg: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderBottomLeftRadius: 4, borderWidth: 1 },
  assistantText: { fontSize: 15, lineHeight: 22 },
  codeBlock: { borderRadius: 14, marginTop: 12, overflow: 'hidden', borderWidth: 1 },
  codeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  langBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  langText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  codeActions: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', maxWidth: 200 },
  codeActionBtn: { padding: 6 },
  applyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 28, borderRadius: 14, paddingHorizontal: 6 },
  applyBtnLarge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 14 },
  applyBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  codeContent: { padding: 12 },
  showMoreBtn: { paddingVertical: 8, alignItems: 'center' },
  showMoreText: { fontSize: 12, fontWeight: '600' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logoContainer: { width: 120, height: 120, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logo: { width: 100, height: 100, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  welcomeTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 2, marginBottom: 6 },
  welcomeSubtitle: { fontSize: 15, marginBottom: 24 },
  contextBadge: { marginBottom: 24 },
  contextGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  contextText: { fontSize: 14, fontWeight: '600' },
  suggestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  suggestionChip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, borderWidth: 1 },
  suggestionText: { fontSize: 14, fontWeight: '600' },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 10 },
  loadingText: { fontSize: 14, fontWeight: '500' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 14, gap: 10, borderTopWidth: 1 },
  voiceBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 14, fontSize: 15, maxHeight: 120, borderWidth: 1 },
  sendBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { maxHeight: '75%' },
  modalGradient: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 30 },
  modalHeader: { alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1 },
  modalHandle: { width: 40, height: 5, borderRadius: 3, marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700' },
  modalSubtitle: { fontSize: 14, marginTop: 4 },
  projectList: { padding: 12, maxHeight: 400 },
  projectItem: { flexDirection: 'row', alignItems: 'center', padding: 14, marginVertical: 4, borderRadius: 16, gap: 14, borderWidth: 1 },
  projectItemIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  projectItemGradient: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  projectItemInfo: { flex: 1 },
  projectItemName: { fontSize: 16, fontWeight: '600' },
  projectItemPath: { fontSize: 12, marginTop: 3 },
  checkmarkBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  closeButton: { alignSelf: 'center', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 12 },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  codeModalContainer: { flex: 1 },
  codeModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  codeModalLangBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  codeModalLangText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  codeModalActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  closeModalBtn: { padding: 6 },
  codeModalContent: { flex: 1 },
  codeModalCode: { padding: 16 },
  filePickerContent: { padding: 20 },
  filePickerLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  fileNameInput: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, borderWidth: 1, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  codePreview: { marginTop: 20, borderRadius: 12, padding: 14, borderWidth: 1 },
  codePreviewLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  codePreviewText: { fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 16 },
  filePickerButtons: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  confirmButton: { flex: 1, flexDirection: 'row', gap: 8, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  createProjectButton: { marginTop: 16 },
  createProjectGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14 },
  createProjectText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  createProjectInput: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, borderWidth: 1, marginTop: 8 },
  createProjectLabel: { fontSize: 14, fontWeight: '600', marginTop: 16 },
  createProjectButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
});
