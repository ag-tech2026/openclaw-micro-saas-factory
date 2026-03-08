'use client';

import React, { useState, useEffect, DragEvent, useCallback } from 'react';
import TaskCard from './TaskCard';

interface Task {
  id: string;
  content: string;
  status: 'todo' | 'inprogress' | 'done';
}

const STORAGE_KEY = 'kanban-tasks';
const OVERRIDE_KEY = 'kanban-overrides';

type Column = 'todo' | 'inprogress' | 'done';

interface TaskWithColumn extends Task {
  column: Column;
}

export default function KanbanBoard() {
  const [tasks, setTasks] = useState<TaskWithColumn[]>([]);
  const [newTaskContent, setNewTaskContent] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load manual overrides from localStorage: { [content]: column }
  const loadOverrides = (): Record<string, Column> => {
    if (typeof window === 'undefined') return {};
    try {
      const stored = localStorage.getItem(OVERRIDE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  // Save overrides
  const saveOverrides = (overrides: Record<string, Column>) => {
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides));
  };

  // Poll AUTONOMOUS.md via API and merge with overrides
  const pollAutonomous = useCallback(async () => {
    try {
      const res = await fetch('/api/autonomous');
      if (!res.ok) return;
      const { tasks: autonomousTasks } = await res.json();
      const overrides = loadOverrides();

      const merged: TaskWithColumn[] = autonomousTasks.map(task => {
        // Determine column from status, respecting overrides for non-completed non-inprogress tasks
        let column: Column;
        if (task.status === 'done') {
          column = 'done';
        } else if (task.status === 'inprogress') {
          column = 'inprogress';
        } else {
          // todo status: use override if present, else todo
          column = overrides[task.content] || 'todo';
        }
        return { ...task, column };
      });

      setTasks(merged);
    } catch (error) {
      console.error('Failed to poll autonomous tasks:', error);
    }
  }, []);

  // Initial load: poll + set up polling interval
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      await pollAutonomous();
      if (mounted) setIsLoaded(true);
    };
    load();

    // Then poll every 5 seconds
    const interval = setInterval(pollAutonomous, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pollAutonomous]);

  // Save to localStorage whenever tasks change (for drag-drop state)
  useEffect(() => {
    if (isLoaded && tasks.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
  }, [tasks, isLoaded]);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: DragEvent, targetColumn: Column) => {
    e.preventDefault();
    const taskContent = e.dataTransfer.getData('text/plain');

    setTasks(prevTasks => {
      const newTasks = prevTasks.map(task =>
        task.content === taskContent ? { ...task, column: targetColumn } : task
      );

      // Update overrides: for tasks not in done/inprogress from system, store override
      const overrides = loadOverrides();
      const task = prevTasks.find(t => t.content === taskContent);
      if (task) {
        if (task.status === 'todo') {
          // Allow override
          overrides[taskContent] = targetColumn;
          saveOverrides(overrides);
        } else {
          // If task is done or inprogress from system, remove any override (shouldn't be needed)
          if (overrides[taskContent]) {
            delete overrides[taskContent];
            saveOverrides(overrides);
          }
        }
      }

      return newTasks;
    });
  };

  const handleAddTask = () => {
    if (newTaskContent.trim() === '') return;

    const newTask: TaskWithColumn = {
      id: `task-${Date.now()}`,
      content: newTaskContent.trim(),
      status: 'todo',
      column: 'todo',
    };

    setTasks(prev => [...prev, newTask]);
    setNewTaskContent('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTask();
    }
  };

  const getTasksByColumn = (column: Column) => {
    return tasks.filter(task => task.column === column);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
          Kanban Board
        </h1>

        {/* Add New Task */}
        <div className="mb-8 max-w-3xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTaskContent}
              onChange={(e) => setNewTaskContent(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Add a new task..."
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleAddTask}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Add Task
            </button>
          </div>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* To Do Column */}
          <div
            className="bg-gray-200 rounded-lg p-4 min-h-[500px]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'todo')}
          >
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
              <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
              To Do ({getTasksByColumn('todo').length})
            </h2>
            <div>
              {getTasksByColumn('todo').map(task => (
                <TaskCard
                  key={task.id}
                  id={task.id}
                  content={task.content}
                  column={task.column}
                />
              ))}
              {getTasksByColumn('todo').length === 0 && (
                <p className="text-gray-500 text-sm italic">No tasks</p>
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div
            className="bg-gray-200 rounded-lg p-4 min-h-[500px]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'inprogress')}
          >
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
              <span className="w-3 h-3 bg-blue-400 rounded-full mr-2"></span>
              In Progress ({getTasksByColumn('inprogress').length})
            </h2>
            <div>
              {getTasksByColumn('inprogress').map(task => (
                <TaskCard
                  key={task.id}
                  id={task.id}
                  content={task.content}
                  column={task.column}
                />
              ))}
              {getTasksByColumn('inprogress').length === 0 && (
                <p className="text-gray-500 text-sm italic">No tasks</p>
              )}
            </div>
          </div>

          {/* Done Column */}
          <div
            className="bg-gray-200 rounded-lg p-4 min-h-[500px]"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'done')}
          >
            <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
              <span className="w-3 h-3 bg-green-400 rounded-full mr-2"></span>
              Done ({getTasksByColumn('done').length})
            </h2>
            <div>
              {getTasksByColumn('done').map(task => (
                <TaskCard
                  key={task.id}
                  id={task.id}
                  content={task.content}
                  column={task.column}
                />
              ))}
              {getTasksByColumn('done').length === 0 && (
                <p className="text-gray-500 text-sm italic">No tasks</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
