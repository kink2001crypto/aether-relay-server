import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useApp } from '../hooks/useApp';
import { useTheme } from '../theme';
import { CodeLine } from '../components/SyntaxHighlighter';
import GitPanel from '../components/GitPanel';

const MAX_LINES_DISPLAY = 300;
const LOAD_MORE_INCREMENT = 200;

export default function FilesScreen() {
  const { files, currentPath, navigateToPath, isConnected, projects, currentProject, setCurrentProject, fileContent, openFile, saveFile, gitStatus, refreshGitStatus, gitCommit, gitPush, lintProject, lintErrors } = useApp();
  const { isDarkMode, colors } = useTheme();
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [editedContent, setEditedContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayedLines, setDisplayedLines] = useState(MAX_LINES_DISPLAY);

  const handleItemPress = useCallback((item: any) => {
    try {
      setError(null);
      if (item.type === 'directory') {
        setIsLoading(true);
        navigateToPath(item.path);
        setTimeout(() => setIsLoading(false), 500);
      } else {
        setDisplayedLines(MAX_LINES_DISPLAY);
        setSelectedFile(item);
        openFile(item.path);
        setIsEditing(false);
      }
    } catch (err: any) {
      setError(err.message || 'Error opening item');
      setIsLoading(false);
    }
  }, [navigateToPath, openFile]);

  const handleGoBack = useCallback(() => {
    try {
      if (currentPath && currentPath !== '/') {
        const parts = currentPath.split('/').filter(Boolean);
        parts.pop();
        const newPath = '/' + parts.join('/');
        setIsLoading(true);
        navigateToPath(newPath || '/');
        setTimeout(() => setIsLoading(false), 500);
      }
    } catch (err: any) {
      setError(err.message || 'Error navigating back');
      setIsLoading(false);
    }
  }, [currentPath, navigateToPath]);

  const handleSaveFile = () => {
    if (selectedFile && editedContent !== fileContent) {
      saveFile(selectedFile.path, editedContent);
      Alert.alert('✓ Saved', `${selectedFile.name} has been saved`);
      setIsEditing(false);
    }
  };

  const handleStartEdit = () => {
    setEditedContent(fileContent || '');
    setIsEditing(true);
  };

  const handleCloseEditor = () => {
    if (isEditing && editedContent !== fileContent) {
      Alert.alert('Unsaved Changes', 'Discard changes?', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => { setSelectedFile(null); setIsEditing(false); } }
      ]);
    } else {
      setSelectedFile(null);
      setIsEditing(false);
    }
  };

  const handleLoadMore = () => setDisplayedLines(prev => prev + LOAD_MORE_INCREMENT);

  const getFileIcon = (name: string, type: string): keyof typeof Ionicons.glyphMap => {
    if (type === 'directory') return 'folder';
    const ext = name?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts': case 'tsx': return 'logo-javascript';
      case 'js': case 'jsx': return 'logo-javascript';
      case 'json': return 'code-slash';
      case 'md': return 'document-text';
      case 'css': case 'scss': return 'color-palette';
      case 'html': return 'globe';
      case 'png': case 'jpg': case 'gif': case 'svg': return 'image';
      case 'py': return 'logo-python';
      default: return 'document';
    }
  };

  const getFileGradient = (name: string, type: string): [string, string] => {
    if (type === 'directory') return ['#f59e0b', '#d97706'];
    const ext = name?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts': case 'tsx': return ['#3b82f6', '#1d4ed8'];
      case 'js': case 'jsx': return ['#eab308', '#ca8a04'];
      case 'json': return ['#22c55e', '#16a34a'];
      case 'css': case 'scss': return ['#ec4899', '#db2777'];
      case 'py': return ['#3b82f6', '#2563eb'];
      case 'html': return ['#ef4444', '#dc2626'];
      default: return ['#6b7280', '#4b5563'];
    }
  };

  const getLanguage = (filename: string): string => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts': case 'tsx': return 'typescript';
      case 'js': case 'jsx': return 'javascript';
      case 'py': return 'python';
      case 'json': return 'json';
      case 'css': case 'scss': return 'css';
      case 'html': return 'html';
      case 'md': return 'markdown';
      default: return 'text';
    }
  };

  const { visibleLines, totalLines, hasMore } = useMemo(() => {
    const content = fileContent || '';
    const all = content.split('\n');
    const total = all.length;
    const visible = all.slice(0, displayedLines);
    return { visibleLines: visible, totalLines: total, hasMore: displayedLines < total };
  }, [fileContent, displayedLines]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.fileItem} onPress={() => handleItemPress(item)} activeOpacity={0.7}>
      <LinearGradient colors={getFileGradient(item.name, item.type)} style={styles.fileIconGradient}>
        <Ionicons name={getFileIcon(item.name, item.type)} size={22} color="#fff" />
      </LinearGradient>
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.fileType, { color: colors.textMuted }]}>{item.type === 'directory' ? 'Folder' : (item.name?.split('.').pop()?.toUpperCase() || 'File')}</Text>
      </View>
      {item.type === 'directory' && (
        <View style={[styles.chevronContainer, { backgroundColor: colors.surfaceLight }]}>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      )}
    </TouchableOpacity>
  );

  const styles = createStyles(colors);
  const language = selectedFile ? getLanguage(selectedFile.name) : 'text';
  const content = isEditing ? editedContent : (fileContent || '');
  const charCount = content.length;

  if (!isConnected) {
    return (
      <LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.container}>
        <SafeAreaView style={styles.container} edges={['bottom']}>
          <View style={styles.disconnectedContainer}>
            <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.disconnectedIcon}>
              <Ionicons name="cloud-offline" size={48} color={colors.textMuted} />
            </LinearGradient>
            <Text style={[styles.disconnectedTitle, { color: colors.text }]}>Not Connected</Text>
            <Text style={[styles.disconnectedText, { color: colors.textMuted }]}>Go to Settings to connect to your server</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.container}>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={[styles.projectSelector, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowProjectPicker(true)} activeOpacity={0.8}>
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.projectIconGradient}>
              <Ionicons name="folder-open" size={22} color="#fff" />
            </LinearGradient>
            <View style={styles.projectInfo}>
              <Text style={[styles.projectLabel, { color: colors.textMuted }]}>PROJECT</Text>
              <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>{currentProject?.name || 'Select Project'}</Text>
            </View>
            <View style={[styles.dropdownIcon, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Navigation Bar */}
        {currentPath !== '/' && (
          <View style={styles.navBar}>
            <TouchableOpacity onPress={handleGoBack} style={[styles.navButton, { backgroundColor: colors.primary }]} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigateToPath('/')} style={[styles.navButtonSecondary, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
              <Ionicons name="home" size={18} color={colors.primary} />
            </TouchableOpacity>
            <View style={[styles.pathBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.pathText, { color: colors.textSecondary }]} numberOfLines={1}>
                {currentPath.split('/').pop() || '/'}
              </Text>
            </View>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.error + '20', borderColor: colors.error + '40' }]}>
            <Ionicons name="warning" size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Loading */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}

        {/* Git Panel */}
        <GitPanel
          gitStatus={gitStatus}
          onRefresh={refreshGitStatus}
          onCommit={gitCommit}
          onPush={gitPush}
        />

        {/* Lint Button */}
        {currentProject && (
          <View style={styles.lintContainer}>
            <TouchableOpacity
              onPress={lintProject}
              style={[styles.lintButton, { backgroundColor: colors.surface, borderColor: lintErrors.length > 0 ? colors.error : colors.border }]}
              activeOpacity={0.7}
            >
              <LinearGradient colors={lintErrors.length > 0 ? ['#ef4444', '#dc2626'] : [colors.primary, colors.primaryDark]} style={styles.lintIconGradient}>
                <Ionicons name="bug-outline" size={20} color="#fff" />
              </LinearGradient>
              <View style={styles.lintInfo}>
                <Text style={[styles.lintTitle, { color: colors.text }]}>Lint Check</Text>
                <Text style={[styles.lintSubtitle, { color: colors.textMuted }]}>
                  {lintErrors.length > 0 ? `${lintErrors.length} errors found` : 'Run ESLint / TSC'}
                </Text>
              </View>
              {lintErrors.length > 0 && (
                <View style={[styles.lintBadge, { backgroundColor: colors.error }]}>
                  <Text style={styles.lintBadgeText}>{lintErrors.length}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* File List */}
        <FlatList
          data={files || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.path || item.name}
          style={styles.fileList}
          contentContainerStyle={styles.fileListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.emptyIcon}>
                <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} />
              </LinearGradient>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No files</Text>
              <Text style={[styles.emptyHint, { color: colors.textMuted }]}>Select a project to get started</Text>
            </View>
          }
        />

        {/* Bottom Nav */}
        {currentPath !== '/' && (
          <BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={[styles.bottomNav, { borderTopColor: colors.border }]}>
            <TouchableOpacity onPress={handleGoBack} style={styles.bottomNavButton} activeOpacity={0.8}>
              <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.bottomNavButtonGradient}>
                <Ionicons name="arrow-back" size={22} color="#fff" />
                <Text style={styles.bottomNavText}>Back</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigateToPath('/')} style={[styles.bottomNavButtonOutline, { backgroundColor: colors.surface, borderColor: colors.primary }]} activeOpacity={0.7}>
              <Ionicons name="home" size={20} color={colors.primary} />
              <Text style={[styles.bottomNavTextOutline, { color: colors.primary }]}>Home</Text>
            </TouchableOpacity>
          </BlurView>
        )}

        {/* Project Picker Modal */}
        <Modal visible={showProjectPicker} animationType="slide" transparent>
          <BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={[styles.modalGradient, { borderColor: colors.border }]}>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <View style={[styles.modalHandle, { backgroundColor: colors.textMuted }]} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Select Project</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>{projects?.length || 0} projects available</Text>
                </View>
                <FlatList
                  data={projects || []}
                  keyExtractor={(p) => p.path}
                  style={styles.projectList}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item: project }) => (
                    <TouchableOpacity
                      style={[
                        styles.projectItem,
                        { backgroundColor: colors.background, borderColor: colors.border },
                        currentProject?.path === project.path && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                      ]}
                      onPress={() => { setCurrentProject(project); setShowProjectPicker(false); }}
                      activeOpacity={0.7}
                    >
                      <LinearGradient
                        colors={currentProject?.path === project.path ? [colors.primary, colors.primaryDark] : ['#f59e0b', '#d97706']}
                        style={styles.projectItemGradient}
                      >
                        <Ionicons name="folder" size={24} color="#fff" />
                      </LinearGradient>
                      <View style={styles.projectItemInfo}>
                        <Text style={[styles.projectItemName, { color: colors.text }, currentProject?.path === project.path && { color: colors.primaryLight }]} numberOfLines={1}>
                          {project.name}
                        </Text>
                        <Text style={[styles.projectItemPath, { color: colors.textMuted }]} numberOfLines={1}>{project.folder}</Text>
                      </View>
                      {currentProject?.path === project.path && (
                        <View style={[styles.checkmarkBadge, { backgroundColor: colors.primary }]}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.noProjects}>
                      <Text style={[styles.noProjectsText, { color: colors.textMuted }]}>No projects found</Text>
                    </View>
                  }
                />
                <TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.primary }]} onPress={() => setShowProjectPicker(false)}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </BlurView>
        </Modal>

        {/* Code Editor Modal */}
        <Modal visible={!!selectedFile} animationType="slide">
          <LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.editorContainer}>
            <SafeAreaView style={styles.editorContainer} edges={['top', 'bottom']}>
              {/* Editor Header */}
              <View style={[styles.editorHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={handleCloseEditor} activeOpacity={0.7}>
                  <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.editorBackBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                    <Text style={styles.editorBackText}>Back</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <View style={styles.editorTitleContainer}>
                  <Text style={[styles.editorTitle, { color: colors.text }]} numberOfLines={1}>{selectedFile?.name}</Text>
                </View>
                <TouchableOpacity onPress={isEditing ? handleSaveFile : handleStartEdit} activeOpacity={0.7}>
                  <LinearGradient colors={isEditing ? [colors.success, '#059669'] : [colors.primary, colors.primaryDark]} style={styles.editorActionBtn}>
                    <Ionicons name={isEditing ? 'checkmark' : 'create-outline'} size={22} color="#fff" />
                    <Text style={styles.editorActionText}>{isEditing ? 'Save' : 'Edit'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Stats Bar */}
              <View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <LinearGradient colors={[colors.primary + '40', colors.primary + '20']} style={styles.languageBadge}>
                  <Text style={[styles.languageText, { color: colors.primaryLight }]}>{language.toUpperCase()}</Text>
                </LinearGradient>
                <View style={styles.statsInfo}>
                  <Ionicons name="list" size={12} color={colors.textMuted} />
                  <Text style={[styles.statText, { color: colors.textMuted }]}>{totalLines} lines</Text>
                </View>
                <View style={styles.statsInfo}>
                  <Ionicons name="text" size={12} color={colors.textMuted} />
                  <Text style={[styles.statText, { color: colors.textMuted }]}>{charCount} chars</Text>
                </View>
                {isEditing && editedContent !== fileContent && (
                  <View style={[styles.modifiedBadge, { backgroundColor: colors.warning + '20' }]}>
                    <View style={[styles.modifiedDot, { backgroundColor: colors.warning }]} />
                    <Text style={[styles.modifiedText, { color: colors.warning }]}>Modified</Text>
                  </View>
                )}
              </View>

              <KeyboardAvoidingView style={styles.editorContent} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                {isEditing ? (
                  <TextInput
                    style={[styles.codeEditor, { color: colors.text, backgroundColor: colors.background }]}
                    value={editedContent}
                    onChangeText={setEditedContent}
                    multiline
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    textAlignVertical="top"
                    placeholderTextColor={colors.textMuted}
                  />
                ) : (
                  <ScrollView style={[styles.codeViewer, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
                    <View style={styles.codeWithLines}>
                      {visibleLines.map((line, i) => (
                        <CodeLine
                          key={i}
                          line={line}
                          lineNumber={i + 1}
                          language={language}
                          showLineNumbers={true}
                          fontSize={13}
                        />
                      ))}
                      {hasMore && (
                        <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                          <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.loadMoreGradient}>
                            <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                            <Text style={[styles.loadMoreText, { color: colors.primary }]}>Load {totalLines - displayedLines} more lines</Text>
                          </LinearGradient>
                        </TouchableOpacity>
                      )}
                    </View>
                  </ScrollView>
                )}
              </KeyboardAvoidingView>
            </SafeAreaView>
          </LinearGradient>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16 },
  projectSelector: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, gap: 14, borderWidth: 1 },
  projectIconGradient: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  projectInfo: { flex: 1 },
  projectLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1 },
  projectName: { fontSize: 17, fontWeight: '700', marginTop: 2 },
  dropdownIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  navButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  navButtonSecondary: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  pathBadge: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  pathText: { fontSize: 14, fontWeight: '500' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 13, fontWeight: '500' },
  loadingContainer: { padding: 16, alignItems: 'center' },
  fileList: { flex: 1 },
  fileListContent: { padding: 12, paddingBottom: 100 },
  fileItem: { flexDirection: 'row', alignItems: 'center', padding: 14, marginHorizontal: 4, marginVertical: 4, backgroundColor: colors.surface, borderRadius: 16, gap: 14, borderWidth: 1, borderColor: colors.border },
  fileIconGradient: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 15, fontWeight: '600' },
  fileType: { fontSize: 12, marginTop: 3, fontWeight: '500' },
  chevronContainer: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyText: { fontSize: 18, fontWeight: '600' },
  emptyHint: { fontSize: 14, marginTop: 6 },
  disconnectedContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  disconnectedIcon: { width: 100, height: 100, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  disconnectedTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  disconnectedText: { fontSize: 15, textAlign: 'center' },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderTopWidth: 1 },
  bottomNavButton: {},
  bottomNavButtonGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 14 },
  bottomNavText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  bottomNavButtonOutline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  bottomNavTextOutline: { fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { maxHeight: '80%' },
  modalGradient: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 30 },
  modalHeader: { alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1 },
  modalHandle: { width: 40, height: 5, borderRadius: 3, marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '700' },
  modalSubtitle: { fontSize: 14, marginTop: 4 },
  projectList: { padding: 12 },
  projectItem: { flexDirection: 'row', alignItems: 'center', padding: 14, marginVertical: 4, borderRadius: 16, gap: 14, borderWidth: 1 },
  projectItemGradient: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  projectItemInfo: { flex: 1 },
  projectItemName: { fontSize: 16, fontWeight: '600' },
  projectItemPath: { fontSize: 12, marginTop: 3 },
  checkmarkBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  noProjects: { alignItems: 'center', padding: 40 },
  noProjectsText: { fontSize: 15 },
  closeButton: { alignSelf: 'center', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 12 },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  editorContainer: { flex: 1 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1 },
  editorBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  editorBackText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  editorTitleContainer: { flex: 1 },
  editorTitle: { fontSize: 17, fontWeight: '600' },
  editorActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  editorActionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statsBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 14, borderBottomWidth: 1 },
  languageBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  languageText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  statsInfo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { fontSize: 12, fontWeight: '500' },
  modifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  modifiedDot: { width: 8, height: 8, borderRadius: 4 },
  modifiedText: { fontSize: 12, fontWeight: '600' },
  editorContent: { flex: 1 },
  codeViewer: { flex: 1 },
  codeWithLines: { padding: 12 },
  codeEditor: { flex: 1, padding: 16, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 14, lineHeight: 22 },
  loadMoreButton: { marginTop: 16, marginBottom: 32 },
  loadMoreGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 12 },
  loadMoreText: { fontSize: 14, fontWeight: '600' },
  // Lint styles
  lintContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  lintButton: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, gap: 12, borderWidth: 1 },
  lintIconGradient: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lintInfo: { flex: 1 },
  lintTitle: { fontSize: 15, fontWeight: '600' },
  lintSubtitle: { fontSize: 12, marginTop: 2 },
  lintBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  lintBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
