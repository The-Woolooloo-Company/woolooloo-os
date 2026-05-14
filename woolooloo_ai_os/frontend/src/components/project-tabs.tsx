'use client';

import { LinearProject } from '@/lib/linear';

interface ProjectTabsProps {
  projects: LinearProject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function ProjectTabs({ projects, selectedId, onSelect }: ProjectTabsProps) {
  return (
    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
          selectedId === null
            ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        All Projects
      </button>
      {projects.map(project => (
        <button
          key={project.id}
          onClick={() => onSelect(project.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
            selectedId === project.id
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
          {project.key}: {project.title}
        </button>
      ))}
    </div>
  );
}
