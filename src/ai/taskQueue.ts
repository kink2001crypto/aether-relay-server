/**
 * 📋 Task Queue - Manages agent tasks and action execution
 *
 * Provides a queue system for tracking agent actions with:
 * - Task creation and management
 * - Status tracking
 * - Feedback loop for action results
 * - History persistence
 */

import { AnyAction, ActionResult, AgentResponse } from './actions';

// Task represents a complete agent interaction
export interface Task {
    id: string;
    projectPath: string;
    userMessage: string;
    agentResponse: AgentResponse;
    actions: AnyAction[];
    results: ActionResult[];
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    createdAt: number;
    updatedAt: number;
    completedAt?: number;
}

// Task summary for quick overview
export interface TaskSummary {
    id: string;
    projectPath: string;
    status: Task['status'];
    totalActions: number;
    completedActions: number;
    failedActions: number;
    createdAt: number;
}

class TaskQueueManager {
    private tasks: Map<string, Task> = new Map();
    private tasksByProject: Map<string, string[]> = new Map();
    private maxTasksPerProject = 100;

    // Generate unique task ID
    private generateTaskId(): string {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Create a new task
    createTask(
        projectPath: string,
        userMessage: string,
        agentResponse: AgentResponse
    ): Task {
        const task: Task = {
            id: this.generateTaskId(),
            projectPath,
            userMessage,
            agentResponse,
            actions: [...agentResponse.actions],
            results: [],
            status: 'pending',
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        this.tasks.set(task.id, task);

        // Track by project
        const projectTasks = this.tasksByProject.get(projectPath) || [];
        projectTasks.push(task.id);

        // Limit tasks per project
        if (projectTasks.length > this.maxTasksPerProject) {
            const oldTaskId = projectTasks.shift();
            if (oldTaskId) this.tasks.delete(oldTaskId);
        }

        this.tasksByProject.set(projectPath, projectTasks);

        console.log(`📋 Task created: ${task.id} with ${task.actions.length} actions`);
        return task;
    }

    // Get task by ID
    getTask(taskId: string): Task | undefined {
        return this.tasks.get(taskId);
    }

    // Get tasks for a project
    getProjectTasks(projectPath: string, limit = 20): Task[] {
        const taskIds = this.tasksByProject.get(projectPath) || [];
        return taskIds
            .slice(-limit)
            .map(id => this.tasks.get(id))
            .filter((t): t is Task => t !== undefined)
            .reverse(); // Most recent first
    }

    // Get pending actions for a task
    getPendingActions(taskId: string): AnyAction[] {
        const task = this.tasks.get(taskId);
        if (!task) return [];

        const completedActionIds = new Set(task.results.map(r => r.actionId));
        return task.actions.filter(a => !completedActionIds.has(a.id));
    }

    // Start task execution
    startTask(taskId: string): boolean {
        const task = this.tasks.get(taskId);
        if (!task || task.status !== 'pending') return false;

        task.status = 'in_progress';
        task.updatedAt = Date.now();

        // Mark all actions as pending
        task.actions.forEach(action => {
            action.status = 'pending';
        });

        console.log(`▶️ Task started: ${taskId}`);
        return true;
    }

    // Record action result
    recordActionResult(taskId: string, result: ActionResult): boolean {
        const task = this.tasks.get(taskId);
        if (!task) return false;

        // Find and update the action
        const action = task.actions.find(a => a.id === result.actionId);
        if (action) {
            action.status = result.success ? 'completed' : 'failed';
        }

        // Add result
        task.results.push(result);
        task.updatedAt = Date.now();

        // Check if all actions are complete
        const pendingActions = this.getPendingActions(taskId);
        if (pendingActions.length === 0) {
            const hasFailures = task.results.some(r => !r.success);
            task.status = hasFailures ? 'failed' : 'completed';
            task.completedAt = Date.now();
            console.log(`✅ Task completed: ${taskId} (${task.status})`);
        }

        return true;
    }

    // Cancel a task
    cancelTask(taskId: string): boolean {
        const task = this.tasks.get(taskId);
        if (!task) return false;

        task.status = 'cancelled';
        task.updatedAt = Date.now();
        task.completedAt = Date.now();

        // Mark pending actions as cancelled
        task.actions.forEach(action => {
            if (action.status === 'pending' || action.status === 'executing') {
                action.status = 'failed';
            }
        });

        console.log(`❌ Task cancelled: ${taskId}`);
        return true;
    }

    // Get task summary
    getTaskSummary(taskId: string): TaskSummary | undefined {
        const task = this.tasks.get(taskId);
        if (!task) return undefined;

        return {
            id: task.id,
            projectPath: task.projectPath,
            status: task.status,
            totalActions: task.actions.length,
            completedActions: task.results.filter(r => r.success).length,
            failedActions: task.results.filter(r => !r.success).length,
            createdAt: task.createdAt
        };
    }

    // Get all summaries for a project
    getProjectTaskSummaries(projectPath: string, limit = 20): TaskSummary[] {
        return this.getProjectTasks(projectPath, limit)
            .map(t => this.getTaskSummary(t.id))
            .filter((s): s is TaskSummary => s !== undefined);
    }

    // Clear old tasks (retention in ms, default 24h)
    cleanup(retentionMs = 24 * 60 * 60 * 1000): number {
        const cutoff = Date.now() - retentionMs;
        let cleaned = 0;

        for (const [taskId, task] of this.tasks) {
            if (task.completedAt && task.completedAt < cutoff) {
                this.tasks.delete(taskId);

                // Remove from project index
                const projectTasks = this.tasksByProject.get(task.projectPath);
                if (projectTasks) {
                    const index = projectTasks.indexOf(taskId);
                    if (index > -1) projectTasks.splice(index, 1);
                }

                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} old tasks`);
        }

        return cleaned;
    }

    // Get statistics
    getStats(): {
        totalTasks: number;
        byStatus: Record<Task['status'], number>;
        byProject: Record<string, number>;
    } {
        const stats = {
            totalTasks: this.tasks.size,
            byStatus: {
                pending: 0,
                in_progress: 0,
                completed: 0,
                failed: 0,
                cancelled: 0
            } as Record<Task['status'], number>,
            byProject: {} as Record<string, number>
        };

        for (const task of this.tasks.values()) {
            stats.byStatus[task.status]++;
            stats.byProject[task.projectPath] = (stats.byProject[task.projectPath] || 0) + 1;
        }

        return stats;
    }
}

// Singleton instance
export const taskQueue = new TaskQueueManager();

// Cleanup interval (every hour)
setInterval(() => {
    taskQueue.cleanup();
}, 60 * 60 * 1000);
