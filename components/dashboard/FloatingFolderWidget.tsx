'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
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
  Move,
  Minimize2,
  Maximize2,
  Cloud,
  CloudOff,
  ChevronLeft,
  Minus
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useAuth } from '../AuthContext';
import { useGoogleDrive, DriveFile } from '../GoogleDriveService';
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

interface FloatingFolderWidgetProps {
  documents: Document[];
}

export function FloatingFolderWidget({ documents }: FloatingFolderWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(true); // Start minimized
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 120 }); // Higher position for downward expansion
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  
  // Remove local folder states, only use Google Drive
  // const [folders, setFolders] = useState<FolderData[]>([]);
  // const [folderDocuments, setFolderDocuments] = useState<{ [folderId: string]: Document[] }>({});
  // const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  // const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  
  // Google Drive integration states
  const [isConnectedToDrive, setIsConnectedToDrive] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [showDriveDialog, setShowDriveDialog] = useState(false);
  const [driveFolders, setDriveFolders] = useState<DriveFile[]>([]);
  const [selectedDriveFolder, setSelectedDriveFolder] = useState<string | null>(null);
  const [expandedDriveFolders, setExpandedDriveFolders] = useState<Set<string>>(new Set());
  
  // PDF Viewer states
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [currentPdfUrl, setCurrentPdfUrl] = useState<string>('');
  const [currentPdfTitle, setCurrentPdfTitle] = useState<string>('');
  const [pdfPages, setPdfPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);
  
  const { user, getDriveAccessToken, reconnectDrive } = useAuth();
  const { listFiles, createFolder: createDriveFolder, uploadFile } = useGoogleDrive();
  
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Remove all local folder management functions
  // Only keep Google Drive functions

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        await createNewDriveFolder(newFolderName.trim(), parentFolderId || undefined);
        setNewFolderName('');
        setParentFolderId(null);
        setShowCreateDialog(false);
      } catch (error) {
        console.error('Error creating Google Drive folder:', error);
      }
    }
  };

  // Create Google Drive folder
  const createNewDriveFolder = async (name: string, parentId?: string) => {
    try {
      const newFolder = await createDriveFolder(name, parentId);
      console.log('✅ Google Drive folder created:', newFolder.name);
      // Refresh the drive files list
      await loadGoogleDriveFiles();
      return newFolder.id;
    } catch (error) {
      console.error('❌ Failed to create Google Drive folder:', error);
      throw error;
    }
  };

  // Google Drive integration functions
  useEffect(() => {
    const token = getDriveAccessToken();
    if (token && user) {
      setIsConnectedToDrive(true);
      loadGoogleDriveFiles(); // Automatically load files when connected
    } else {
      setIsConnectedToDrive(false);
      setDriveFiles([]);
      setDriveFolders([]);
    }
  }, [user, getDriveAccessToken]);

  // Load Google Drive files automatically
  const loadGoogleDriveFiles = async () => {
    if (!getDriveAccessToken()) return;
    
    try {
      setIsLoadingDrive(true);
      const files = await listFiles(undefined, 50); // Load more files
      
      // Separate folders and files
      const folders = files.filter(file => file.mimeType === 'application/vnd.google-apps.folder');
      const documents = files.filter(file => file.mimeType !== 'application/vnd.google-apps.folder');
      
      setDriveFolders(folders);
      setDriveFiles(documents);
      
      console.log(`✅ Loaded ${files.length} items from Google Drive (${folders.length} folders, ${documents.length} files)`);
    } catch (error) {
      console.error('❌ Failed to load Google Drive files:', error);
      setIsConnectedToDrive(false);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const connectToGoogleDrive = async () => {
    try {
      await reconnectDrive();
      // The useEffect will automatically load files when connection is established
    } catch (error) {
      console.error('Failed to connect to Google Drive:', error);
    }
  };

  const toggleDriveFolder = (folderId: string) => {
    const newExpanded = new Set(expandedDriveFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedDriveFolders(newExpanded);
  };

  const handleDriveFolderClick = (folderId: string) => {
    setSelectedDriveFolder(selectedDriveFolder === folderId ? null : folderId);
  };

  // Upload document to Google Drive folder
  const uploadDocumentToDriveFolder = async (document: Document, driveFolder: DriveFile) => {
    try {
      console.log(`Uploading "${document.title}" to Google Drive folder "${driveFolder.name}"`);
      
      // In a real implementation, you would convert the document to a file
      // For now, we'll just simulate the upload
      const fileBlob = new Blob([`Document: ${document.title}`], { type: 'text/plain' });
      const file = new File([fileBlob], `${document.title}.txt`, { type: 'text/plain' });
      
      const uploadedFile = await uploadFile(file, driveFolder.id);
      console.log(`✅ Document uploaded to Google Drive:`, uploadedFile);
      
      // Refresh Drive files to show the new file
      await loadGoogleDriveFiles();
      
    } catch (error) {
      console.error('❌ Failed to upload document to Google Drive:', error);
    }
  };

  const loadDriveFiles = async () => {
    if (!isConnectedToDrive) return;
    
    setIsLoadingDrive(true);
    try {
      const files = await listFiles();
      setDriveFiles(files);
    } catch (error) {
      console.error('Failed to load Google Drive files:', error);
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const syncFolderToDrive = async (folder: FolderData) => {
    if (!isConnectedToDrive) return;
    
    try {
      const driveFolder = await createDriveFolder(folder.name);
      console.log(`Folder "${folder.name}" synced to Google Drive:`, driveFolder.id);
      
      // You could add logic here to sync documents within the folder
      const docs = folderDocuments[folder.id] || [];
      for (const doc of docs) {
        // Convert document to file and upload if needed
        console.log(`Would sync document: ${doc.title}`);
      }
    } catch (error) {
      console.error('Failed to sync folder to Google Drive:', error);
    }
  };

  // Drag widget functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMinimized) {
      // Only allow dragging from header when expanded
      if (dragHandleRef.current && dragHandleRef.current.contains(e.target as Node)) {
        setIsDragging(true);
        setDragStart({
          x: e.clientX - position.x,
          y: e.clientY - position.y
        });
      }
    } else {
      // When minimized, whole widget is draggable
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleWidgetClick = (e: React.MouseEvent) => {
    if (isMinimized && !isDragging) {
      setIsMinimized(false);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - (isMinimized ? 80 : 320), e.clientX - dragStart.x));
      const newY = Math.max(0, Math.min(window.innerHeight - (isMinimized ? 60 : 450), e.clientY - dragStart.y));
      
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position]);

  // Document drop handlers
  const handleDragOver = (e: React.DragEvent, folderId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (folderId && folderId !== dragOverFolder) {
      setDragOverFolder(folderId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear if we're leaving the entire folder area
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverFolder(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
    
    try {
      const dragDataStr = e.dataTransfer.getData('application/json');
      const dragData = JSON.parse(dragDataStr);
      
      if (dragData.type === 'document') {
        const document = dragData.data as Document;
        
        // Only handle Google Drive uploads
        if (!isConnectedToDrive) {
          console.warn('Please connect to Google Drive first');
          return;
        }
        
        let targetDriveFolder = null;
        
        // Check if target is a Google Drive folder
        if (targetFolderId) {
          targetDriveFolder = driveFolders.find(f => f.id === targetFolderId);
        }
        
        // If no specific folder, create a default one or use root
        if (!targetDriveFolder && driveFolders.length === 0) {
          // Create a default "Documents" folder in Google Drive
          try {
            const newFolder = await createNewDriveFolder('Documents');
            targetDriveFolder = driveFolders.find(f => f.id === newFolder);
          } catch (error) {
            console.error('Failed to create default folder:', error);
          }
        } else if (!targetDriveFolder && driveFolders.length > 0) {
          targetDriveFolder = driveFolders[0]; // Use first available folder
        }
        
        // Upload document to Google Drive
        await uploadDocumentToDriveFolder(document, targetDriveFolder);
        console.log(`Document "${document.title}" uploaded to Google Drive!`);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };
          setFolderDocuments(prev => ({
            ...prev,
            [folderId]: [...(prev[folderId] || []), document]
          }));
          
          const updateFolderCount = (folders: FolderData[], targetId: string): FolderData[] => {
            return folders.map(folder => {
              if (folder.id === targetId) {
                return { ...folder, documentCount: folder.documentCount + 1 };
              }
              if (folder.children) {
                const updatedChildren = updateFolderCount(folder.children, targetId);
                return { ...folder, children: updatedChildren };
              }
              return folder;
            });
          };
          
          setFolders(prev => updateFolderCount(prev, folderId));
          console.log(`Document "${document.title}" added to folder successfully!`);
        }
      }
      
      else if (dragData.type === 'folder') {
        const sourceFolder = dragData.data as FolderData;
        
        if (targetFolderId && targetFolderId !== sourceFolder.id) {
          // Prevent dropping folder into itself or its descendants
          const isDescendant = (folder: FolderData, ancestorId: string): boolean => {
            if (folder.id === ancestorId) return true;
            if (folder.children) {
              return folder.children.some(child => isDescendant(child, ancestorId));
            }
            return false;
          };
          
          if (!isDescendant(sourceFolder, targetFolderId)) {
            // Helper function to remove folder from any location
            const removeFolderFromTree = (folders: FolderData[], folderId: string): FolderData[] => {
              return folders.filter(folder => folder.id !== folderId)
                .map(folder => ({
                  ...folder,
                  children: folder.children ? removeFolderFromTree(folder.children, folderId) : undefined
                }));
            };
            
            // Helper function to add folder to target location
            const addFolderToTarget = (folders: FolderData[], targetId: string, folderToAdd: FolderData): FolderData[] => {
              return folders.map(folder => {
                if (folder.id === targetId) {
                  return {
                    ...folder,
                    children: [...(folder.children || []), folderToAdd]
                  };
                }
                if (folder.children) {
                  return {
                    ...folder,
                    children: addFolderToTarget(folder.children, targetId, folderToAdd)
                  };
                }
                return folder;
              });
            };
            
            // Move folder to new location
            setFolders(prev => {
              const withoutSource = removeFolderFromTree(prev, sourceFolder.id);
              return addFolderToTarget(withoutSource, targetFolderId, sourceFolder);
            });
            
            console.log(`Folder "${sourceFolder.name}" moved to target folder successfully!`);
          } else {
            console.warn('Cannot move folder into itself or its descendant');
          }
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  // Google Drive Item Component (removed FolderItem since we only use Google Drive)
  const DriveItem = ({ item, level = 0 }: { item: DriveFile; level?: number }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    const isBeingDraggedOver = dragOverFolder === folder.id;
    const folderDocs = folderDocuments[folder.id] || [];

    const handleFolderClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (folderDocs.length > 0) {
        setSelectedFolder(selectedFolder === folder.id ? null : folder.id);
      }
    };

    return (
      <div>
        <div
          className={`group flex items-center justify-between py-1.5 px-2 rounded-xl cursor-pointer transition-all text-xs ${
            isBeingDraggedOver ? 'bg-blue-100 dark:bg-blue-900/20 border border-blue-400 border-dashed' : 
            selectedFolder === folder.id ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-muted/50'
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({
              type: 'folder',
              data: folder
            }));
            e.dataTransfer.effectAllowed = 'move';
          }}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id)}
          onClick={handleFolderClick}
        >
          <div className="flex items-center space-x-1.5 flex-1 min-w-0">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-2 w-2" />
                ) : (
                  <ChevronRight className="h-2 w-2" />
                )}
              </Button>
            )}
            {!hasChildren && <div className="w-3" />}
            
            <div className="flex items-center space-x-1.5 min-w-0">
              {isExpanded && hasChildren ? (
                <FolderOpen className="h-3 w-3 text-blue-600 flex-shrink-0" />
              ) : (
                <Folder className="h-3 w-3 text-blue-600 flex-shrink-0" />
              )}
              <span className="text-xs font-medium truncate">{folder.name}</span>
              <Badge variant="secondary" className="text-xs px-1 py-0 h-4 min-w-0">
                {folder.documentCount}
              </Badge>
              {folderDocs.length > 0 && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-4 min-w-0 bg-green-50 text-green-700 border-green-200">
                  {folderDocs.length}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Folder Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-2 w-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setParentFolderId(folder.id);
                setShowCreateDialog(true);
              }}>
                <FolderPlus className="w-3 h-3 mr-2" />
                Add Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                setSelectedFolder(selectedFolder === folder.id ? null : folder.id);
              }}>
                <FileText className="w-3 h-3 mr-2" />
                View Contents
              </DropdownMenuItem>
              {isConnectedToDrive && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  syncFolderToDrive(folder);
                }}>
                  <Cloud className="w-3 h-3 mr-2" />
                  Sync to Drive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Show folder documents when selected */}
        {selectedFolder === folder.id && folderDocs.length > 0 && (
          <div className="ml-6 mt-1 p-2 bg-muted/30 rounded-lg border-l-2 border-blue-300">
            <div className="space-y-1">
              {folderDocs.map((doc, index) => (
                <div 
                  key={`${doc.id}-${index}`} 
                  className="flex items-center space-x-2 py-1 px-2 bg-background rounded-md text-xs cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    // Check if document is PDF based on title or URL
                    const isPdf = doc.title.toLowerCase().includes('pdf') || 
                                 doc.url.toLowerCase().includes('pdf') ||
                                 doc.title.toLowerCase().endsWith('.pdf');
                    
                    if (isPdf) {
                      // Open in PDF viewer
                      setCurrentPdfUrl(doc.url);
                      setCurrentPdfTitle(doc.title);
                      setCurrentPage(1);
                      setPdfPages(doc.pageCount || 1);
                      setShowPdfViewer(true);
                    } else {
                      // Open in new tab for non-PDF documents
                      window.open(doc.url, '_blank');
                    }
                  }}
                >
                  <FileText className="w-3 h-3 text-blue-500 flex-shrink-0" />
                  <span className="truncate flex-1">{doc.title}</span>
                  <span className="text-muted-foreground text-xs">{doc.pageCount}p</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
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

  // Google Drive Item Component
  const DriveItem = ({ item, level = 0 }: { item: DriveFile; level?: number }) => {
    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
    const isExpanded = expandedDriveFolders.has(item.id);
    const isSelected = selectedDriveFolder === item.id;
    const isBeingDraggedOver = dragOverFolder === `drive-folder-${item.id}`;

    const handleItemClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isFolder) {
        handleDriveFolderClick(item.id);
      } else {
        // Check if file is PDF
        const isPdf = item.mimeType === 'application/pdf' || item.name.toLowerCase().endsWith('.pdf');
        
        if (isPdf && item.webViewLink) {
          // Open PDF in custom viewer
          setCurrentPdfUrl(item.webViewLink);
          setCurrentPdfTitle(item.name);
          setCurrentPage(1);
          // Estimate pages from file size (rough calculation)
          const estimatedPages = item.size ? Math.max(1, Math.floor(parseInt(item.size) / 50000)) : 1;
          setPdfPages(estimatedPages);
          setShowPdfViewer(true);
        } else if (item.webViewLink) {
          // Open other files in new tab
          window.open(item.webViewLink, '_blank');
        }
      }
    };

    const formatFileSize = (size?: string) => {
      if (!size) return '';
      const bytes = parseInt(size);
      const sizes = ['B', 'KB', 'MB', 'GB'];
      if (bytes === 0) return '0 B';
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    };

    return (
      <div>
        <div
          className={`group flex items-center justify-between py-1.5 px-2 rounded-xl cursor-pointer transition-all text-xs ${
            isBeingDraggedOver ? 'bg-green-100 dark:bg-green-900/20 border border-green-400 border-dashed' : 
            isSelected ? 'bg-green-50 dark:bg-green-900/10' : 'hover:bg-muted/50'
          }`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onDragOver={isFolder ? (e) => handleDragOver(e, `drive-folder-${item.id}`) : undefined}
          onDragLeave={isFolder ? handleDragLeave : undefined}
          onDrop={isFolder ? (e) => handleDrop(e, `drive-folder-${item.id}`) : undefined}
          onClick={handleItemClick}
        >
          <div className="flex items-center space-x-1.5 flex-1 min-w-0">
            {isFolder && (
              <Button
                variant="ghost"
                size="sm"
                className="h-3 w-3 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleDriveFolder(item.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-2 w-2" />
                ) : (
                  <ChevronRight className="h-2 w-2" />
                )}
              </Button>
            )}
            {!isFolder && <div className="w-3" />}
            
            <div className="flex items-center space-x-1.5 min-w-0">
              {isFolder ? (
                isExpanded ? (
                  <FolderOpen className="h-3 w-3 text-green-600 flex-shrink-0" />
                ) : (
                  <Folder className="h-3 w-3 text-green-600 flex-shrink-0" />
                )
              ) : (
                <FileText className="h-3 w-3 text-green-500 flex-shrink-0" />
              )}
              <span className="text-xs font-medium truncate">{item.name}</span>
              {!isFolder && item.size && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-4 min-w-0 bg-green-50 text-green-700 border-green-200">
                  {formatFileSize(item.size)}
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs px-1 py-0 h-4 min-w-0 bg-green-100 text-green-800">
                Drive
              </Badge>
            </div>
          </div>
          
          {/* Drive Item Options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-2 w-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                if (item.webViewLink) {
                  window.open(item.webViewLink, '_blank');
                }
              }}>
                <FileText className="w-3 h-3 mr-2" />
                Open in Drive
              </DropdownMenuItem>
              {!isFolder && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  if (item.webContentLink) {
                    window.open(item.webContentLink, '_blank');
                  }
                }}>
                  <Upload className="w-3 h-3 mr-2" />
                  Download
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={widgetRef}
      className={`fixed z-50 transition-all duration-200 ${isDragging ? 'cursor-grabbing' : isMinimized ? 'cursor-pointer' : 'cursor-auto'}`}
      style={{ left: position.x, top: position.y }}
      onMouseDown={handleMouseDown}
      onClick={handleWidgetClick}
      onDragOver={(e) => handleDragOver(e)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e)}
    >
      <Card className={`shadow-2xl border-2 bg-background/98 backdrop-blur-md transition-all rounded-2xl ${isMinimized ? 'w-16 h-16' : 'w-80'}`}>
        {/* Header - Minimized shows only icon */}
        {isMinimized ? (
          <div className="flex items-center justify-center w-full h-full">
            <Folder className="w-8 h-8 text-blue-600" />
          </div>
        ) : (
          <>
            <div
              ref={dragHandleRef}
              className="flex items-center justify-between p-3 border-b border-border bg-card/50 cursor-grab active:cursor-grabbing rounded-t-2xl"
            >
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-blue-600" />
                <Badge variant="secondary" className="text-xs">{folders.length}</Badge>
                {isConnectedToDrive && (
                  <div className="flex items-center gap-1">
                    <Cloud className="w-3 h-3 text-green-600" />
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                      {driveFolders.length + driveFiles.length}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {/* Refresh Google Drive Button */}
                {isConnectedToDrive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadGoogleDriveFiles();
                    }}
                    disabled={isLoadingDrive}
                    title="Refresh Google Drive"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                
                {/* Google Drive Connection Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isConnectedToDrive) {
                      setShowDriveDialog(true);
                      loadDriveFiles();
                    } else {
                      connectToGoogleDrive();
                    }
                  }}
                  title={isConnectedToDrive ? "Google Drive Connected" : "Connect to Google Drive"}
                >
                  {isConnectedToDrive ? (
                    <Cloud className="w-3 h-3 text-green-600" />
                  ) : (
                    <CloudOff className="w-3 h-3 text-gray-400" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMinimized(true);
                  }}
                  title="Minimize"
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
                  className="pl-7 h-7 text-xs rounded-xl"
                />
              </div>

              {/* Quick Actions */}
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-xs flex-1 px-2 rounded-xl"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-xs flex-1 px-2 rounded-xl"
                  onClick={() => {
                    // Connect to Google Drive
                    console.log('Connecting to Google Drive...');
                  }}
                >
                  <Cloud className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-xs flex-1 px-2 rounded-xl">
                  <Settings className="w-3 h-3" />
                </Button>
              </div>

              {/* Folder List */}
              <div className="relative">
                {/* Drop zone hint when dragging */}
                {dragOverFolder && (
                  <div className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 border-2 border-blue-300 border-dashed rounded-xl flex items-center justify-center z-10">
                    <div className="text-blue-600 text-xs font-medium">Drop document here</div>
                  </div>
                )}
                
                <ScrollArea className="h-60 pr-2">
                  <div className="space-y-0.5">
                    {/* Google Drive Items Only */}
                    {isConnectedToDrive ? (
                      <>
                        {/* Google Drive Section Header */}
                        {(driveFolders.length > 0 || driveFiles.length > 0) && (
                          <div className="flex items-center space-x-2 py-2 px-1 mb-1">
                            <Cloud className="w-3 h-3 text-green-600" />
                            <span className="text-xs font-medium text-green-600">Google Drive</span>
                            {isLoadingDrive && <RefreshCw className="w-3 h-3 animate-spin text-green-600" />}
                          </div>
                        )}
                        
                        {/* Google Drive Folders */}
                        {driveFolders.map((folder) => (
                          <DriveItem key={`drive-folder-${folder.id}`} item={folder} />
                        ))}
                        
                        {/* Google Drive Files */}
                        {driveFiles.map((file) => (
                          <DriveItem key={`drive-file-${file.id}`} item={file} />
                        ))}
                      </>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-xs mb-3">Connect to Google Drive to access your files</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 text-xs"
                          onClick={connectToGoogleDrive}
                          disabled={isLoadingDrive}
                        >
                          <Cloud className="w-3 h-3 mr-1" />
                          Connect Drive
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Empty State for connected but no files */}
                  {isConnectedToDrive && driveFolders.length === 0 && driveFiles.length === 0 && !isLoadingDrive && (
                    <div className="text-center py-6 text-muted-foreground">
                      <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs mb-3">
                        No files found in Google Drive
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-6 text-xs"
                        onClick={() => setShowCreateDialog(true)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Create Folder
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Footer Stats */}
              <div className="pt-2 border-t border-border">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Folders:</span>
                    <span className="font-medium">{folders.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Documents:</span>
                    <span className="font-medium">{documents.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>In Folders:</span>
                    <span className="font-medium text-green-600">
                      {Object.values(folderDocuments).reduce((acc, docs) => acc + docs.length, 0)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </>
        )}
      </Card>
      
      {/* Create Folder Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
          <Card className="w-80 p-4 rounded-2xl">
            <h3 className="font-medium mb-3">
              {parentFolderId ? 'Create Subfolder' : 'Create New Folder'}
            </h3>
            {parentFolderId && (
              <p className="text-sm text-muted-foreground mb-3">
                Creating in: {folders.find(f => f.id === parentFolderId)?.name}
              </p>
            )}
            <Input
              placeholder="Enter folder name..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="mb-3 rounded-xl"
              autoFocus
            />
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 rounded-xl"
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewFolderName('');
                  setParentFolderId(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                className="flex-1 rounded-xl"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                Create
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Google Drive Dialog */}
      {showDriveDialog && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
          <Card className="w-96 p-4 rounded-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Cloud className="w-5 h-5 text-green-600" />
                <h3 className="font-medium">Google Drive</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowDriveDialog(false)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl"
                onClick={loadDriveFiles}
                disabled={isLoadingDrive}
              >
                {isLoadingDrive ? (
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => {
                  // Sync all folders to Drive
                  folders.forEach(folder => syncFolderToDrive(folder));
                }}
              >
                <Upload className="w-3 h-3 mr-1" />
                Sync All
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              {isLoadingDrive ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : driveFiles.length > 0 ? (
                <div className="space-y-2">
                  {driveFiles.map((file) => (
                    <div key={file.id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                      {file.mimeType === 'application/vnd.google-apps.folder' ? (
                        <Folder className="w-4 h-4 text-blue-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-green-600" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(file.modifiedTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Cloud className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No files found</p>
                  <p className="text-xs">Click refresh to load files</p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground text-center">
                Connected to Google Drive as {user?.email}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {showPdfViewer && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center">
          <div className="w-full h-full max-w-6xl max-h-[95vh] bg-white dark:bg-gray-900 rounded-lg overflow-hidden flex flex-col">
            {/* PDF Viewer Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="font-medium text-sm">{currentPdfTitle}</h3>
                  <p className="text-xs text-muted-foreground">
                    Page {currentPage} of {pdfPages}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Page Navigation */}
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <div className="flex items-center space-x-1 px-2">
                    <Input
                      type="number"
                      value={currentPage}
                      onChange={(e) => {
                        const page = parseInt(e.target.value);
                        if (page >= 1 && page <= pdfPages) {
                          setCurrentPage(page);
                        }
                      }}
                      className="w-16 h-6 text-xs text-center"
                      min={1}
                      max={pdfPages}
                    />
                    <span className="text-xs text-muted-foreground">/ {pdfPages}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setCurrentPage(Math.min(pdfPages, currentPage + 1))}
                    disabled={currentPage >= pdfPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center space-x-1">
                  <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                    <Minus className="w-3 h-3 mr-1" />
                    Zoom Out
                  </Button>
                  <Badge variant="outline" className="h-8 px-2">100%</Badge>
                  <Button variant="outline" size="sm" className="h-8 px-2 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Zoom In
                  </Button>
                </div>

                {/* Download Button */}
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                  <Upload className="w-3 h-3 mr-1" />
                  Download
                </Button>

                {/* Close Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowPdfViewer(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* PDF Content */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 p-4 overflow-auto">
              <div className="max-w-4xl mx-auto bg-white dark:bg-white shadow-lg rounded-lg overflow-hidden">
                {/* PDF Preview - Using iframe for Google Drive PDF */}
                <iframe
                  src={`${currentPdfUrl}&embedded=true`}
                  width="100%"
                  height="800"
                  className="border-0"
                  title={currentPdfTitle}
                />
                
                {/* Alternative: If iframe doesn't work, show message */}
                <div className="hidden p-8 text-center text-muted-foreground">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="font-medium mb-2">PDF Preview</h3>
                  <p className="text-sm mb-4">
                    This document represents page {currentPage} of {pdfPages} from the academic paper "{currentPdfTitle}". 
                    In a real implementation, this would display the actual PDF content using PDF.js or similar library.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.open(currentPdfUrl, '_blank')}
                    className="mb-2"
                  >
                    Open in Google Drive
                  </Button>
                </div>
              </div>
            </div>

            {/* Status Bar */}
            <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 py-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>ArXiv Paper 1706.03762 - {currentPdfTitle}</span>
                <span>Latest: 9/8/2025</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
