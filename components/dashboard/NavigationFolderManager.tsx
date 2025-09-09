'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import {
  Folder,
  FolderPlus,
  FolderOpen,
  Plus,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  Settings,
  RefreshCw,
  Upload,
  MoreHorizontal,
  Edit3,
  Trash2,
  Move
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';

interface Document {
  id: string;
  title: string;
  author: string;
  pageCount: number;
  category: string;
  thumbnail: string;
  url: string;
  createdAt: Date;
  tags: string[];
}

interface FolderData {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string;
  documentCount: number;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  children?: FolderData[];
}

interface NavigationFolderManagerProps {
  documents: Document[];
  isOpen: boolean;
  onClose: () => void;
}

interface DragData {
  type: 'document' | 'folder';
  data: Document | FolderData;
  sourceType: 'dashboard' | 'library';
}

export function NavigationFolderManager({ documents, isOpen, onClose }: NavigationFolderManagerProps) {
  const [folders, setFolders] = useState<FolderData[]>([
    {
      id: 'academic',
      name: 'Academic Papers',
      description: 'Research papers and academic documents',
      color: 'blue',
      icon: '📚',
      documentCount: 12,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['academic', 'research'],
      children: [
        {
          id: 'cs-papers',
          name: 'Computer Science',
          documentCount: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: ['cs', 'technology'],
          parentId: 'academic'
        },
        {
          id: 'physics-papers',
          name: 'Physics',
          documentCount: 4,
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: ['physics', 'science'],
          parentId: 'academic'
        }
      ]
    },
    {
      id: 'projects',
      name: 'Project Documents',
      description: 'Project specifications and documentation',
      color: 'green',
      icon: '📁',
      documentCount: 6,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['projects', 'documentation']
    },
    {
      id: 'references',
      name: 'References',
      description: 'Books, manuals, and reference materials',
      color: 'purple',
      icon: '📖',
      documentCount: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['reference', 'books']
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['academic']));
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newFolderData, setNewFolderData] = useState({
    name: '',
    description: '',
    color: 'blue',
    icon: '📁',
    parentId: ''
  });
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [dragData, setDragData] = useState<DragData | null>(null);

  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Filter folders based on search
  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleCreateFolder = () => {
    const newFolder: FolderData = {
      id: `custom-${Date.now()}`,
      name: newFolderData.name,
      description: newFolderData.description,
      color: newFolderData.color,
      icon: newFolderData.icon,
      parentId: newFolderData.parentId || undefined,
      documentCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['custom']
    };

    if (newFolderData.parentId) {
      setFolders(prev => prev.map(folder => {
        if (folder.id === newFolderData.parentId) {
          return {
            ...folder,
            children: [...(folder.children || []), newFolder]
          };
        }
        return folder;
      }));
    } else {
      setFolders(prev => [...prev, newFolder]);
    }

    setNewFolderData({ name: '', description: '', color: 'blue', icon: '📁', parentId: '' });
    setIsCreateDialogOpen(false);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'document' | 'folder', data: Document | FolderData, sourceType: 'dashboard' | 'library') => {
    const dragData: DragData = { type, data, sourceType };
    setDragData(dragData);
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, folderId?: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (folderId && folderId !== dragOverFolder) {
      setDragOverFolder(folderId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolder(null);
  };

  const handleDrop = (e: React.DragEvent, targetFolderId?: string) => {
    e.preventDefault();
    setDragOverFolder(null);
    
    try {
      const dragDataStr = e.dataTransfer.getData('application/json');
      const dragData: DragData = JSON.parse(dragDataStr);
      
      if (dragData.type === 'document') {
        // Handle document drop
        console.log(`Moving document ${dragData.data.id} to folder ${targetFolderId}`);
        // Update folder document count
        if (targetFolderId) {
          setFolders(prev => prev.map(folder => {
            if (folder.id === targetFolderId) {
              return { ...folder, documentCount: folder.documentCount + 1 };
            }
            return folder;
          }));
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
    
    setDragData(null);
  };

  const FolderItem = ({ folder, level = 0 }: { folder: FolderData; level?: number }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    const isBeingDraggedOver = dragOverFolder === folder.id;

    return (
      <div>
        <div
          className={`flex items-center justify-between py-2 px-2 rounded-md cursor-pointer transition-all ${
            isBeingDraggedOver ? 'bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-400 border-dashed' : 'hover:bg-muted/50'
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
        >
          <div className="flex items-center space-x-2 flex-1">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={() => toggleFolder(folder.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
            {!hasChildren && <div className="w-4" />}
            
            <div className="flex items-center space-x-2">
              {isExpanded && hasChildren ? (
                <FolderOpen className="h-4 w-4 text-blue-600" />
              ) : (
                <Folder className="h-4 w-4 text-blue-600" />
              )}
              <span className="text-sm font-medium">{folder.name}</span>
              <Badge variant="secondary" className="text-xs">
                {folder.documentCount}
              </Badge>
            </div>
          </div>
          
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {folder.children!.map((child) => (
              <FolderItem key={child.id} folder={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      
      {/* Sliding Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-96 bg-background border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out">
        <Card className="h-full rounded-none border-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
            <div className="flex items-center gap-2">
              <Folder className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold">Folder Manager</h3>
              <Badge variant="secondary">{folders.length}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setIsCreateDialogOpen(true)}
                title="Create New Folder"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={onClose}
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <CardContent className="p-4 space-y-4 h-full overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>

            {/* Drop Zone Hint */}
            {dragData && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 border-dashed rounded-lg p-3 text-center">
                <Move className="w-6 h-6 mx-auto mb-1 text-blue-600" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Drop {dragData.type} here to organize
                </p>
              </div>
            )}

            {/* Folder List */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full pr-2">
                <div className="space-y-1">
                  {filteredFolders.map((folder) => (
                    <FolderItem key={folder.id} folder={folder} />
                  ))}
                </div>

                {filteredFolders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm mb-2">
                      {searchQuery ? 'No folders match your search' : 'No folders found'}
                    </p>
                    {!searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCreateDialogOpen(true)}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Folder
                      </Button>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Footer Stats */}
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Total Folders:</span>
                  <span className="font-medium">{folders.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Documents:</span>
                  <span className="font-medium">{documents.length}</span>
                </div>
                {searchQuery && (
                  <div className="flex justify-between">
                    <span>Filtered:</span>
                    <span className="font-medium">{filteredFolders.length}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Folder Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder to organize your documents.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="Enter folder name..."
                value={newFolderData.name}
                onChange={(e) => setNewFolderData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="folder-description">Description (Optional)</Label>
              <Input
                id="folder-description"
                placeholder="Enter folder description..."
                value={newFolderData.description}
                onChange={(e) => setNewFolderData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="folder-icon">Icon</Label>
                <Input
                  id="folder-icon"
                  placeholder="📁"
                  value={newFolderData.icon}
                  onChange={(e) => setNewFolderData(prev => ({ ...prev, icon: e.target.value }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="folder-color">Color</Label>
                <select
                  id="folder-color"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background"
                  value={newFolderData.color}
                  onChange={(e) => setNewFolderData(prev => ({ ...prev, color: e.target.value }))}
                >
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="purple">Purple</option>
                  <option value="red">Red</option>
                  <option value="orange">Orange</option>
                </select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFolder}
              disabled={!newFolderData.name.trim()}
            >
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
