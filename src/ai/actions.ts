/**
 * 🎯 Agent Actions - Structured action definitions for AETHER agent
 *
 * Defines the actions the agent can perform with JSON schema validation
 */

// Action types that the agent can perform
export type ActionType =
    | 'write_file'      // Create or update a file
    | 'delete_file'     // Delete a file
    | 'run_command'     // Execute a terminal command
    | 'read_file'       // Request to read a file's content
    | 'search_code'     // Search for patterns in codebase
    | 'git_operation'   // Git commands (status, commit, push, etc.)
    | 'explain'         // Just explain something (no action needed)
    | 'ask_question';   // Ask user for clarification

// Base action interface
export interface AgentAction {
    id: string;
    type: ActionType;
    description: string;
    status: 'pending' | 'executing' | 'completed' | 'failed';
    timestamp: number;
}

// Specific action types
export interface WriteFileAction extends AgentAction {
    type: 'write_file';
    data: {
        path: string;
        content: string;
        language: string;
        isNew: boolean;
    };
}

export interface DeleteFileAction extends AgentAction {
    type: 'delete_file';
    data: {
        path: string;
        reason: string;
    };
}

export interface RunCommandAction extends AgentAction {
    type: 'run_command';
    data: {
        command: string;
        workingDirectory?: string;
        requiresConfirmation: boolean;
    };
}

export interface ReadFileAction extends AgentAction {
    type: 'read_file';
    data: {
        path: string;
        reason: string;
    };
}

export interface SearchCodeAction extends AgentAction {
    type: 'search_code';
    data: {
        pattern: string;
        fileTypes?: string[];
        directory?: string;
    };
}

export interface GitOperationAction extends AgentAction {
    type: 'git_operation';
    data: {
        operation: 'status' | 'commit' | 'push' | 'pull' | 'branch' | 'checkout';
        args?: Record<string, string>;
    };
}

export interface ExplainAction extends AgentAction {
    type: 'explain';
    data: {
        topic: string;
        explanation: string;
    };
}

export interface AskQuestionAction extends AgentAction {
    type: 'ask_question';
    data: {
        question: string;
        options?: string[];
        context: string;
    };
}

// Union type for all actions
export type AnyAction =
    | WriteFileAction
    | DeleteFileAction
    | RunCommandAction
    | ReadFileAction
    | SearchCodeAction
    | GitOperationAction
    | ExplainAction
    | AskQuestionAction;

// Agent response structure
export interface AgentResponse {
    message: string;           // Human-readable response
    actions: AnyAction[];      // Structured actions to execute
    thinking?: string;         // Agent's reasoning (optional, for debugging)
    requiresFollowUp: boolean; // Whether agent needs more info
}

// Action result for feedback loop
export interface ActionResult {
    actionId: string;
    success: boolean;
    output?: string;
    error?: string;
    timestamp: number;
}

// Generate unique action ID
export function generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Parse code blocks from AI response to extract actions
export function parseActionsFromResponse(content: string): AnyAction[] {
    const actions: AnyAction[] = [];

    // Pattern for code blocks with language
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
        const language = match[1] || 'text';
        const codeContent = match[2].trim();

        // Check if it's a bash/shell command
        if (language === 'bash' || language === 'sh' || language === 'shell') {
            actions.push({
                id: generateActionId(),
                type: 'run_command',
                description: `Execute: ${codeContent.split('\n')[0]}`,
                status: 'pending',
                timestamp: Date.now(),
                data: {
                    command: codeContent,
                    requiresConfirmation: true
                }
            });
        }
        // Check if first line looks like a file path
        else if (codeContent.startsWith('//') || codeContent.startsWith('#')) {
            const firstLine = codeContent.split('\n')[0];
            const pathMatch = firstLine.match(/^(?:\/\/|#)\s*(.+\.\w+)/);

            if (pathMatch) {
                const filePath = pathMatch[1].trim();
                const fileContent = codeContent.split('\n').slice(1).join('\n');

                actions.push({
                    id: generateActionId(),
                    type: 'write_file',
                    description: `Write file: ${filePath}`,
                    status: 'pending',
                    timestamp: Date.now(),
                    data: {
                        path: filePath,
                        content: fileContent,
                        language,
                        isNew: true // Will be determined by client
                    }
                });
            }
        }
    }

    // Check for delete file requests
    const deletePatterns = [
        /(?:supprime|delete|remove)\s+(?:le fichier|the file|file)?\s*[`'"]([\w\/\.\-]+)[`'"]/gi,
        /(?:supprime|delete|remove)\s+([\w\/\.\-]+\.\w+)/gi
    ];

    for (const pattern of deletePatterns) {
        let deleteMatch;
        while ((deleteMatch = pattern.exec(content)) !== null) {
            const filePath = deleteMatch[1];
            if (!actions.some(a => a.type === 'delete_file' && (a as DeleteFileAction).data.path === filePath)) {
                actions.push({
                    id: generateActionId(),
                    type: 'delete_file',
                    description: `Delete file: ${filePath}`,
                    status: 'pending',
                    timestamp: Date.now(),
                    data: {
                        path: filePath,
                        reason: 'Requested by user/agent'
                    }
                });
            }
        }
    }

    // Check for git operations
    const gitPatterns = [
        { regex: /git\s+status/gi, operation: 'status' as const },
        { regex: /git\s+commit\s+-m\s+["']([^"']+)["']/gi, operation: 'commit' as const },
        { regex: /git\s+push/gi, operation: 'push' as const },
        { regex: /git\s+pull/gi, operation: 'pull' as const }
    ];

    for (const { regex, operation } of gitPatterns) {
        if (regex.test(content)) {
            actions.push({
                id: generateActionId(),
                type: 'git_operation',
                description: `Git ${operation}`,
                status: 'pending',
                timestamp: Date.now(),
                data: {
                    operation
                }
            });
        }
    }

    return actions;
}

// Create action from structured data
export function createAction<T extends AnyAction['type']>(
    type: T,
    description: string,
    data: Extract<AnyAction, { type: T }>['data']
): Extract<AnyAction, { type: T }> {
    return {
        id: generateActionId(),
        type,
        description,
        status: 'pending',
        timestamp: Date.now(),
        data
    } as Extract<AnyAction, { type: T }>;
}

// Validate action data
export function validateAction(action: AnyAction): { valid: boolean; error?: string } {
    switch (action.type) {
        case 'write_file':
            if (!action.data.path) return { valid: false, error: 'File path is required' };
            if (!action.data.content) return { valid: false, error: 'File content is required' };
            break;
        case 'delete_file':
            if (!action.data.path) return { valid: false, error: 'File path is required' };
            break;
        case 'run_command':
            if (!action.data.command) return { valid: false, error: 'Command is required' };
            break;
        case 'read_file':
            if (!action.data.path) return { valid: false, error: 'File path is required' };
            break;
        case 'git_operation':
            if (!action.data.operation) return { valid: false, error: 'Git operation is required' };
            break;
    }
    return { valid: true };
}
