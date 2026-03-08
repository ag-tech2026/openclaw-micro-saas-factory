'use client';

import React from 'react';

interface TaskCardProps {
  id: string;
  content: string;
  column: 'todo' | 'inprogress' | 'done';
  onDelete?: (id: string) => void;
}

export default function TaskCard({ id, content, column }: TaskCardProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const bgColors = {
    todo: 'bg-white',
    inprogress: 'bg-blue-50',
    done: 'bg-green-50'
  };

  const borderColors = {
    todo: 'border-l-4 border-l-yellow-400',
    inprogress: 'border-l-4 border-l-blue-400',
    done: 'border-l-4 border-l-green-400'
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={`p-3 mb-3 rounded-lg shadow-sm ${bgColors[column]} ${borderColors[column]} cursor-move hover:shadow-md transition-shadow`}
    >
      <p className="text-gray-800 text-sm">{content}</p>
    </div>
  );
}
