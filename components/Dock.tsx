import React from 'react';
import { Button } from './ui/button';
import { 
  FileText, 
  Upload, 
  Search, 
  BookOpen, 
  Settings, 
  Plus,
  Folder,
  Download,
  Share,
  Archive
} from 'lucide-react';

interface DockProps {
  className?: string;
}

export function Dock({ className = '' }: DockProps) {
  const dockItems = [
    {
      icon: Upload,
      label: 'Upload',
      action: () => console.log('Upload clicked'),
      color: 'text-blue-500 hover:text-blue-600'
    },
    {
      icon: FileText,
      label: 'Documents',
      action: () => console.log('Documents clicked'),
      color: 'text-green-500 hover:text-green-600'
    },
    {
      icon: Search,
      label: 'Search',
      action: () => console.log('Search clicked'),
      color: 'text-purple-500 hover:text-purple-600'
    },
    {
      icon: BookOpen,
      label: 'Library',
      action: () => console.log('Library clicked'),
      color: 'text-orange-500 hover:text-orange-600'
    },
    {
      icon: Folder,
      label: 'Folders',
      action: () => console.log('Folders clicked'),
      color: 'text-yellow-500 hover:text-yellow-600'
    },
    {
      icon: Download,
      label: 'Downloads',
      action: () => console.log('Downloads clicked'),
      color: 'text-indigo-500 hover:text-indigo-600'
    },
    {
      icon: Share,
      label: 'Share',
      action: () => console.log('Share clicked'),
      color: 'text-pink-500 hover:text-pink-600'
    },
    {
      icon: Archive,
      label: 'Archive',
      action: () => console.log('Archive clicked'),
      color: 'text-gray-500 hover:text-gray-600'
    },
    {
      icon: Settings,
      label: 'Settings',
      action: () => console.log('Settings clicked'),
      color: 'text-red-500 hover:text-red-600'
    }
  ];

  return (
    <div className={`bg-background/95 backdrop-blur-sm border border-border rounded-2xl p-4 shadow-lg ${className}`}>
      <div className="flex items-center justify-center space-x-2">
        {dockItems.map((item, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            onClick={item.action}
            className={`h-12 w-12 rounded-xl transition-all duration-200 hover:scale-110 ${item.color} group relative`}
            title={item.label}
          >
            <item.icon className="w-5 h-5" />
            
            {/* Tooltip */}
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-foreground text-background px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
              {item.label}
            </div>
          </Button>
        ))}
        
        {/* Add New Button */}
        <div className="w-px h-8 bg-border mx-2" />
        <Button
          variant="ghost"
          size="sm"
          className="h-12 w-12 rounded-xl transition-all duration-200 hover:scale-110 text-primary hover:text-primary/80 group relative"
          title="Add New"
        >
          <Plus className="w-5 h-5" />
          
          {/* Tooltip */}
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-foreground text-background px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
            Add New
          </div>
        </Button>
      </div>
    </div>
  );
}
