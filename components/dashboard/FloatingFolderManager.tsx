import React, { useState } from 'react';
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
  FolderEdit,
  FolderX,
  MoreHorizontal,
  Settings,
  Plus,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  FileText,
  Move,
  Copy,
  Trash2,
  Archive,
  Star,
  Lock,
  Unlock,
  Share,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import type { Document } from '../Dashboard';

interface FolderData {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  isStarred?: boolean;
  isLocked?: boolean;
  isShared?: boolean;
  parentId?: string;
  children?: FolderData[];
  documentCount: number;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

interface FloatingFolderManagerProps {
  documents: Document[];
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  onFolderSelect?: (folderId: string | null) => void;
  selectedFolderId?: string | null;
}

const defaultFolders: FolderData[] = [
  {
    id: 'recent',
    name: 'Recent Documents',
    description: 'Recently accessed documents',
    color: 'blue',
    icon: '🕒',
    documentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['system', 'recent']
  },
  {
    id: 'starred',
    name: 'Starred',
    description: 'Your favorite documents',
    color: 'yellow',
    icon: '⭐',
    isStarred: true,
    documentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['system', 'favorites']
  },
  {
    id: 'shared',
    name: 'Shared with Me',
    description: 'Documents shared by others',
    color: 'green',
    icon: '👥',
    isShared: true,
    documentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['system', 'shared']
  },
  {
    id: 'research',
    name: 'Research Papers',
    description: 'Academic research documents',
    color: 'purple',
    icon: '📚',
    documentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['research', 'academic'],
    children: [
      {
        id: 'research-cs',
        name: 'Computer Science',
        parentId: 'research',
        documentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'research-physics',
        name: 'Physics',
        parentId: 'research',
        documentCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    ]
  },
  {
    id: 'projects',
    name: 'Projects',
    description: 'Project-related documents',
    color: 'orange',
    icon: '📁',
    documentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['projects', 'work']
  },
  {
    id: 'archive',
    name: 'Archive',
    description: 'Archived documents',
    color: 'gray',
    icon: '📦',
    documentCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    tags: ['system', 'archive']
  }
];

export function FloatingFolderManager({ 
  documents, 
  isMinimized = false, 
  onToggleMinimize,
  onFolderSelect,
  selectedFolderId 
}: FloatingFolderManagerProps) {
  const [folders, setFolders] = useState<FolderData[]>(defaultFolders);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['research', 'projects']));
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderData | null>(null);
  const [newFolderData, setNewFolderData] = useState({
    name: '',
    description: '',
    color: 'blue',
    icon: '📁',
    parentId: ''
  });

  // Update document counts for folders (simulated logic)
  const updateFolderCounts = () => {
    const updatedFolders = folders.map(folder => {
      let count = 0;
      
      // Calculate document count based on folder type and documents
      switch (folder.id) {
        case 'recent':
          count = documents.filter(doc => {
            const daysSinceCreated = Math.floor((Date.now() - doc.createdAt.getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceCreated <= 7;
          }).length;
          break;
        case 'starred':
          count = documents.filter(doc => doc.tags.includes('starred')).length;
          break;
        case 'shared':
          count = documents.filter(doc => doc.url.includes('drive.google.com')).length;
          break;
        case 'research':
          count = documents.filter(doc => 
            doc.category === 'Computer Science' || 
            doc.category === 'Physics' || 
            doc.category === 'Medical Science'
          ).length;
          break;
        case 'research-cs':
          count = documents.filter(doc => doc.category === 'Computer Science').length;
          break;
        case 'research-physics':
          count = documents.filter(doc => doc.category === 'Physics').length;
          break;
        case 'projects':
          count = documents.filter(doc => doc.tags.some(tag => 
            tag.toLowerCase().includes('project') || 
            tag.toLowerCase().includes('work')
          )).length;
          break;
        case 'archive':
          count = documents.filter(doc => doc.tags.includes('archived')).length;
          break;
        default:
          count = documents.filter(doc => doc.tags.includes(folder.id)).length;
      }

      return { ...folder, documentCount: count };
    });
    
    setFolders(updatedFolders);
  };

  // Update counts when documents change
  React.useEffect(() => {
    updateFolderCounts();
  }, [documents]);

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
      // Add as child folder
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
      // Add as root folder
      setFolders(prev => [...prev, newFolder]);
    }

    setNewFolderData({ name: '', description: '', color: 'blue', icon: '📁', parentId: '' });
    setIsCreateDialogOpen(false);
  };

