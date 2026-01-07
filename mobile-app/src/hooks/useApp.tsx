/**
 * 🌐 AETHER Mobile - Cloud-Only Hook
 * Connexion au serveur Railway uniquement - pas de mode local
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============== TYPES ==============

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  codeBlocks?: { language: string; code: string }[];
}

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
}

interface Project {
  name: string;
  path: string;
  folder: string;
}

interface ApiKeys {
  gemini?: string;
  openai?: string;
  claude?: string;
  deepseek?: string;
  grok?: string;
}

interface ModelVariants {
  gemini: string;
  openai: string;
  claude: string;
  deepseek: string;
  grok: string;
}

export interface GitStatus {
  isRepo: boolean;
  branch?: string;
  modified?: number;
  staged?: number;
  untracked?: number;
  ahead?: number;
  behind?: number;
  hasChanges?: boolean;
}

interface AppContextType {
  // State
  messages: Message[];
  files: FileItem[];
  projects: Project[];
  currentProject: Project | null;
  currentPath: string;
  fileContent: string;
  terminalOutput: string[];
  lastExitCode: number | null;
  isConnected: boolean;
  isLoading: boolean;
  serverUrl: string;
  selectedModel: string;
  modelVariants: ModelVariants;
  availableModels: string[];
  apiKeys: ApiKeys;
  gitStatus: GitStatus | null;
  lastApplied: { undoId: number; path: string; timestamp: number } | null;
  lintErrors: { file: string; line: number; message: string; severity: string }[];

  // Actions
  sendMessage: (content: string) => void;
  navigateToPath: (path: string) => void;
  executeCommand: (command: string) => void;
  setSelectedModel: (model: string) => void;
  setModelVariant: (provider: string, variant: string) => void;
  setCurrentProject: (project: Project) => void;
  setApiKey: (model: string, key: string) => void;
  openFile: (path: string) => void;
  saveFile: (path: string, content: string) => void;
  applyCode: (code: string, filePath: string) => void;
  deleteFile: (filePath: string) => void;
  deleteFolder: (folderPath: string) => void;
  refreshGitStatus: () => void;
  gitCommit: (message: string) => void;
  gitPush: () => void;
  clearHistory: () => void;
  undoLastChange: () => void;
  lintProject: () => void;
}

// ============== CONSTANTS ==============

// 🌐 SERVEUR CLOUD UNIQUEMENT - Pas de localhost
const SERVER_URL = 'https://aether-relay-server-production.up.railway.app';

const DEFAULT_MODEL_VARIANTS: ModelVariants = {
  gemini: 'gemini-1.5-flash',
  openai: 'gpt-4o',
  claude: 'claude-3-5-sonnet-20241022',
  deepseek: 'deepseek-chat',
  grok: 'grok-2-latest',
};

const AVAILABLE_MODELS = ['gemini', 'openai', 'claude', 'deepseek', 'grok'];

// ============== CONTEXT ==============

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Socket connection
  const [socket, setSocket] = useState<any>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [fileContent, setFileContent] = useState<string>('');

  // Terminal state
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [lastExitCode, setLastExitCode] = useState<number | null>(null);

  // Git state
  const [gitStatus, setGitStatus] = useState<GitStatus>({ isRepo: false });

  // Lint state
  const [lintErrors, setLintErrors] = useState<{ file: string; line: number; message: string; severity: string }[]>([]);

  // Connection state
  const [isConnected, setIsConnected] = useState(false);

  // Settings state
  const [selectedModel, setSelectedModelState] = useState('gemini');
  const [apiKeys, setApiKeysState] = useState<ApiKeys>({});
  const [modelVariants, setModelVariantsState] = useState<ModelVariants>(DEFAULT_MODEL_VARIANTS);
  const [lastApplied, setLastApplied] = useState<{ undoId: number; path: string; timestamp: number } | null>(null);

  // Refs for socket callbacks
  const currentProjectRef = useRef<Project | null>(null);
  const currentPathRef = useRef<string>('/');

  useEffect(() => { currentProjectRef.current = currentProject; }, [currentProject]);
  useEffect(() => { currentPathRef.current = currentPath; }, [currentPath]);

  // ============== LOAD SETTINGS ==============

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedModel = await AsyncStorage.getItem('selectedModel');
        const savedApiKeys = await AsyncStorage.getItem('apiKeys');
        const savedVariants = await AsyncStorage.getItem('modelVariants');
        const savedProject = await AsyncStorage.getItem('currentProject');

        if (savedModel) setSelectedModelState(savedModel);
        if (savedApiKeys) {
          try { setApiKeysState(JSON.parse(savedApiKeys)); } catch (e) { }
        }
        if (savedVariants) {
          try { setModelVariantsState(prev => ({ ...prev, ...JSON.parse(savedVariants) })); } catch (e) { }
        }
        if (savedProject) {
          try {
            const parsed = JSON.parse(savedProject);
            if (parsed?.name && parsed?.path) {
              setCurrentProjectState(parsed);
            }
          } catch (e) { }
        }
      } catch (e) {
        console.log('Error loading settings:', e);
      }
    };
    loadSettings();
  }, []);

  // ============== SOCKET CONNECTION ==============

  useEffect(() => {
    console.log('🌐 Connecting to cloud server:', SERVER_URL);

    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 60000,
      forceNew: true,
    });

    // Connection events
    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to cloud server');
      newSocket.emit('register', { type: 'mobile' });
      newSocket.emit('getProjects');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected from cloud server');
    });

    newSocket.on('connect_error', (error: any) => {
      console.log('⚠️ Connection error:', error.message);
      setIsConnected(false);
    });

    // Projects events
    newSocket.on('projects', (data: Project[]) => {
      console.log('📂 Received projects:', data.length);
      setProjects(data);
    });

    // Files events
    newSocket.on('files', (data: FileItem[]) => {
      setFiles(data);
    });

    newSocket.on('fileContent', (data: { content: string }) => {
      console.log('📄 Received file content');
      setFileContent(data.content);
    });

    // AI response events
    newSocket.on('aiResponse', (data: { content: string; codeBlocks?: { language: string; code: string }[] }) => {
      setIsLoading(false);
      const newMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        codeBlocks: data.codeBlocks,
      };
      setMessages(prev => [...prev, newMessage]);
    });

    newSocket.on('error', (error: string) => {
      setIsLoading(false);
      console.error('Socket error:', error);
    });

    // Code apply events
    newSocket.on('codeApplied', (data: { success: boolean; path?: string; message?: string; error?: string; undoId?: number }) => {
      if (data.success) {
        console.log('✅ Code applied:', data.path);
        if (data.undoId && data.path) {
          setLastApplied({ undoId: data.undoId, path: data.path, timestamp: Date.now() });
        }
        Alert.alert('✅ Code Applied!', data.message || `Saved to ${data.path}`);
        if (currentProjectRef.current) {
          newSocket.emit('getFiles', { path: currentPathRef.current || '/', projectPath: currentProjectRef.current.path });
        }
      } else {
        Alert.alert('❌ Apply Failed', data.error || 'Unknown error');
      }
    });

    // Undo events
    newSocket.on('undoResult', (data: { success: boolean; path?: string; message?: string; error?: string }) => {
      if (data.success) {
        Alert.alert('↩️ Undone!', data.message || `Reverted ${data.path}`);
        setLastApplied(null);
        if (currentProjectRef.current) {
          newSocket.emit('getFiles', { path: currentPathRef.current || '/', projectPath: currentProjectRef.current.path });
        }
      } else {
        Alert.alert('❌ Undo Failed', data.error || 'Unknown error');
      }
    });

    // Lint events
    newSocket.on('lintResult', (data: { success: boolean; errors: any[]; totalErrors?: number; error?: string }) => {
      if (data.success) {
        setLintErrors(data.errors || []);
        if (data.errors.length === 0) {
          Alert.alert('✅ No Lint Errors', 'Your project has no lint errors!');
        } else {
          Alert.alert('🔍 Lint Errors Found', `Found ${data.totalErrors || data.errors.length} errors.`);
        }
      } else {
        Alert.alert('❌ Lint Failed', data.error || 'Unknown error');
      }
    });

    // Delete events
    newSocket.on('deleteResult', (data: { success: boolean; path?: string; error?: string }) => {
      if (data.success) {
        Alert.alert('✅ Deleted!', `${data.path} has been deleted`);
        if (currentProjectRef.current) {
          newSocket.emit('getFiles', { path: currentPathRef.current || '/', projectPath: currentProjectRef.current.path });
        }
      } else {
        Alert.alert('❌ Delete Failed', data.error || 'Unknown error');
      }
    });

    // Git events
    newSocket.on('gitStatus', (data: GitStatus) => {
      setGitStatus(data);
    });

    newSocket.on('gitCommitResult', (data: { success: boolean; message?: string; error?: string }) => {
      if (data.success) {
        Alert.alert('✅ Committed!', data.message || 'Changes committed');
        if (currentProjectRef.current) {
          newSocket.emit('gitStatus', { projectPath: currentProjectRef.current.path });
        }
      } else {
        Alert.alert('❌ Commit Failed', data.error || 'Unknown error');
      }
    });

    newSocket.on('gitPushResult', (data: { success: boolean; message?: string; error?: string; suggestion?: string }) => {
      if (data.success) {
        Alert.alert('✅ Pushed!', data.message || 'Changes pushed to remote');
        if (currentProjectRef.current) {
          newSocket.emit('gitStatus', { projectPath: currentProjectRef.current.path });
        }
      } else {
        const errorMsg = data.suggestion ? `${data.error}\n\n💡 ${data.suggestion}` : data.error || 'Unknown error';
        Alert.alert('❌ Push Failed', errorMsg);
      }
    });

    // Conversation history events
    newSocket.on('conversationHistory', (data: { messages: Array<{ role: 'user' | 'assistant'; content: string; createdAt: string }>; projectPath: string }) => {
      console.log(`📜 Received ${data.messages.length} messages from server`);
      if (data.messages.length > 0) {
        const loadedMessages: Message[] = data.messages.map((m, i) => ({
          id: `history-${i}-${Date.now()}`,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));
        setMessages(loadedMessages);
      } else {
        setMessages([]);
      }
    });

    newSocket.on('conversationHistoryCleared', (data: { success: boolean; deleted?: number; error?: string }) => {
      if (data.success) {
        setMessages([]);
        Alert.alert('✅ History Cleared', `${data.deleted} messages deleted`);
      } else {
        Alert.alert('❌ Clear Failed', data.error || 'Unknown error');
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // ============== PROJECT CHANGE EFFECT ==============

  useEffect(() => {
    if (socket && currentProject) {
      socket.emit('getFiles', { path: '/', projectPath: currentProject.path });
      socket.emit('gitStatus', { projectPath: currentProject.path });
      socket.emit('getConversationHistory', { projectPath: currentProject.path });
      setCurrentPath('/');
    }
  }, [socket, currentProject]);

  // ============== ACTIONS ==============

  const sendMessage = useCallback((content: string) => {
    if (!socket || !content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    socket.emit('chat', {
      message: content,
      model: selectedModel,
      modelVariant: modelVariants[selectedModel as keyof ModelVariants],
      projectPath: currentProject?.path,
      apiKey: apiKeys[selectedModel as keyof ApiKeys],
    });
  }, [socket, selectedModel, modelVariants, currentProject, apiKeys]);

  const navigateToPath = useCallback((path: string) => {
    if (!socket || !currentProject) return;
    setCurrentPath(path);
    setFileContent('');
    socket.emit('getFiles', { path, projectPath: currentProject.path });
  }, [socket, currentProject]);

  const openFile = useCallback((path: string) => {
    if (!socket || !currentProject) return;
    socket.emit('getFileContent', { path, projectPath: currentProject.path });
    socket.emit('file:open', { path, projectPath: currentProject.path });
  }, [socket, currentProject]);

  const saveFile = useCallback((path: string, content: string) => {
    if (!socket || !currentProject) return;
    socket.emit('saveFile', { path, content, projectPath: currentProject.path });
    setFileContent(content);
  }, [socket, currentProject]);

  const executeCommand = useCallback((command: string) => {
    if (!socket) return;
    setTerminalOutput(prev => [...prev, `$ ${command}`]);
    setLastExitCode(null);
    socket.emit('terminal', { command, projectPath: currentProject?.path });
    socket.once('terminalOutput', (data: { output: string; exitCode?: number }) => {
      if (data.output) {
        setTerminalOutput(prev => [...prev, ...data.output.split('\n')]);
      }
      if (data.exitCode !== undefined) {
        setLastExitCode(data.exitCode);
      }
    });
  }, [socket, currentProject]);

  const setSelectedModel = useCallback(async (model: string) => {
    setSelectedModelState(model);
    await AsyncStorage.setItem('selectedModel', model);
  }, []);

  const setCurrentProject = useCallback(async (project: Project) => {
    setCurrentProjectState(project);
    await AsyncStorage.setItem('currentProject', JSON.stringify(project));
    if (socket && project) {
      socket.emit('setProject', { name: project.name, path: project.path, folder: project.folder });
    }
  }, [socket]);

  const setApiKey = useCallback(async (model: string, key: string) => {
    const newKeys = { ...apiKeys, [model]: key };
    setApiKeysState(newKeys);
    await AsyncStorage.setItem('apiKeys', JSON.stringify(newKeys));
  }, [apiKeys]);

  const setModelVariant = useCallback(async (provider: string, variant: string) => {
    const newVariants = { ...modelVariants, [provider]: variant };
    setModelVariantsState(newVariants);
    await AsyncStorage.setItem('modelVariants', JSON.stringify(newVariants));
  }, [modelVariants]);

  const applyCode = useCallback((code: string, filePath: string) => {
    if (!socket || !currentProject) return;
    socket.emit('applyCode', { code, filePath, projectPath: currentProject.path });
  }, [socket, currentProject]);

  const deleteFile = useCallback((filePath: string) => {
    if (!socket || !currentProject) return;
    socket.emit('deleteFile', { filePath, projectPath: currentProject.path });
  }, [socket, currentProject]);

  const deleteFolder = useCallback((folderPath: string) => {
    if (!socket || !currentProject) return;
    socket.emit('deleteFolder', { folderPath, projectPath: currentProject.path });
  }, [socket, currentProject]);

  const refreshGitStatus = useCallback(() => {
    if (!socket || !currentProject) return;
    socket.emit('gitStatus', { projectPath: currentProject.path });
  }, [socket, currentProject]);

  const gitCommit = useCallback((message: string) => {
    if (!socket || !currentProject) return;
    socket.emit('gitCommit', { projectPath: currentProject.path, message });
  }, [socket, currentProject]);

  const gitPush = useCallback(() => {
    if (!socket || !currentProject) return;
    socket.emit('gitPush', { projectPath: currentProject.path });
  }, [socket, currentProject]);

  const clearHistory = useCallback(() => {
    if (!socket || !currentProject) return;
    socket.emit('clearConversationHistory', { projectPath: currentProject.path });
  }, [socket, currentProject]);

  const undoLastChange = useCallback(() => {
    if (!socket || !currentProject || !lastApplied) return;
    if (Date.now() - lastApplied.timestamp > 60000) {
      Alert.alert('⏰ Expired', 'Undo window has expired (60 seconds)');
      setLastApplied(null);
      return;
    }
    socket.emit('undoChange', { undoId: lastApplied.undoId, projectPath: currentProject.path });
  }, [socket, currentProject, lastApplied]);

  const lintProject = useCallback(() => {
    if (!socket || !currentProject) return;
    socket.emit('lintProject', { projectPath: currentProject.path });
  }, [socket, currentProject]);

  // ============== CONTEXT VALUE ==============

  return (
    <AppContext.Provider value={{
      messages,
      files,
      projects,
      currentProject,
      currentPath,
      fileContent,
      terminalOutput,
      lastExitCode,
      gitStatus,
      isConnected,
      isLoading,
      serverUrl: SERVER_URL,
      selectedModel,
      availableModels: AVAILABLE_MODELS,
      sendMessage,
      navigateToPath,
      executeCommand,
      setSelectedModel,
      setCurrentProject,
      apiKeys,
      setApiKey,
      modelVariants,
      setModelVariant,
      openFile,
      saveFile,
      applyCode,
      deleteFile,
      deleteFolder,
      refreshGitStatus,
      gitCommit,
      gitPush,
      clearHistory,
      undoLastChange,
      lastApplied,
      lintProject,
      lintErrors,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
