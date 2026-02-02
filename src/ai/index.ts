/**
 * 🤖 AI Module - Export all AI-related functionality
 */

export { callAI, clearHistory, getTaskStatus, getProjectTasks, recordActionResult } from './router.js';
export {
    ActionType,
    AgentAction,
    AnyAction,
    AgentResponse,
    ActionResult,
    WriteFileAction,
    DeleteFileAction,
    RunCommandAction,
    ReadFileAction,
    SearchCodeAction,
    GitOperationAction,
    ExplainAction,
    AskQuestionAction,
    parseActionsFromResponse,
    createAction,
    validateAction,
    generateActionId
} from './actions.js';
export { taskQueue, Task, TaskSummary } from './taskQueue.js';
