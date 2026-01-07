/**
 * 🌐 AETHER Mobile - Server-Only Hook
 * Connexion au serveur Railway uniquement
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

interface AppContextType {
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
  gitStatus: any;
  lastApplied: { undoId: number; path: string; timestamp: number } | null;
  lintErrors: any[];
  
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

// 🌐 SERVEUR RAILWAY - URL FIXE
const SERVER_URL = 'https://aether-relay-server-production.up.railway.app';

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [fileContent, setFileContent] = useState<string>('');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [lastExitCode, setLastExitCode] = useState<number | null>(null);
  const [gitStatus, setGitStatus] = useState<any>({ isRepo: false });
  const [lintErrors, setLintErrors] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModelState] = useState('gemini');
  const [apiKeys, setApiKeysState] = useState<ApiKeys>({});
  const [modelVariants, setModelVariantsState] = useState<ModelVariants>({
    gemini: 'gemini-1.5-flash',
    openai: 'gpt-4o',
    claude: 'claude-3-5-sonnet-20241022',
    deepseek: 'deepseek-chat',
    grok: 'grok-2-latest',
  });
  const [lastApplied, setLastApplied] = useState<{ undoId: number; path: string; timestamp: number } | null>(null);

  const currentProjectRef = useRef<Project | null>(null);
  const currentPathRef = useRef<string>('/');

  useEffect(() => { currentProjectRef.current = currentProject; }, [currentProject]);
  useEffect(() => { currentPathRef.current = currentPath; }, [currentPath]);

  // Load settings from storage
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

  // 🌐 Connect to SERVER (Railway)
  useEffect(() => {
    console.log('🌐 Connecting to server:', SERVER_URL);
    
    const newSocket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 60000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('✅ Connected to server');
      newSocket.emit('register', { type: 'mobile' });
      newSocket.emit('getProjects');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('❌ Disconnected');
    });

    newSocket.on('connect_error', (error: any) => {
      console.log('⚠️ Connection error:', error.message);
      setIsConnected(false);
    });

    // Projects
    newSocket.on('projects', (data: Project[]) => {
      console.log('📂 Projects:', data.length);
      setProjects(data);
    });

    // Files
    newSocket.on('files', (data: FileItem[]) => {
      setFiles(data);
    });

    newSocket.on('fileContent', (data: { content: string }) => {
      setFileContent(data.content);
    });

    // AI Response
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
      console.error('Error:', error);
    });

    // Code apply
    newSocket.on('codeApplied', (data: { success: boolean; path?: string; message?: string; error?: string; undoId?: number }) => {
      if (data.success) {
        if (data.undoId && data.path) {
          setLastApplied({ undoId: data.undoId, path: data.path, timestamp: Date.now() });
        }
        Alert.alert('✅ Applied!', data.message || `Saved to ${data.path}`);
      } else {
        Alert.alert('❌ Failed', data.error || 'Unknown error');
      }
    });

    // Terminal
    newSocket.on('terminalOutput', (data: { output: string; exitCode?: number }) => {
      if (data.output) {
        setTerminalOutput(prev => [...prev, ...data.output.split('\n')]);
      }
      if (data.exitCode !== undefined) {
        setLastExitCode(data.exitCode);
      }
    });

    // Git
    newSocket.on('gitStatus', (data: any) => setGitStatus(data));
    newSocket.on('gitCommitResult', (data: any) => {
      if (data.success) {
        Alert.alert('✅ Committed!', data.message);
      } else {
        Alert.alert('❌ Failed', data.error);
      }
    });
    newSocket.on('gitPushResult', (data: any) => {
      if (data.success) {
        Alert.alert('✅ Pushed!', data.message);
      } else {
        Alert.alert('❌ Failed', data.error);
      }
    });

    // Delete
    newSocket.on('deleteResult', (data: { success: boolean; path?: string; error?: string }) => {
      if (data.success) {
        Alert.alert('✅ Deleted!', `${data.path} deleted`);
      } else {
        Alert.alert('❌ Failed', data.error);
      }
    });

    // History
    newSocket.on('conversationHistory', (data: { messages: any[]; projectPath: string }) => {
      if (data.messages.length > 0) {
        const loadedMessages: Message[] = data.messages.map((m, i) => ({
          id: `history-${i}`,
          role: m.role,
          content: m.content,
          timestamp: new Date(m.createdAt),
        }));
        setMessages(loadedMessages);
      } else {
        setMessages([]);
      }
    });

    newSocket.on('conversationHistoryCleared', (data: { success: boolean; deleted?: number }) => {
      if (data.success) {
        setMessages([]);
        Alert.alert('✅ Cleared', `${data.deleted} messages deleted`);
      }
    });

    setSocket(newSocket);
    return () => { newSocket.disconnect(); };
  }, []);

  // Load project data when project changes
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
  }, [socket, currentProject]);

  const setSelectedModel = useCallback(async (model: string) => {
    setSelectedModelState(model);
    await AsyncStorage.setItem('selectedModel', model);
  }, []);

  const setCurrentProject = useCallback(async (project: Project) => {
    setCurrentProjectState(project);
    await AsyncStorage.setItem('currentProject', JSON.stringify(project));
    if (socket) {
      socket.emit('setProject', project);
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
    socket.emit('undoChange', { undoId: lastApplied.undoId, projectPath: currentProject.path });
  }, [socket, currentProject, lastApplied]);

  const lintProject = useCallback(() => {
    if (!socket || !currentProject) return;
    socket.emit('lintProject', { projectPath: currentProject.path });
  }, [socket, currentProject]);

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
      availableModels: ['gemini', 'openai', 'claude', 'deepseek', 'grok'],
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