  const handleEditFolder = (folder: FolderData) => {
    setEditingFolder(folder);
    setNewFolderData({
      name: folder.name,
      description: folder.description || '',
      color: folder.color || 'blue',
      icon: folder.icon || '📁',
      parentId: folder.parentId || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateFolder = () => {
    if (!editingFolder) return;

    setFolders(prev => prev.map(folder => {
      if (folder.id === editingFolder.id) {
        return {
          ...folder,
          name: newFolderData.name,
          description: newFolderData.description,
          color: newFolderData.color,
          icon: newFolderData.icon,
          updatedAt: new Date()
        };
      }
      // Also update in children
      if (folder.children) {
        return {
          ...folder,
          children: folder.children.map(child => 
            child.id === editingFolder.id 
              ? { ...child, name: newFolderData.name, description: newFolderData.description, updatedAt: new Date() }
              : child
          )
        };
      }
      return folder;
    }));

    setEditingFolder(null);
    setNewFolderData({ name: '', description: '', color: 'blue', icon: '📁', parentId: '' });
    setIsEditDialogOpen(false);
  };

  const handleDeleteFolder = (folderId: string) => {
    setFolders(prev => prev.filter(folder => {
      if (folder.id === folderId) return false;
      if (folder.children) {
        folder.children = folder.children.filter(child => child.id !== folderId);
      }
      return true;
    }));
  };

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    folder.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const FolderItem = ({ folder, level = 0 }: { folder: FolderData; level?: number }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    const isSelected = selectedFolderId === folder.id;

    return (
      <div>
        <div
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer group transition-colors ${
            isSelected ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800' : ''
          }`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => onFolderSelect?.(folder.id)}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </button>
          )}
          
          {/* Folder Icon */}
          <div className="flex-shrink-0">
            {folder.icon ? (
              <span className="text-sm">{folder.icon}</span>
            ) : hasChildren ? (
              isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />
            ) : (
              <Folder className="w-4 h-4" />
            )}
          </div>

          {/* Folder Name */}
          <span className="text-sm flex-1 truncate">
            {folder.name}
          </span>

          {/* Document Count */}
          {folder.documentCount > 0 && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
              {folder.documentCount}
            </Badge>
          )}

          {/* Folder Actions */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleEditFolder(folder)}>
                  <FolderEdit className="w-4 h-4 mr-2" />
                  Edit Folder
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Add Subfolder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Star className="w-4 h-4 mr-2" />
                  {folder.isStarred ? 'Unstar' : 'Star'}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Share className="w-4 h-4 mr-2" />
                  Share Folder
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Move className="w-4 h-4 mr-2" />
                  Move
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => handleDeleteFolder(folder.id)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Child Folders */}
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {folder.children!.map((child) => (
              <FolderItem key={child.id} folder={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={onToggleMinimize}
          className="rounded-full w-12 h-12 shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Folder className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* Floating Folder Manager */}
      <div className="fixed bottom-4 right-4 z-50 w-80">
        <Card className="shadow-2xl border-2 bg-background/98 backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border bg-card/50">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-blue-600" />
              <h3 className="font-medium text-sm">Folder Manager</h3>
              <Badge variant="secondary" className="text-xs">{folders.length}</Badge>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setIsCreateDialogOpen(true)}
                title="Create New Folder"
              >
                <Plus className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onToggleMinimize}
                title="Close"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <CardContent className="p-3 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                placeholder="Search folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-sm"
              />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs flex-1">
                <RefreshCw className="w-3 h-3 mr-1" />
                Sync
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs flex-1">
                <Upload className="w-3 h-3 mr-1" />
                Import
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs flex-1">
                <Settings className="w-3 h-3 mr-1" />
                Settings
              </Button>
            </div>

            {/* Folder List with Enhanced Scroll */}
            <div className="relative">
              <ScrollArea className="h-72 pr-2">
                <div className="space-y-0.5">
                  {filteredFolders.map((folder) => (
                    <FolderItem key={folder.id} folder={folder} />
                  ))}
                </div>

                {filteredFolders.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      {searchQuery ? 'No folders match your search' : 'No folders found'}
                    </p>
                    {!searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setIsCreateDialogOpen(true)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Create First Folder
                      </Button>
                    )}
                  </div>
                )}
              </ScrollArea>
              
              {/* Scroll Indicators */}
              {filteredFolders.length > 8 && (
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
              )}
            </div>

            {/* Footer Stats */}
            <Separator />
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
              <Textarea
                id="folder-description"
                placeholder="Enter folder description..."
                value={newFolderData.description}
                onChange={(e) => setNewFolderData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
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
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newFolderData.color}
                  onChange={(e) => setNewFolderData(prev => ({ ...prev, color: e.target.value }))}
                >
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="yellow">Yellow</option>
                  <option value="red">Red</option>
                  <option value="purple">Purple</option>
                  <option value="orange">Orange</option>
                  <option value="gray">Gray</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent-folder">Parent Folder (Optional)</Label>
              <select
                id="parent-folder"
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newFolderData.parentId}
                onChange={(e) => setNewFolderData(prev => ({ ...prev, parentId: e.target.value }))}
              >
                <option value="">None (Root Level)</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.icon} {folder.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderData.name.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Folder Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Folder</DialogTitle>
            <DialogDescription>
              Update folder details and settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-folder-name">Folder Name</Label>
              <Input
                id="edit-folder-name"
                placeholder="Enter folder name..."
                value={newFolderData.name}
                onChange={(e) => setNewFolderData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-folder-description">Description</Label>
              <Textarea
                id="edit-folder-description"
                placeholder="Enter folder description..."
                value={newFolderData.description}
                onChange={(e) => setNewFolderData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-folder-icon">Icon</Label>
                <Input
                  id="edit-folder-icon"
                  placeholder="📁"
                  value={newFolderData.icon}
                  onChange={(e) => setNewFolderData(prev => ({ ...prev, icon: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-folder-color">Color</Label>
                <select
                  id="edit-folder-color"
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newFolderData.color}
                  onChange={(e) => setNewFolderData(prev => ({ ...prev, color: e.target.value }))}
                >
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="yellow">Yellow</option>
                  <option value="red">Red</option>
                  <option value="purple">Purple</option>
                  <option value="orange">Orange</option>
                  <option value="gray">Gray</option>
                </select>
              </div>
            </div>

            {editingFolder && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label>Folder Settings</Label>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Starred</Label>
                      <p className="text-xs text-muted-foreground">Pin to favorites</p>
                    </div>
                    <Switch checked={editingFolder.isStarred || false} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Shared</Label>
                      <p className="text-xs text-muted-foreground">Allow others to access</p>
                    </div>
                    <Switch checked={editingFolder.isShared || false} />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm">Locked</Label>
                      <p className="text-xs text-muted-foreground">Prevent modifications</p>
                    </div>
                    <Switch checked={editingFolder.isLocked || false} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateFolder} disabled={!newFolderData.name.trim()}>
              Update Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
