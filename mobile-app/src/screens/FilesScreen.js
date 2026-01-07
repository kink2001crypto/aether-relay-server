"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FilesScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const expo_linear_gradient_1 = require("expo-linear-gradient");
const expo_blur_1 = require("expo-blur");
const useApp_1 = require("../hooks/useApp");
const theme_1 = require("../theme");
const SyntaxHighlighter_1 = require("../components/SyntaxHighlighter");
const MAX_LINES_DISPLAY = 300;
const LOAD_MORE_INCREMENT = 200;
function FilesScreen() {
    const { files, currentPath, navigateToPath, isConnected, projects, currentProject, setCurrentProject, fileContent, openFile, saveFile } = (0, useApp_1.useApp)();
    const { isDarkMode, colors } = (0, theme_1.useTheme)();
    const [showProjectPicker, setShowProjectPicker] = (0, react_1.useState)(false);
    const [selectedFile, setSelectedFile] = (0, react_1.useState)(null);
    const [editedContent, setEditedContent] = (0, react_1.useState)('');
    const [isEditing, setIsEditing] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [displayedLines, setDisplayedLines] = (0, react_1.useState)(MAX_LINES_DISPLAY);
    const handleItemPress = (0, react_1.useCallback)((item) => {
        try {
            setError(null);
            if (item.type === 'directory') {
                setIsLoading(true);
                navigateToPath(item.path);
                setTimeout(() => setIsLoading(false), 500);
            }
            else {
                setDisplayedLines(MAX_LINES_DISPLAY);
                setSelectedFile(item);
                openFile(item.path);
                setIsEditing(false);
            }
        }
        catch (err) {
            setError(err.message || 'Error opening item');
            setIsLoading(false);
        }
    }, [navigateToPath, openFile]);
    const handleGoBack = (0, react_1.useCallback)(() => {
        try {
            if (currentPath && currentPath !== '/') {
                const parts = currentPath.split('/').filter(Boolean);
                parts.pop();
                const newPath = '/' + parts.join('/');
                setIsLoading(true);
                navigateToPath(newPath || '/');
                setTimeout(() => setIsLoading(false), 500);
            }
        }
        catch (err) {
            setError(err.message || 'Error navigating back');
            setIsLoading(false);
        }
    }, [currentPath, navigateToPath]);
    const handleSaveFile = () => {
        if (selectedFile && editedContent !== fileContent) {
            saveFile(selectedFile.path, editedContent);
            react_native_1.Alert.alert('✓ Saved', `${selectedFile.name} has been saved`);
            setIsEditing(false);
        }
    };
    const handleStartEdit = () => {
        setEditedContent(fileContent || '');
        setIsEditing(true);
    };
    const handleCloseEditor = () => {
        if (isEditing && editedContent !== fileContent) {
            react_native_1.Alert.alert('Unsaved Changes', 'Discard changes?', [
                { text: 'Keep Editing', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => { setSelectedFile(null); setIsEditing(false); } }
            ]);
        }
        else {
            setSelectedFile(null);
            setIsEditing(false);
        }
    };
    const handleLoadMore = () => setDisplayedLines(prev => prev + LOAD_MORE_INCREMENT);
    const getFileIcon = (name, type) => {
        if (type === 'directory')
            return 'folder';
        const ext = name?.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'ts':
            case 'tsx': return 'logo-javascript';
            case 'js':
            case 'jsx': return 'logo-javascript';
            case 'json': return 'code-slash';
            case 'md': return 'document-text';
            case 'css':
            case 'scss': return 'color-palette';
            case 'html': return 'globe';
            case 'png':
            case 'jpg':
            case 'gif':
            case 'svg': return 'image';
            case 'py': return 'logo-python';
            default: return 'document';
        }
    };
    const getFileGradient = (name, type) => {
        if (type === 'directory')
            return ['#f59e0b', '#d97706'];
        const ext = name?.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'ts':
            case 'tsx': return ['#3b82f6', '#1d4ed8'];
            case 'js':
            case 'jsx': return ['#eab308', '#ca8a04'];
            case 'json': return ['#22c55e', '#16a34a'];
            case 'css':
            case 'scss': return ['#ec4899', '#db2777'];
            case 'py': return ['#3b82f6', '#2563eb'];
            case 'html': return ['#ef4444', '#dc2626'];
            default: return ['#6b7280', '#4b5563'];
        }
    };
    const getLanguage = (filename) => {
        const ext = filename?.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'ts':
            case 'tsx': return 'typescript';
            case 'js':
            case 'jsx': return 'javascript';
            case 'py': return 'python';
            case 'json': return 'json';
            case 'css':
            case 'scss': return 'css';
            case 'html': return 'html';
            case 'md': return 'markdown';
            default: return 'text';
        }
    };
    const { visibleLines, totalLines, hasMore } = (0, react_1.useMemo)(() => {
        const content = fileContent || '';
        const all = content.split('\n');
        const total = all.length;
        const visible = all.slice(0, displayedLines);
        return { visibleLines: visible, totalLines: total, hasMore: displayedLines < total };
    }, [fileContent, displayedLines]);
    const renderItem = ({ item }) => (<react_native_1.TouchableOpacity style={styles.fileItem} onPress={() => handleItemPress(item)} activeOpacity={0.7}>
      <expo_linear_gradient_1.LinearGradient colors={getFileGradient(item.name, item.type)} style={styles.fileIconGradient}>
        <vector_icons_1.Ionicons name={getFileIcon(item.name, item.type)} size={22} color="#fff"/>
      </expo_linear_gradient_1.LinearGradient>
      <react_native_1.View style={styles.fileInfo}>
        <react_native_1.Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>{item.name}</react_native_1.Text>
        <react_native_1.Text style={[styles.fileType, { color: colors.textMuted }]}>{item.type === 'directory' ? 'Folder' : (item.name?.split('.').pop()?.toUpperCase() || 'File')}</react_native_1.Text>
      </react_native_1.View>
      {item.type === 'directory' && (<react_native_1.View style={[styles.chevronContainer, { backgroundColor: colors.surfaceLight }]}>
          <vector_icons_1.Ionicons name="chevron-forward" size={20} color={colors.textMuted}/>
        </react_native_1.View>)}
    </react_native_1.TouchableOpacity>);
    const styles = createStyles(colors);
    const language = selectedFile ? getLanguage(selectedFile.name) : 'text';
    const content = isEditing ? editedContent : (fileContent || '');
    const charCount = content.length;
    if (!isConnected) {
        return (<expo_linear_gradient_1.LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.container}>
        <react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['bottom']}>
          <react_native_1.View style={styles.disconnectedContainer}>
            <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.disconnectedIcon}>
              <vector_icons_1.Ionicons name="cloud-offline" size={48} color={colors.textMuted}/>
            </expo_linear_gradient_1.LinearGradient>
            <react_native_1.Text style={[styles.disconnectedTitle, { color: colors.text }]}>Not Connected</react_native_1.Text>
            <react_native_1.Text style={[styles.disconnectedText, { color: colors.textMuted }]}>Go to Settings to connect to your server</react_native_1.Text>
          </react_native_1.View>
        </react_native_safe_area_context_1.SafeAreaView>
      </expo_linear_gradient_1.LinearGradient>);
    }
    return (<expo_linear_gradient_1.LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.container}>
      <react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Header */}
        <react_native_1.View style={styles.header}>
          <react_native_1.TouchableOpacity style={[styles.projectSelector, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowProjectPicker(true)} activeOpacity={0.8}>
            <expo_linear_gradient_1.LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.projectIconGradient}>
              <vector_icons_1.Ionicons name="folder-open" size={22} color="#fff"/>
            </expo_linear_gradient_1.LinearGradient>
            <react_native_1.View style={styles.projectInfo}>
              <react_native_1.Text style={[styles.projectLabel, { color: colors.textMuted }]}>PROJECT</react_native_1.Text>
              <react_native_1.Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>{currentProject?.name || 'Select Project'}</react_native_1.Text>
            </react_native_1.View>
            <react_native_1.View style={[styles.dropdownIcon, { backgroundColor: colors.surfaceLight }]}>
              <vector_icons_1.Ionicons name="chevron-down" size={18} color={colors.textMuted}/>
            </react_native_1.View>
          </react_native_1.TouchableOpacity>
        </react_native_1.View>

        {/* Navigation Bar */}
        {currentPath !== '/' && (<react_native_1.View style={styles.navBar}>
            <react_native_1.TouchableOpacity onPress={handleGoBack} style={[styles.navButton, { backgroundColor: colors.primary }]} activeOpacity={0.7}>
              <vector_icons_1.Ionicons name="arrow-back" size={20} color="#fff"/>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity onPress={() => navigateToPath('/')} style={[styles.navButtonSecondary, { backgroundColor: colors.surface, borderColor: colors.border }]} activeOpacity={0.7}>
              <vector_icons_1.Ionicons name="home" size={18} color={colors.primary}/>
            </react_native_1.TouchableOpacity>
            <react_native_1.View style={[styles.pathBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <react_native_1.Text style={[styles.pathText, { color: colors.textSecondary }]} numberOfLines={1}>
                {currentPath.split('/').pop() || '/'}
              </react_native_1.Text>
            </react_native_1.View>
          </react_native_1.View>)}

        {/* Error */}
        {error && (<react_native_1.View style={[styles.errorBanner, { backgroundColor: colors.error + '20', borderColor: colors.error + '40' }]}>
            <vector_icons_1.Ionicons name="warning" size={16} color={colors.error}/>
            <react_native_1.Text style={[styles.errorText, { color: colors.error }]}>{error}</react_native_1.Text>
            <react_native_1.TouchableOpacity onPress={() => setError(null)}>
              <vector_icons_1.Ionicons name="close-circle" size={18} color={colors.textMuted}/>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>)}

        {/* Loading */}
        {isLoading && (<react_native_1.View style={styles.loadingContainer}>
            <react_native_1.ActivityIndicator size="small" color={colors.primary}/>
          </react_native_1.View>)}

        {/* File List */}
        <react_native_1.FlatList data={files || []} renderItem={renderItem} keyExtractor={(item) => item.path || item.name} style={styles.fileList} contentContainerStyle={styles.fileListContent} showsVerticalScrollIndicator={false} ListEmptyComponent={<react_native_1.View style={styles.emptyContainer}>
              <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.emptyIcon}>
                <vector_icons_1.Ionicons name="folder-open-outline" size={48} color={colors.textMuted}/>
              </expo_linear_gradient_1.LinearGradient>
              <react_native_1.Text style={[styles.emptyText, { color: colors.textSecondary }]}>No files</react_native_1.Text>
              <react_native_1.Text style={[styles.emptyHint, { color: colors.textMuted }]}>Select a project to get started</react_native_1.Text>
            </react_native_1.View>}/>

        {/* Bottom Nav */}
        {currentPath !== '/' && (<expo_blur_1.BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={[styles.bottomNav, { borderTopColor: colors.border }]}>
            <react_native_1.TouchableOpacity onPress={handleGoBack} style={styles.bottomNavButton} activeOpacity={0.8}>
              <expo_linear_gradient_1.LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.bottomNavButtonGradient}>
                <vector_icons_1.Ionicons name="arrow-back" size={22} color="#fff"/>
                <react_native_1.Text style={styles.bottomNavText}>Back</react_native_1.Text>
              </expo_linear_gradient_1.LinearGradient>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity onPress={() => navigateToPath('/')} style={[styles.bottomNavButtonOutline, { backgroundColor: colors.surface, borderColor: colors.primary }]} activeOpacity={0.7}>
              <vector_icons_1.Ionicons name="home" size={20} color={colors.primary}/>
              <react_native_1.Text style={[styles.bottomNavTextOutline, { color: colors.primary }]}>Home</react_native_1.Text>
            </react_native_1.TouchableOpacity>
          </expo_blur_1.BlurView>)}

        {/* Project Picker Modal */}
        <react_native_1.Modal visible={showProjectPicker} animationType="slide" transparent>
          <expo_blur_1.BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={styles.modalOverlay}>
            <react_native_1.View style={styles.modalContent}>
              <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={[styles.modalGradient, { borderColor: colors.border }]}>
                <react_native_1.View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <react_native_1.View style={[styles.modalHandle, { backgroundColor: colors.textMuted }]}/>
                  <react_native_1.Text style={[styles.modalTitle, { color: colors.text }]}>Select Project</react_native_1.Text>
                  <react_native_1.Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>{projects?.length || 0} projects available</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.FlatList data={projects || []} keyExtractor={(p) => p.path} style={styles.projectList} showsVerticalScrollIndicator={false} renderItem={({ item: project }) => (<react_native_1.TouchableOpacity style={[
                styles.projectItem,
                { backgroundColor: colors.background, borderColor: colors.border },
                currentProject?.path === project.path && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
            ]} onPress={() => { setCurrentProject(project); setShowProjectPicker(false); }} activeOpacity={0.7}>
                      <expo_linear_gradient_1.LinearGradient colors={currentProject?.path === project.path ? [colors.primary, colors.primaryDark] : ['#f59e0b', '#d97706']} style={styles.projectItemGradient}>
                        <vector_icons_1.Ionicons name="folder" size={24} color="#fff"/>
                      </expo_linear_gradient_1.LinearGradient>
                      <react_native_1.View style={styles.projectItemInfo}>
                        <react_native_1.Text style={[styles.projectItemName, { color: colors.text }, currentProject?.path === project.path && { color: colors.primaryLight }]} numberOfLines={1}>
                          {project.name}
                        </react_native_1.Text>
                        <react_native_1.Text style={[styles.projectItemPath, { color: colors.textMuted }]} numberOfLines={1}>{project.folder}</react_native_1.Text>
                      </react_native_1.View>
                      {currentProject?.path === project.path && (<react_native_1.View style={[styles.checkmarkBadge, { backgroundColor: colors.primary }]}>
                          <vector_icons_1.Ionicons name="checkmark" size={16} color="#fff"/>
                        </react_native_1.View>)}
                    </react_native_1.TouchableOpacity>)} ListEmptyComponent={<react_native_1.View style={styles.noProjects}>
                      <react_native_1.Text style={[styles.noProjectsText, { color: colors.textMuted }]}>No projects found</react_native_1.Text>
                    </react_native_1.View>}/>
                <react_native_1.TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.primary }]} onPress={() => setShowProjectPicker(false)}>
                  <react_native_1.Text style={styles.closeButtonText}>Close</react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </expo_linear_gradient_1.LinearGradient>
            </react_native_1.View>
          </expo_blur_1.BlurView>
        </react_native_1.Modal>

        {/* Code Editor Modal */}
        <react_native_1.Modal visible={!!selectedFile} animationType="slide">
          <expo_linear_gradient_1.LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.editorContainer}>
            <react_native_safe_area_context_1.SafeAreaView style={styles.editorContainer} edges={['top', 'bottom']}>
              {/* Editor Header */}
              <react_native_1.View style={[styles.editorHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <react_native_1.TouchableOpacity onPress={handleCloseEditor} activeOpacity={0.7}>
                  <expo_linear_gradient_1.LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.editorBackBtn}>
                    <vector_icons_1.Ionicons name="arrow-back" size={24} color="#fff"/>
                    <react_native_1.Text style={styles.editorBackText}>Back</react_native_1.Text>
                  </expo_linear_gradient_1.LinearGradient>
                </react_native_1.TouchableOpacity>
                <react_native_1.View style={styles.editorTitleContainer}>
                  <react_native_1.Text style={[styles.editorTitle, { color: colors.text }]} numberOfLines={1}>{selectedFile?.name}</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.TouchableOpacity onPress={isEditing ? handleSaveFile : handleStartEdit} activeOpacity={0.7}>
                  <expo_linear_gradient_1.LinearGradient colors={isEditing ? [colors.success, '#059669'] : [colors.primary, colors.primaryDark]} style={styles.editorActionBtn}>
                    <vector_icons_1.Ionicons name={isEditing ? 'checkmark' : 'create-outline'} size={22} color="#fff"/>
                    <react_native_1.Text style={styles.editorActionText}>{isEditing ? 'Save' : 'Edit'}</react_native_1.Text>
                  </expo_linear_gradient_1.LinearGradient>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>

              {/* Stats Bar */}
              <react_native_1.View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <expo_linear_gradient_1.LinearGradient colors={[colors.primary + '40', colors.primary + '20']} style={styles.languageBadge}>
                  <react_native_1.Text style={[styles.languageText, { color: colors.primaryLight }]}>{language.toUpperCase()}</react_native_1.Text>
                </expo_linear_gradient_1.LinearGradient>
                <react_native_1.View style={styles.statsInfo}>
                  <vector_icons_1.Ionicons name="list" size={12} color={colors.textMuted}/>
                  <react_native_1.Text style={[styles.statText, { color: colors.textMuted }]}>{totalLines} lines</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={styles.statsInfo}>
                  <vector_icons_1.Ionicons name="text" size={12} color={colors.textMuted}/>
                  <react_native_1.Text style={[styles.statText, { color: colors.textMuted }]}>{charCount} chars</react_native_1.Text>
                </react_native_1.View>
                {isEditing && editedContent !== fileContent && (<react_native_1.View style={[styles.modifiedBadge, { backgroundColor: colors.warning + '20' }]}>
                    <react_native_1.View style={[styles.modifiedDot, { backgroundColor: colors.warning }]}/>
                    <react_native_1.Text style={[styles.modifiedText, { color: colors.warning }]}>Modified</react_native_1.Text>
                  </react_native_1.View>)}
              </react_native_1.View>

              <react_native_1.KeyboardAvoidingView style={styles.editorContent} behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'}>
                {isEditing ? (<react_native_1.TextInput style={[styles.codeEditor, { color: colors.text, backgroundColor: colors.background }]} value={editedContent} onChangeText={setEditedContent} multiline autoCapitalize="none" autoCorrect={false} spellCheck={false} textAlignVertical="top" placeholderTextColor={colors.textMuted}/>) : (<react_native_1.ScrollView style={[styles.codeViewer, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
                    <react_native_1.View style={styles.codeWithLines}>
                      {visibleLines.map((line, i) => (<SyntaxHighlighter_1.CodeLine key={i} line={line} lineNumber={i + 1} language={language} showLineNumbers={true} fontSize={13}/>))}
                      {hasMore && (<react_native_1.TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
                          <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.loadMoreGradient}>
                            <vector_icons_1.Ionicons name="add-circle-outline" size={20} color={colors.primary}/>
                            <react_native_1.Text style={[styles.loadMoreText, { color: colors.primary }]}>Load {totalLines - displayedLines} more lines</react_native_1.Text>
                          </expo_linear_gradient_1.LinearGradient>
                        </react_native_1.TouchableOpacity>)}
                    </react_native_1.View>
                  </react_native_1.ScrollView>)}
              </react_native_1.KeyboardAvoidingView>
            </react_native_safe_area_context_1.SafeAreaView>
          </expo_linear_gradient_1.LinearGradient>
        </react_native_1.Modal>
      </react_native_safe_area_context_1.SafeAreaView>
    </expo_linear_gradient_1.LinearGradient>);
}
const createStyles = (colors) => react_native_1.StyleSheet.create({
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
    codeEditor: { flex: 1, padding: 16, fontFamily: react_native_1.Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 14, lineHeight: 22 },
    loadMoreButton: { marginTop: 16, marginBottom: 32 },
    loadMoreGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 12 },
    loadMoreText: { fontSize: 14, fontWeight: '600' },
});
//# sourceMappingURL=FilesScreen.js.map