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
exports.default = ChatScreen;
const react_1 = __importStar(require("react"));
const react_native_1 = require("react-native");
const vector_icons_1 = require("@expo/vector-icons");
const react_native_safe_area_context_1 = require("react-native-safe-area-context");
const expo_linear_gradient_1 = require("expo-linear-gradient");
const expo_blur_1 = require("expo-blur");
const useApp_1 = require("../hooks/useApp");
const theme_1 = require("../theme");
const SyntaxHighlighter_1 = require("../components/SyntaxHighlighter");
function ChatScreen() {
    const { messages, sendMessage, isLoading, isConnected, selectedModel, availableModels, setSelectedModel, applyCode, projects, currentProject, setCurrentProject, serverUrl, executeCommand } = (0, useApp_1.useApp)();
    const { isDarkMode, colors } = (0, theme_1.useTheme)();
    const syntaxColors = (0, theme_1.useSyntaxColors)();
    const [input, setInput] = (0, react_1.useState)('');
    const [showModelPicker, setShowModelPicker] = (0, react_1.useState)(false);
    const [showProjectPicker, setShowProjectPicker] = (0, react_1.useState)(false);
    const [expandedCode, setExpandedCode] = (0, react_1.useState)(null);
    const [showFilePicker, setShowFilePicker] = (0, react_1.useState)(false);
    const [pendingCode, setPendingCode] = (0, react_1.useState)(null);
    const [targetFileName, setTargetFileName] = (0, react_1.useState)('');
    const [showCreateProject, setShowCreateProject] = (0, react_1.useState)(false);
    const [newProjectName, setNewProjectName] = (0, react_1.useState)('');
    const [codeBlockActions, setCodeBlockActions] = (0, react_1.useState)({});
    const [isListening, setIsListening] = (0, react_1.useState)(false);
    const flatListRef = (0, react_1.useRef)(null);
    const handleSend = () => {
        if (input.trim()) {
            sendMessage(input.trim());
            setInput('');
            react_native_1.Keyboard.dismiss();
        }
    };
    const handleVoiceInput = async () => {
        // Pour l'instant, on affiche un message - la vraie implémentation nécessite expo-speech ou react-native-voice
        react_native_1.Alert.alert('🎤 Commande Vocale', 'Pour activer la reconnaissance vocale, installe:\n\nnpx expo install expo-speech\n\nOu utilise le clavier vocal de ton téléphone (icône micro sur le clavier iOS/Android)', [{ text: 'OK' }]);
    };
    const handleApplyCode = (code, language) => {
        if (!currentProject) {
            react_native_1.Alert.alert('⚠️ No Project', 'Select a project first to save code');
            return;
        }
        const extensions = {
            typescript: '.ts', tsx: '.tsx', javascript: '.js', jsx: '.jsx',
            python: '.py', json: '.json', html: '.html', css: '.css',
            bash: '.sh', shell: '.sh', sh: '.sh',
        };
        const ext = extensions[language.toLowerCase()] || '.txt';
        const timestamp = Date.now().toString().slice(-6);
        const filename = `code_${timestamp}${ext}`;
        applyCode(code, filename);
    };
    const confirmApplyCode = () => {
        if (pendingCode && targetFileName.trim()) {
            applyCode(pendingCode.code, targetFileName.trim());
            react_native_1.Alert.alert('✓ Code Applied', `Saved to: ${targetFileName}`);
            setShowFilePicker(false);
            setPendingCode(null);
            setTargetFileName('');
        }
    };
    const handleRunCommand = (command) => {
        if (!currentProject) {
            react_native_1.Alert.alert('Error', 'Select a project first');
            return;
        }
        executeCommand(command.trim());
        react_native_1.Alert.alert('🖥️ Running...', command.trim());
    };
    const getLanguageColor = (lang) => {
        const langColors = {
            typescript: ['#3178c6', '#225eab'], tsx: ['#3178c6', '#225eab'], ts: ['#3178c6', '#225eab'],
            javascript: ['#f7df1e', '#d4c516'], jsx: ['#f7df1e', '#d4c516'], js: ['#f7df1e', '#d4c516'],
            python: ['#3776ab', '#2d5f8a'], py: ['#3776ab', '#2d5f8a'],
            json: ['#6366f1', '#4f46e5'], html: ['#e34c26', '#c43d1e'], css: ['#264de4', '#1e3eb3'],
            bash: ['#4eaa25', '#3d881d'], shell: ['#4eaa25', '#3d881d'],
        };
        return langColors[lang.toLowerCase()] || [colors.primary, colors.primaryDark];
    };
    const styles = createStyles(colors);
    const renderCodeBlock = (block, index) => {
        const langColors = getLanguageColor(block.language);
        const key = `${index}-${block.code.slice(0, 20)}`;
        const lines = block.code.split('\n');
        return (<react_native_1.View key={index} style={[styles.codeBlock, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <react_native_1.View style={[styles.codeHeader, { backgroundColor: colors.surface }]}>
          <expo_linear_gradient_1.LinearGradient colors={langColors} style={styles.langBadge}>
            <react_native_1.Text style={styles.langText}>{block.language.toUpperCase()}</react_native_1.Text>
          </expo_linear_gradient_1.LinearGradient>
          <react_native_1.View style={styles.codeActions}>
            <react_native_1.TouchableOpacity style={styles.codeActionBtn} onPress={() => setExpandedCode(block)}>
              <vector_icons_1.Ionicons name="expand" size={18} color={colors.textMuted}/>
            </react_native_1.TouchableOpacity>
            {!codeBlockActions[key] ? (<react_native_1.View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <react_native_1.TouchableOpacity onPress={() => {
                    setCodeBlockActions(prev => ({ ...prev, [key]: 'refused' }));
                    react_native_1.Alert.alert('❌ Refused', 'Code declined');
                }} style={[styles.actionBtn, { backgroundColor: colors.error }]}>
                  <vector_icons_1.Ionicons name="close" size={14} color="#fff"/>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity onPress={() => {
                    react_native_1.Share.share({ message: block.code });
                    react_native_1.Alert.alert('📋 Copied!', 'Code copied to clipboard');
                }} style={[styles.actionBtn, { backgroundColor: colors.textMuted }]}>
                  <vector_icons_1.Ionicons name="copy" size={14} color="#fff"/>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity onPress={() => {
                    setCodeBlockActions(prev => ({ ...prev, [key]: 'applied' }));
                    handleRunCommand(block.code);
                }} style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]}>
                  <vector_icons_1.Ionicons name="play" size={14} color="#fff"/>
                </react_native_1.TouchableOpacity>
                <react_native_1.TouchableOpacity onPress={() => {
                    setCodeBlockActions(prev => ({ ...prev, [key]: 'applied' }));
                    handleApplyCode(block.code, block.language);
                }} style={[styles.actionBtn, { backgroundColor: colors.success }]}>
                  <vector_icons_1.Ionicons name="save" size={14} color="#fff"/>
                </react_native_1.TouchableOpacity>
              </react_native_1.View>) : (<react_native_1.View style={[styles.applyBtn, { backgroundColor: codeBlockActions[key] === 'applied' ? colors.success : colors.error }]}>
                <vector_icons_1.Ionicons name={codeBlockActions[key] === 'applied' ? 'checkmark-circle' : 'close-circle'} size={16} color="#fff"/>
                <react_native_1.Text style={styles.applyBtnText}>{codeBlockActions[key] === 'applied' ? 'Applied ✓' : 'Refused ✗'}</react_native_1.Text>
              </react_native_1.View>)}
          </react_native_1.View>
        </react_native_1.View>
        <react_native_1.ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <react_native_1.View style={styles.codeContent}>
            {lines.slice(0, 10).map((line, i) => (<SyntaxHighlighter_1.CodeLine key={i} line={line} lineNumber={i + 1} language={block.language} fontSize={11}/>))}
            {lines.length > 10 && (<react_native_1.TouchableOpacity style={styles.showMoreBtn} onPress={() => setExpandedCode(block)}>
                <react_native_1.Text style={[styles.showMoreText, { color: colors.primary }]}>+ {lines.length - 10} more lines</react_native_1.Text>
              </react_native_1.TouchableOpacity>)}
          </react_native_1.View>
        </react_native_1.ScrollView>
      </react_native_1.View>);
    };
    const renderMessage = ({ item }) => {
        const isUser = item.role === 'user';
        return (<react_native_1.View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        {!isUser && (<expo_linear_gradient_1.LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.avatar}>
            <vector_icons_1.Ionicons name="sparkles" size={18} color="#fff"/>
          </expo_linear_gradient_1.LinearGradient>)}
        <react_native_1.View style={[styles.messageContent, isUser && styles.userMessageContent]}>
          {isUser ? (<expo_linear_gradient_1.LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.userMessageBg}>
              <react_native_1.Text style={styles.userText}>{item.content}</react_native_1.Text>
            </expo_linear_gradient_1.LinearGradient>) : (<react_native_1.View style={[styles.assistantMessageBg, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <react_native_1.Text style={[styles.assistantText, { color: colors.text }]}>{item.content}</react_native_1.Text>
              {item.codeBlocks?.map((block, index) => renderCodeBlock(block, index))}
            </react_native_1.View>)}
        </react_native_1.View>
      </react_native_1.View>);
    };
    const renderEmptyChat = () => (<react_native_1.View style={styles.emptyContainer}>
      <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.logoContainer}>
        <expo_linear_gradient_1.LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.logo}>
          <vector_icons_1.Ionicons name="flash" size={56} color="#fff"/>
        </expo_linear_gradient_1.LinearGradient>
      </expo_linear_gradient_1.LinearGradient>
      <react_native_1.Text style={[styles.welcomeTitle, { color: colors.text }]}>AETHER AI</react_native_1.Text>
      <react_native_1.Text style={[styles.welcomeSubtitle, { color: colors.textMuted }]}>Your intelligent coding companion</react_native_1.Text>
      {currentProject && (<react_native_1.View style={styles.contextBadge}>
          <expo_linear_gradient_1.LinearGradient colors={[colors.success + '30', colors.success + '10']} style={styles.contextGradient}>
            <vector_icons_1.Ionicons name="folder" size={16} color={colors.success}/>
            <react_native_1.Text style={[styles.contextText, { color: colors.success }]}>{currentProject.name}</react_native_1.Text>
          </expo_linear_gradient_1.LinearGradient>
        </react_native_1.View>)}
      <react_native_1.View style={styles.suggestionsContainer}>
        {['Analyze code', 'Find bugs', 'Explain', 'Optimize'].map((suggestion, i) => (<react_native_1.TouchableOpacity key={i} onPress={() => setInput(suggestion)}>
            <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={[styles.suggestionChip, { borderColor: colors.border }]}>
              <react_native_1.Text style={[styles.suggestionText, { color: colors.primaryLight }]}>{suggestion}</react_native_1.Text>
            </expo_linear_gradient_1.LinearGradient>
          </react_native_1.TouchableOpacity>))}
      </react_native_1.View>
    </react_native_1.View>);
    return (<expo_linear_gradient_1.LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.container}>
      <react_native_safe_area_context_1.SafeAreaView style={styles.container} edges={['bottom']}>
        {/* Header */}
        <react_native_1.View style={[styles.header, { borderBottomColor: colors.border }]}>
          <react_native_1.View style={styles.headerLeft}>
            <react_native_1.View style={[styles.statusDot, isConnected ? { backgroundColor: colors.success } : { backgroundColor: colors.error }]}/>
            <react_native_1.Text style={[styles.headerTitle, { color: colors.text }]}>AETHER</react_native_1.Text>
          </react_native_1.View>
          <react_native_1.View style={styles.headerRight}>
            <react_native_1.TouchableOpacity style={[styles.projectBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setShowProjectPicker(true)}>
              <vector_icons_1.Ionicons name="folder" size={16} color={currentProject ? colors.success : colors.textMuted}/>
              <react_native_1.Text style={[styles.projectBtnText, { color: colors.textSecondary }]} numberOfLines={1}>{currentProject?.name || 'Project'}</react_native_1.Text>
            </react_native_1.TouchableOpacity>
            <react_native_1.TouchableOpacity onPress={() => setShowModelPicker(!showModelPicker)}>
              <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={[styles.modelBtn, { borderColor: colors.border }]}>
                <vector_icons_1.Ionicons name="cube-outline" size={16} color={colors.primaryLight}/>
                <react_native_1.Text style={[styles.modelBtnText, { color: colors.primaryLight }]}>{selectedModel}</react_native_1.Text>
              </expo_linear_gradient_1.LinearGradient>
            </react_native_1.TouchableOpacity>
          </react_native_1.View>
        </react_native_1.View>

        {/* Model Picker */}
        {showModelPicker && (<expo_blur_1.BlurView intensity={80} tint={isDarkMode ? 'dark' : 'light'} style={[styles.modelPicker, { borderBottomColor: colors.border }]}>
            {availableModels.map((model) => (<react_native_1.TouchableOpacity key={model} style={[styles.modelOption, selectedModel === model && { backgroundColor: colors.primary + '20' }]} onPress={() => { setSelectedModel(model); setShowModelPicker(false); }}>
                <vector_icons_1.Ionicons name={model === 'gemini' ? 'sparkles' : model === 'ollama' ? 'hardware-chip' : 'cube'} size={20} color={selectedModel === model ? colors.primary : colors.textMuted}/>
                <react_native_1.Text style={[styles.modelOptionText, { color: selectedModel === model ? colors.text : colors.textSecondary }]}>
                  {model.charAt(0).toUpperCase() + model.slice(1)}
                </react_native_1.Text>
                {selectedModel === model && <vector_icons_1.Ionicons name="checkmark-circle" size={20} color={colors.primary}/>}
              </react_native_1.TouchableOpacity>))}
          </expo_blur_1.BlurView>)}

        {/* Messages */}
        <react_native_1.FlatList ref={flatListRef} data={messages} renderItem={renderMessage} keyExtractor={(item) => item.id} style={styles.messageList} contentContainerStyle={messages.length === 0 ? styles.emptyList : styles.messageListContent} ListEmptyComponent={renderEmptyChat} onContentSizeChange={() => flatListRef.current?.scrollToEnd()} showsVerticalScrollIndicator={false}/>

        {/* Loading */}
        {isLoading && (<react_native_1.View style={styles.loadingContainer}>
            <react_native_1.ActivityIndicator size="small" color={colors.primary}/>
            <react_native_1.Text style={[styles.loadingText, { color: colors.textMuted }]}>Thinking...</react_native_1.Text>
          </react_native_1.View>)}

        {/* Input */}
        <react_native_1.KeyboardAvoidingView behavior={react_native_1.Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={react_native_1.Platform.OS === 'ios' ? 90 : 0}>
          <expo_blur_1.BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={[styles.inputContainer, { borderTopColor: colors.border }]}>
            <react_native_1.TouchableOpacity onPress={handleVoiceInput} style={styles.voiceBtn}>
              <vector_icons_1.Ionicons name="mic" size={22} color={isListening ? colors.error : colors.textMuted}/>
            </react_native_1.TouchableOpacity>
            <react_native_1.TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} value={input} onChangeText={setInput} placeholder={currentProject ? `Ask about ${currentProject.name}...` : "Ask anything..."} placeholderTextColor={colors.textMuted} multiline maxLength={4000}/>
            <react_native_1.TouchableOpacity onPress={handleSend} disabled={!input.trim() || isLoading}>
              <expo_linear_gradient_1.LinearGradient colors={input.trim() && !isLoading ? [colors.primary, colors.primaryDark] : [colors.surfaceLight, colors.surface]} style={styles.sendBtn}>
                <vector_icons_1.Ionicons name="arrow-up" size={22} color={input.trim() && !isLoading ? '#fff' : colors.textMuted}/>
              </expo_linear_gradient_1.LinearGradient>
            </react_native_1.TouchableOpacity>
          </expo_blur_1.BlurView>
        </react_native_1.KeyboardAvoidingView>

        {/* Project Picker Modal */}
        <react_native_1.Modal visible={showProjectPicker} animationType="slide" transparent>
          <expo_blur_1.BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={styles.modalOverlay}>
            <react_native_1.View style={styles.modalContent}>
              <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.modalGradient}>
                <react_native_1.View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <react_native_1.View style={[styles.modalHandle, { backgroundColor: colors.textMuted }]}/>
                  <react_native_1.Text style={[styles.modalTitle, { color: colors.text }]}>Project Context</react_native_1.Text>
                  <react_native_1.Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Select a project for AI analysis</react_native_1.Text>
                  <react_native_1.TouchableOpacity style={styles.createProjectButton} onPress={() => { setShowProjectPicker(false); setShowCreateProject(true); }}>
                    <expo_linear_gradient_1.LinearGradient colors={[colors.success, '#059669']} style={styles.createProjectGradient}>
                      <vector_icons_1.Ionicons name="add" size={20} color="#fff"/>
                      <react_native_1.Text style={styles.createProjectText}>New Project</react_native_1.Text>
                    </expo_linear_gradient_1.LinearGradient>
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>
                <react_native_1.ScrollView style={styles.projectList}>
                  <react_native_1.TouchableOpacity style={[styles.projectItem, { backgroundColor: colors.background, borderColor: !currentProject ? colors.primary : colors.border }]} onPress={() => { setCurrentProject(null); setShowProjectPicker(false); }}>
                    <react_native_1.View style={[styles.projectItemIcon, { backgroundColor: colors.surface }]}>
                      <vector_icons_1.Ionicons name="globe" size={24} color={colors.textMuted}/>
                    </react_native_1.View>
                    <react_native_1.View style={styles.projectItemInfo}>
                      <react_native_1.Text style={[styles.projectItemName, { color: colors.text }]}>No project</react_native_1.Text>
                      <react_native_1.Text style={[styles.projectItemPath, { color: colors.textMuted }]}>General questions</react_native_1.Text>
                    </react_native_1.View>
                  </react_native_1.TouchableOpacity>
                  {projects.map((project) => (<react_native_1.TouchableOpacity key={project.path} style={[styles.projectItem, { backgroundColor: colors.background, borderColor: currentProject?.path === project.path ? colors.primary : colors.border }]} onPress={() => { setCurrentProject(project); setShowProjectPicker(false); }}>
                      <expo_linear_gradient_1.LinearGradient colors={currentProject?.path === project.path ? [colors.primary, colors.primaryDark] : ['#f59e0b', '#d97706']} style={styles.projectItemGradient}>
                        <vector_icons_1.Ionicons name="folder" size={24} color="#fff"/>
                      </expo_linear_gradient_1.LinearGradient>
                      <react_native_1.View style={styles.projectItemInfo}>
                        <react_native_1.Text style={[styles.projectItemName, { color: currentProject?.path === project.path ? colors.primaryLight : colors.text }]}>{project.name}</react_native_1.Text>
                        <react_native_1.Text style={[styles.projectItemPath, { color: colors.textMuted }]}>{project.folder}</react_native_1.Text>
                      </react_native_1.View>
                      {currentProject?.path === project.path && (<react_native_1.View style={[styles.checkmarkBadge, { backgroundColor: colors.primary }]}>
                          <vector_icons_1.Ionicons name="checkmark" size={16} color="#fff"/>
                        </react_native_1.View>)}
                    </react_native_1.TouchableOpacity>))}
                </react_native_1.ScrollView>
                <react_native_1.TouchableOpacity style={[styles.closeButton, { backgroundColor: colors.primary }]} onPress={() => setShowProjectPicker(false)}>
                  <react_native_1.Text style={styles.closeButtonText}>Close</react_native_1.Text>
                </react_native_1.TouchableOpacity>
              </expo_linear_gradient_1.LinearGradient>
            </react_native_1.View>
          </expo_blur_1.BlurView>
        </react_native_1.Modal>

        {/* Create New Project Modal */}
        <react_native_1.Modal visible={showCreateProject} animationType="slide" transparent>
          <expo_blur_1.BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={styles.modalOverlay}>
            <react_native_1.View style={styles.modalContent}>
              <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.modalGradient}>
                <react_native_1.View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <react_native_1.View style={[styles.modalHandle, { backgroundColor: colors.textMuted }]}/>
                  <react_native_1.Text style={[styles.modalTitle, { color: colors.text }]}>Create New Project</react_native_1.Text>
                  <react_native_1.Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Enter project details</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={styles.filePickerContent}>
                  <react_native_1.Text style={[styles.createProjectLabel, { color: colors.textSecondary }]}>Project Name</react_native_1.Text>
                  <react_native_1.TextInput style={[styles.createProjectInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} placeholder="my-awesome-project" placeholderTextColor={colors.textMuted} value={newProjectName} onChangeText={setNewProjectName} autoCapitalize="none" autoCorrect={false}/>
                  <react_native_1.View style={styles.createProjectButtons}>
                    <react_native_1.TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => { setShowCreateProject(false); setNewProjectName(''); }}>
                      <react_native_1.Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</react_native_1.Text>
                    </react_native_1.TouchableOpacity>
                    <react_native_1.TouchableOpacity onPress={async () => {
            if (!newProjectName.trim()) {
                react_native_1.Alert.alert('Error', 'Please enter a project name');
                return;
            }
            try {
                const response = await fetch(`${serverUrl}/api/projects/create`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: newProjectName.trim() }),
                });
                const data = await response.json();
                if (data.success) {
                    react_native_1.Alert.alert('Success', `Project "${newProjectName}" created!`);
                    setShowCreateProject(false);
                    setNewProjectName('');
                }
                else {
                    react_native_1.Alert.alert('Error', data.error || 'Failed to create project');
                }
            }
            catch (error) {
                react_native_1.Alert.alert('Error', 'Failed to connect to server');
            }
        }}>
                      <expo_linear_gradient_1.LinearGradient colors={[colors.success, '#059669']} style={styles.confirmButton}>
                        <vector_icons_1.Ionicons name="add-circle" size={20} color="#fff"/>
                        <react_native_1.Text style={styles.confirmButtonText}>Create</react_native_1.Text>
                      </expo_linear_gradient_1.LinearGradient>
                    </react_native_1.TouchableOpacity>
                  </react_native_1.View>
                </react_native_1.View>
              </expo_linear_gradient_1.LinearGradient>
            </react_native_1.View>
          </expo_blur_1.BlurView>
        </react_native_1.Modal>

        {/* Expanded Code Modal */}
        <react_native_1.Modal visible={!!expandedCode} animationType="slide">
          <expo_linear_gradient_1.LinearGradient colors={[colors.background, isDarkMode ? '#0f0f18' : '#f1f5f9']} style={styles.codeModalContainer}>
            <react_native_safe_area_context_1.SafeAreaView style={styles.codeModalContainer} edges={['top', 'bottom']}>
              <react_native_1.View style={[styles.codeModalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                <expo_linear_gradient_1.LinearGradient colors={getLanguageColor(expandedCode?.language || '')} style={styles.codeModalLangBadge}>
                  <react_native_1.Text style={styles.codeModalLangText}>{expandedCode?.language.toUpperCase()}</react_native_1.Text>
                </expo_linear_gradient_1.LinearGradient>
                <react_native_1.View style={styles.codeModalActions}>
                  <react_native_1.TouchableOpacity onPress={() => { if (expandedCode)
        handleApplyCode(expandedCode.code, expandedCode.language); setExpandedCode(null); }}>
                    <expo_linear_gradient_1.LinearGradient colors={[colors.success, '#059669']} style={styles.applyBtnLarge}>
                      <vector_icons_1.Ionicons name="checkmark" size={20} color="#fff"/>
                      <react_native_1.Text style={styles.applyBtnText}>Apply</react_native_1.Text>
                    </expo_linear_gradient_1.LinearGradient>
                  </react_native_1.TouchableOpacity>
                  <react_native_1.TouchableOpacity onPress={() => setExpandedCode(null)} style={styles.closeModalBtn}>
                    <vector_icons_1.Ionicons name="close" size={26} color={colors.text}/>
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>
              </react_native_1.View>
              <react_native_1.ScrollView style={styles.codeModalContent} horizontal>
                <react_native_1.ScrollView>
                  <react_native_1.View style={styles.codeModalCode}>
                    {expandedCode?.code.split('\n').map((line, i) => (<SyntaxHighlighter_1.CodeLine key={i} line={line} lineNumber={i + 1} language={expandedCode.language} fontSize={13}/>))}
                  </react_native_1.View>
                </react_native_1.ScrollView>
              </react_native_1.ScrollView>
            </react_native_safe_area_context_1.SafeAreaView>
          </expo_linear_gradient_1.LinearGradient>
        </react_native_1.Modal>

        {/* File Picker Modal */}
        <react_native_1.Modal visible={showFilePicker} animationType="slide" transparent>
          <expo_blur_1.BlurView intensity={60} tint={isDarkMode ? 'dark' : 'light'} style={styles.modalOverlay}>
            <react_native_1.View style={styles.modalContent}>
              <expo_linear_gradient_1.LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.modalGradient}>
                <react_native_1.View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <react_native_1.View style={[styles.modalHandle, { backgroundColor: colors.textMuted }]}/>
                  <react_native_1.Text style={[styles.modalTitle, { color: colors.text }]}>Save Code To File</react_native_1.Text>
                  <react_native_1.Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>{currentProject ? `In: ${currentProject.name}` : 'Enter file path'}</react_native_1.Text>
                </react_native_1.View>
                <react_native_1.View style={styles.filePickerContent}>
                  <react_native_1.Text style={[styles.filePickerLabel, { color: colors.textSecondary }]}>File Name / Path:</react_native_1.Text>
                  <react_native_1.TextInput style={[styles.fileNameInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]} value={targetFileName} onChangeText={setTargetFileName} placeholder="e.g. src/utils/helper.ts" placeholderTextColor={colors.textMuted} autoCapitalize="none" autoCorrect={false}/>
                  {pendingCode && (<react_native_1.View style={[styles.codePreview, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <react_native_1.Text style={[styles.codePreviewLabel, { color: colors.textMuted }]}>Code Preview ({pendingCode.language}):</react_native_1.Text>
                      <react_native_1.Text style={[styles.codePreviewText, { color: colors.textSecondary }]} numberOfLines={5}>{pendingCode.code.substring(0, 200)}...</react_native_1.Text>
                    </react_native_1.View>)}
                </react_native_1.View>
                <react_native_1.View style={styles.filePickerButtons}>
                  <react_native_1.TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => { setShowFilePicker(false); setPendingCode(null); }}>
                    <react_native_1.Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancel</react_native_1.Text>
                  </react_native_1.TouchableOpacity>
                  <react_native_1.TouchableOpacity onPress={confirmApplyCode}>
                    <expo_linear_gradient_1.LinearGradient colors={[colors.success, '#059669']} style={styles.confirmButton}>
                      <vector_icons_1.Ionicons name="checkmark" size={20} color="#fff"/>
                      <react_native_1.Text style={styles.confirmButtonText}>Apply Code</react_native_1.Text>
                    </expo_linear_gradient_1.LinearGradient>
                  </react_native_1.TouchableOpacity>
                </react_native_1.View>
              </expo_linear_gradient_1.LinearGradient>
            </react_native_1.View>
          </expo_blur_1.BlurView>
        </react_native_1.Modal>
      </react_native_safe_area_context_1.SafeAreaView>
    </expo_linear_gradient_1.LinearGradient>);
}
const createStyles = (colors) => react_native_1.StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 1.5 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusDot: { width: 10, height: 10, borderRadius: 5 },
    projectBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, maxWidth: 100, borderWidth: 1 },
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
    codeActions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    codeActionBtn: { padding: 8 },
    applyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
    actionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
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
    fileNameInput: { borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, borderWidth: 1, fontFamily: react_native_1.Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
    codePreview: { marginTop: 20, borderRadius: 12, padding: 14, borderWidth: 1 },
    codePreviewLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
    codePreviewText: { fontSize: 11, fontFamily: react_native_1.Platform.OS === 'ios' ? 'Menlo' : 'monospace', lineHeight: 16 },
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
//# sourceMappingURL=ChatScreen.js.map