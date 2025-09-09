'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
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
  RefreshCw,
  MoreHorizontal,
  Cloud,
  CloudOff,
  Upload,
  Download,
  Eye,
  Minimize2,
  Maximize2,
  Image,
  Music,
  Video,
  Archive,
  Code,
  File,
  Minus,
  ChevronLeft,
  Trash2,
  Star,
  BookOpen,
  Tag,
  StickyNote,
  Filter,
  Heart,
  Clock,
  Bookmark,
  Calendar,
  Layers,
  Users,
  Lock,
  AlertCircle,
  CheckCircle,
  FileQuestion,
  Grid,
  List,
  Settings,
  Edit,
  Save,
  MoreVertical,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize,
  SkipBack,
  SkipForward,
  Info,
  Share,
  ChevronUp,
  Volume2,
  Printer,
  EyeOff,
  SortAsc,
  SortDesc,
  FolderTree
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useAuth } from '../AuthContext';
import { useGoogleDrive, DriveFile } from '../GoogleDriveService';

interface Document {
  id: string;
  title: string;
  author: string;
  pageCount: number;
  category: string;
  thumbnail: string;
  url: string;
}

interface GoogleDriveWidgetProps {
  documents: Document[];
}

export function GoogleDriveWidget({ documents }: GoogleDriveWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: window.innerHeight - 120 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, direction: 'bottom-right' });
  
  // Document Manager state
  const [activeTab, setActiveTab] = useState<'drive' | 'manager'>('drive');
  const [showFavorites, setShowFavorites] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'category'>('name');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const [widgetSize, setWidgetSize] = useState(() => {
    // Load saved size from localStorage
    const saved = localStorage.getItem('googleDriveWidget-size');
    return saved ? JSON.parse(saved) : { width: 320, height: 480 };
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  
  // Google Drive states
  const [isConnectedToDrive, setIsConnectedToDrive] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveFolders, setDriveFolders] = useState<DriveFile[]>([]);
  const [selectedDriveFolder, setSelectedDriveFolder] = useState<string | null>(null);
  const [expandedDriveFolders, setExpandedDriveFolders] = useState<Set<string>>(new Set());
  const [folderContents, setFolderContents] = useState<Record<string, DriveFile[]>>({});
  const [loadingFolderContents, setLoadingFolderContents] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  
  // PDF Viewer states
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState<DriveFile | null>(null);
  const [pdfViewerSize, setPdfViewerSize] = useState(() => {
    const saved = localStorage.getItem('pdfViewer-size');
    return saved ? JSON.parse(saved) : { width: 800, height: 600 };
  });
  const [pdfViewerPosition, setPdfViewerPosition] = useState(() => {
    const saved = localStorage.getItem('pdfViewer-position');
    return saved ? JSON.parse(saved) : { x: 100, y: 50 };
  });
  const [isPdfResizing, setIsPdfResizing] = useState(false);
  const [pdfResizeStart, setPdfResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isPdfDragging, setIsPdfDragging] = useState(false);
  const [pdfDragStart, setPdfDragStart] = useState({ x: 0, y: 0 });
  
  // Document management states
  const [showDocumentManager, setShowDocumentManager] = useState(false);
  const [documentTags, setDocumentTags] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('document-tags');
    return saved ? JSON.parse(saved) : {};
  });
  const [documentNotes, setDocumentNotes] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('document-notes');
    return saved ? JSON.parse(saved) : {};
  });
  const [documentCategories, setDocumentCategories] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('document-categories');
    return saved ? JSON.parse(saved) : {};
  });
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('document-favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    const saved = localStorage.getItem('recently-viewed');
    return saved ? JSON.parse(saved) : [];
  });

  const { user, getDriveAccessToken, reconnectDrive } = useAuth();
  const { listFiles, createFolder: createDriveFolder, uploadFile } = useGoogleDrive();
  
  const widgetRef = useRef<HTMLDivElement>(null);
  const dragHandleRef = useRef<HTMLDivElement>(null);

  // Google Drive integration functions
  useEffect(() => {
    const token = getDriveAccessToken();
    if (token && user) {
      setIsConnectedToDrive(true);
      loadGoogleDriveFiles();
    } else {
      setIsConnectedToDrive(false);
      setDriveFiles([]);
      setDriveFolders([]);
    }
  }, [user, getDriveAccessToken]);

  // Save widget size to localStorage
  useEffect(() => {
    localStorage.setItem('googleDriveWidget-size', JSON.stringify(widgetSize));
  }, [widgetSize]);

  // Save PDF viewer size and position
  useEffect(() => {
    localStorage.setItem('pdfViewer-size', JSON.stringify(pdfViewerSize));
  }, [pdfViewerSize]);

  useEffect(() => {
    localStorage.setItem('pdfViewer-position', JSON.stringify(pdfViewerPosition));
  }, [pdfViewerPosition]);

  // Save document management data
  useEffect(() => {
    localStorage.setItem('document-tags', JSON.stringify(documentTags));
  }, [documentTags]);

  useEffect(() => {
    localStorage.setItem('document-notes', JSON.stringify(documentNotes));
  }, [documentNotes]);

  useEffect(() => {
    localStorage.setItem('document-categories', JSON.stringify(documentCategories));
  }, [documentCategories]);

  useEffect(() => {
    localStorage.setItem('document-favorites', JSON.stringify(Array.from(favorites)));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('recently-viewed', JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  // Function to get file icon and color based on extension
  const getFileIcon = (fileName: string, mimeType?: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Check mimeType first for Google Apps
    if (mimeType) {
      if (mimeType.includes('document')) return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', name: 'DOC' };
      if (mimeType.includes('spreadsheet')) return { icon: FileText, color: 'text-green-600', bg: 'bg-green-50', name: 'XLS' };
      if (mimeType.includes('presentation')) return { icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', name: 'PPT' };
      if (mimeType.includes('drawing')) return { icon: Image, color: 'text-purple-600', bg: 'bg-purple-50', name: 'DRW' };
    }
    
    // Check by file extension
    switch (extension) {
      // Documents
      case 'pdf':
        return { icon: FileText, color: 'text-red-600', bg: 'bg-red-50', name: 'PDF' };
      case 'doc':
      case 'docx':
        return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', name: 'DOC' };
      case 'xls':
      case 'xlsx':
        return { icon: FileText, color: 'text-green-600', bg: 'bg-green-50', name: 'XLS' };
      case 'ppt':
      case 'pptx':
        return { icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', name: 'PPT' };
      case 'txt':
        return { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-50', name: 'TXT' };
        
      // Images
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
      case 'webp':
        return { icon: Image, color: 'text-pink-600', bg: 'bg-pink-50', name: 'IMG' };
        
      // Audio
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
      case 'm4a':
        return { icon: Music, color: 'text-indigo-600', bg: 'bg-indigo-50', name: 'AUD' };
        
      // Video
      case 'mp4':
      case 'avi':
      case 'mkv':
      case 'mov':
      case 'wmv':
      case 'flv':
        return { icon: Video, color: 'text-purple-600', bg: 'bg-purple-50', name: 'VID' };
        
      // Archives
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return { icon: Archive, color: 'text-yellow-600', bg: 'bg-yellow-50', name: 'ZIP' };
        
      // Code
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'php':
      case 'rb':
      case 'go':
      case 'rs':
        return { icon: Code, color: 'text-emerald-600', bg: 'bg-emerald-50', name: 'CODE' };
        
      default:
        return { icon: File, color: 'text-gray-500', bg: 'bg-gray-50', name: 'FILE' };
    }
  };

  const loadGoogleDriveFiles = async () => {
    if (!getDriveAccessToken()) return;
    
    try {
      setIsLoadingDrive(true);
      const files = await listFiles(undefined, 50);
      
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

  // Toggle favorite function
  const toggleFavorite = (fileId: string) => {
    if (favorites.has(fileId)) {
      removeFromFavorites(fileId);
    } else {
      addToFavorites(fileId);
    }
  };

  const connectToGoogleDrive = async () => {
    try {
      await reconnectDrive();
    } catch (error) {
      console.error('Failed to connect to Google Drive:', error);
    }
  };

  const createNewDriveFolder = async (name: string, parentId?: string) => {
    try {
      const newFolder = await createDriveFolder(name, parentId);
      console.log('✅ Google Drive folder created:', newFolder.name);
      await loadGoogleDriveFiles();
      return newFolder.id;
    } catch (error) {
      console.error('❌ Failed to create Google Drive folder:', error);
      throw error;
    }
  };

  const handleCreateFolder = async () => {
    if (newFolderName.trim()) {
      try {
        await createNewDriveFolder(newFolderName.trim(), parentFolderId || undefined);
        setNewFolderName('');
        setShowCreateDialog(false);
        setParentFolderId(null);
      } catch (error) {
        console.error('Error creating folder:', error);
      }
    }
  };

  // Upload document to Google Drive folder
  const uploadDocumentToDriveFolder = async (document: Document, folder?: DriveFile) => {
    try {
      console.log('🔄 Uploading document to Google Drive:', document.title);
      
      // Create a mock file from document data
      const documentData = JSON.stringify({
        title: document.title,
        author: document.author,
        pageCount: document.pageCount,
        category: document.category,
        url: document.url,
        uploadedAt: new Date().toISOString()
      });
      
      const blob = new Blob([documentData], { type: 'application/json' });
      
      // Create file for upload
      const fileName = `${document.title}.json`;
      const fileObject = new window.File([blob], fileName, { type: 'application/json' });
      
      const uploadedFile = await uploadFile(fileObject, folder?.id);
      console.log('✅ Document uploaded to Google Drive:', uploadedFile.name);
      
      // Refresh the files list
      await loadGoogleDriveFiles();
    } catch (error) {
      console.error('❌ Failed to upload document to Google Drive:', error);
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

  const handleDriveFolderClick = async (folderId: string) => {
    setSelectedDriveFolder(selectedDriveFolder === folderId ? null : folderId);
    
    // Load folder contents if not already loaded
    if (selectedDriveFolder !== folderId && !folderContents[folderId]) {
      await loadFolderContents(folderId);
    }
  };

  // Load contents of a specific Google Drive folder
  const loadFolderContents = async (folderId: string) => {
    if (!getDriveAccessToken()) return;
    
    try {
      setLoadingFolderContents(prev => new Set(prev).add(folderId));
      
      // Get files in the specific folder
      const files = await listFiles(folderId, 100);
      
      setFolderContents(prev => ({
        ...prev,
        [folderId]: files
      }));
      
      console.log(`✅ Loaded ${files.length} items from folder`);
    } catch (error) {
      console.error('❌ Failed to load folder contents:', error);
    } finally {
      setLoadingFolderContents(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderId);
        return newSet;
      });
    }
  };

  // Document management functions
  const addToFavorites = (fileId: string) => {
    setFavorites(prev => new Set([...prev, fileId]));
  };

  const removeFromFavorites = (fileId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      newFavorites.delete(fileId);
      return newFavorites;
    });
  };

  const addDocumentNote = (fileId: string, note: string) => {
    setDocumentNotes(prev => ({ ...prev, [fileId]: note }));
  };

  const setDocumentCategory = (fileId: string, category: string) => {
    setDocumentCategories(prev => ({ ...prev, [fileId]: category }));
  };

  const addDocumentTag = (fileId: string, tag: string) => {
    setDocumentTags(prev => ({
      ...prev,
      [fileId]: [...(prev[fileId] || []), tag]
    }));
  };

  const removeDocumentTag = (fileId: string, tag: string) => {
    setDocumentTags(prev => ({
      ...prev,
      [fileId]: (prev[fileId] || []).filter(t => t !== tag)
    }));
  };

  // Helper functions for document management
  const getAvailableCategories = () => {
    const categories = new Set(Object.values(documentCategories));
    const defaultCategories = ['Research', 'Thesis', 'Journal', 'Reference', 'Draft', 'Published'];
    defaultCategories.forEach(cat => categories.add(cat));
    return Array.from(categories).filter(Boolean);
  };

  const getFilteredDocuments = () => {
    let filtered = driveFiles.filter(file => file.mimeType === 'application/pdf');
    
    if (showFavorites) {
      filtered = filtered.filter(file => favorites.has(file.id));
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(file => documentCategories[file.id] === filterCategory);
    }
    
    // Sort documents
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'date':
          return new Date(b.modifiedTime || '').getTime() - new Date(a.modifiedTime || '').getTime();
        case 'category':
          const catA = documentCategories[a.id] || 'Uncategorized';
          const catB = documentCategories[b.id] || 'Uncategorized';
          return catA.localeCompare(catB);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  const addToRecentlyViewed = (fileId: string) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(id => id !== fileId);
      return [fileId, ...filtered].slice(0, 10); // Keep only last 10
    });
  };

  const openPdfViewer = (file: DriveFile) => {
    setSelectedPdfFile(file);
    setShowPdfViewer(true);
    addToRecentlyViewed(file.id);
  };

  // PDF Viewer drag and resize handlers
  const handlePdfDragStart = (e: React.MouseEvent) => {
    setIsPdfDragging(true);
    setPdfDragStart({
      x: e.clientX - pdfViewerPosition.x,
      y: e.clientY - pdfViewerPosition.y,
    });
  };

  const handlePdfResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPdfResizing(true);
    setPdfResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: pdfViewerSize.width,
      height: pdfViewerSize.height,
    });
  };

  // PDF Viewer useEffect for drag and resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isPdfDragging) {
        setPdfViewerPosition({
          x: e.clientX - pdfDragStart.x,
          y: e.clientY - pdfDragStart.y,
        });
      } else if (isPdfResizing) {
        const deltaX = e.clientX - pdfResizeStart.x;
        const deltaY = e.clientY - pdfResizeStart.y;
        
        const newWidth = Math.max(400, Math.min(1200, pdfResizeStart.width + deltaX));
        const newHeight = Math.max(300, Math.min(900, pdfResizeStart.height + deltaY));
        
        setPdfViewerSize({
          width: newWidth,
          height: newHeight,
        });
      }
    };

    const handleMouseUp = () => {
      setIsPdfDragging(false);
      setIsPdfResizing(false);
    };

    if (isPdfDragging || isPdfResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPdfDragging, isPdfResizing, pdfDragStart, pdfResizeStart]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent, folderId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (folderId) {
      setDragOverFolder(folderId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only clear drag over if we're actually leaving the bounds
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
        
        if (!isConnectedToDrive) {
          console.warn('Please connect to Google Drive first');
          return;
        }
        
        let targetDriveFolder: DriveFile | undefined = undefined;
        
        if (targetFolderId) {
          targetDriveFolder = driveFolders.find(f => f.id === targetFolderId);
        }
        
        if (!targetDriveFolder && driveFolders.length === 0) {
          try {
            const newFolderId = await createNewDriveFolder('Documents');
            targetDriveFolder = driveFolders.find(f => f.id === newFolderId);
          } catch (error) {
            console.error('Failed to create default folder:', error);
          }
        } else if (!targetDriveFolder && driveFolders.length > 0) {
          targetDriveFolder = driveFolders[0];
        }
        
        await uploadDocumentToDriveFolder(document, targetDriveFolder);
        console.log(`Document "${document.title}" uploaded to Google Drive!`);
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  // Widget dragging functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isMinimized && dragHandleRef.current?.contains(e.target as Node)) {
      setIsDragging(true);
      const rect = widgetRef.current?.getBoundingClientRect();
      if (rect) {
        setDragStart({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    }
  };

  // Widget resizing functionality with multiple corners
  const handleResizeMouseDown = (e: React.MouseEvent, direction: string = 'bottom-right') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: widgetSize.width,
      height: widgetSize.height,
      direction
    });
  };

  const handleWidgetClick = () => {
    if (isMinimized) {
      setIsMinimized(false);
      // Add bounce effect when expanding
      if (widgetRef.current) {
        widgetRef.current.style.transform = 'scale(1.1)';
        setTimeout(() => {
          if (widgetRef.current) {
            widgetRef.current.style.transform = 'scale(1)';
          }
        }, 150);
      }
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        
        const direction = resizeStart.direction || 'bottom-right';
        
        // Handle different resize directions for better responsiveness
        if (direction.includes('right')) {
          newWidth = Math.max(280, Math.min(800, resizeStart.width + deltaX));
        }
        if (direction.includes('left')) {
          newWidth = Math.max(280, Math.min(800, resizeStart.width - deltaX));
        }
        if (direction.includes('bottom')) {
          newHeight = Math.max(350, Math.min(700, resizeStart.height + deltaY));
        }
        if (direction.includes('top')) {
          newHeight = Math.max(350, Math.min(700, resizeStart.height - deltaY));
        }
        
        setWidgetSize({
          width: newWidth,
          height: newHeight,
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart]);

  // PDF Viewer resize and drag handlers
  useEffect(() => {
    const handlePdfMouseMove = (e: MouseEvent) => {
      if (isPdfDragging) {
        setPdfViewerPosition({
          x: e.clientX - pdfDragStart.x,
          y: e.clientY - pdfDragStart.y,
        });
      } else if (isPdfResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        
        const direction = resizeStart.direction || 'bottom-right';
        
        if (direction.includes('right')) {
          newWidth = Math.max(600, Math.min(window.innerWidth - 100, resizeStart.width + deltaX));
        }
        if (direction.includes('bottom')) {
          newHeight = Math.max(400, Math.min(window.innerHeight - 100, resizeStart.height + deltaY));
        }
        
        setPdfViewerSize({
          width: newWidth,
          height: newHeight,
        });
      }
    };

    const handlePdfMouseUp = () => {
      setIsPdfDragging(false);
      setIsPdfResizing(false);
    };

    if (isPdfDragging || isPdfResizing) {
      document.addEventListener('mousemove', handlePdfMouseMove);
      document.addEventListener('mouseup', handlePdfMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handlePdfMouseMove);
      document.removeEventListener('mouseup', handlePdfMouseUp);
    };
  }, [isPdfDragging, isPdfResizing, dragStart, resizeStart]);

  // Filter files based on search
  const filteredFiles = driveFiles.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredFolders = driveFolders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Google Drive Item Component
  const DriveItem = ({ item, level = 0 }: { item: DriveFile; level?: number }) => {
    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
    const isExpanded = expandedDriveFolders.has(item.id);
    const isSelected = selectedDriveFolder === item.id;
    const isBeingDraggedOver = dragOverFolder === item.id;
    const isPDF = item.mimeType === 'application/pdf';
    const fileInfo = !isFolder ? getFileIcon(item.name, item.mimeType) : null;

    const handleItemClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isFolder) {
        handleDriveFolderClick(item.id);
      } else if (isPDF) {
        // Open PDF viewer
        setSelectedPdfFile(item);
        setShowPdfViewer(true);
      } else {
        // Open file in new tab
        if (item.webViewLink) {
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
          onDragOver={(e) => isFolder ? handleDragOver(e, item.id) : undefined}
          onDragLeave={isFolder ? handleDragLeave : undefined}
          onDrop={(e) => isFolder ? handleDrop(e, item.id) : undefined}
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
              ) : fileInfo ? (
                <div className={`h-6 w-6 rounded flex items-center justify-center ${fileInfo.bg} flex-shrink-0`}>
                  <fileInfo.icon className={`h-3 w-3 ${fileInfo.color}`} />
                </div>
              ) : (
                <FileText className="h-3 w-3 text-gray-500 flex-shrink-0" />
              )}
              <span className="text-xs font-medium truncate">{item.name}</span>
              
              {/* File format badge */}
              {!isFolder && fileInfo && (
                <Badge variant="outline" className={`text-xs px-1 py-0 h-4 min-w-0 ${fileInfo.bg} ${fileInfo.color} border-current`}>
                  {fileInfo.name}
                </Badge>
              )}
              
              {!isFolder && item.size && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-4 min-w-0 bg-gray-50 text-gray-600 border-gray-300">
                  {formatFileSize(item.size)}
                </Badge>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-2 w-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {isPDF && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPdfFile(item);
                  setShowPdfViewer(true);
                }}>
                  <Eye className="w-3 h-3 mr-2" />
                  View PDF
                </DropdownMenuItem>
              )}
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
                  <Download className="w-3 h-3 mr-2" />
                  Download
                </DropdownMenuItem>
              )}
              {isFolder && (
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setParentFolderId(item.id);
                  setShowCreateDialog(true);
                }}>
                  <FolderPlus className="w-3 h-3 mr-2" />
                  Add Subfolder
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Show folder contents when selected */}
        {isFolder && isSelected && (
          <div className="ml-6 mt-1 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg border-l-2 border-green-300">
            {loadingFolderContents.has(item.id) ? (
              <div className="flex items-center space-x-2 py-2">
                <RefreshCw className="w-3 h-3 animate-spin text-green-600" />
                <span className="text-xs text-green-600">Loading folder contents...</span>
              </div>
            ) : folderContents[item.id] && folderContents[item.id].length > 0 ? (
              <div className="space-y-1">
                <div className="text-xs font-medium text-green-700 mb-2">
                  {folderContents[item.id].length} items in folder
                </div>
                {folderContents[item.id].map((subItem, index) => {
                  const subItemFileInfo = subItem.mimeType !== 'application/vnd.google-apps.folder' 
                    ? getFileIcon(subItem.name, subItem.mimeType) 
                    : null;
                  
                  return (
                    <div key={`${subItem.id}-${index}`} className="flex items-center space-x-2 py-1 px-2 bg-background rounded-md text-xs hover:bg-muted/50 cursor-pointer"
                         onClick={(e) => {
                           e.stopPropagation();
                           if (subItem.mimeType === 'application/pdf') {
                             setSelectedPdfFile(subItem);
                             setShowPdfViewer(true);
                           } else if (subItem.webViewLink) {
                             window.open(subItem.webViewLink, '_blank');
                           }
                         }}>
                      {subItem.mimeType === 'application/vnd.google-apps.folder' ? (
                        <Folder className="w-3 h-3 text-green-500 flex-shrink-0" />
                      ) : subItemFileInfo ? (
                        <div className={`h-4 w-4 rounded flex items-center justify-center ${subItemFileInfo.bg} flex-shrink-0`}>
                          <subItemFileInfo.icon className={`h-2 w-2 ${subItemFileInfo.color}`} />
                        </div>
                      ) : (
                        <FileText className="w-3 h-3 text-gray-500 flex-shrink-0" />
                      )}
                      <span className="truncate flex-1">{subItem.name}</span>
                      
                      {/* Format badge for subfolder items */}
                      {subItem.mimeType !== 'application/vnd.google-apps.folder' && subItemFileInfo && (
                        <Badge variant="outline" className={`text-xs px-1 py-0 h-3 min-w-0 ${subItemFileInfo.bg} ${subItemFileInfo.color} border-current`}>
                          {subItemFileInfo.name}
                        </Badge>
                      )}
                      
                      {subItem.size && (
                        <span className="text-muted-foreground text-xs">
                          {formatFileSize(subItem.size)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : folderContents[item.id] && folderContents[item.id].length === 0 ? (
              <div className="text-center py-3 text-muted-foreground">
                <Folder className="w-4 h-4 mx-auto mb-1 opacity-50" />
                <p className="text-xs">Empty folder</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={widgetRef}
      className={`fixed z-50 transition-all duration-200 ${
        isDragging ? 'cursor-grabbing scale-105' : isMinimized ? 'cursor-pointer' : 'cursor-auto'
      } ${isResizing ? 'transition-none' : 'transition-all duration-300 ease-out'}`}
      style={{ 
        left: position.x, 
        top: position.y,
        transform: `scale(${isDragging ? 1.05 : 1})`,
        transition: isDragging ? 'transform 0.1s ease' : 'transform 0.3s ease'
      }}
      onMouseDown={handleMouseDown}
      onClick={handleWidgetClick}
      onDragOver={(e) => handleDragOver(e)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e)}
    >
      <Card 
        className={`shadow-2xl border-2 bg-background/98 backdrop-blur-md rounded-2xl relative overflow-hidden ${
          isMinimized ? 'w-16 h-16' : ''
        } ${isResizing ? 'ring-2 ring-green-400 ring-opacity-50' : ''}`}
        style={
          isMinimized 
            ? {} 
            : { 
                width: `${widgetSize.width}px`, 
                height: `${widgetSize.height}px`,
                transition: isResizing ? 'none' : 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transformOrigin: 'top left'
              }
        }
      >
        {/* Header - Minimized shows only icon */}
        {isMinimized ? (
          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl">
            <div className="text-white text-center">
              <Cloud className="w-6 h-6 mx-auto mb-1" />
              <span className="text-xs font-bold">Drive</span>
            </div>
          </div>
        ) : (
          <>
            <div
              ref={dragHandleRef}
              className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-blue-50 to-green-50 cursor-grab active:cursor-grabbing rounded-t-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                  <Cloud className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">Google Drive</h3>
                  <div className="flex items-center gap-1">
                    {isConnectedToDrive ? (
                      <>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          {driveFiles.length} files
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {driveFolders.length} folders
                        </Badge>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                        Not Connected
                      </Badge>
                    )}
                  </div>
                </div>
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
                    if (!isConnectedToDrive) {
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

            <CardContent className="p-0">
              {/* Enhanced Tab Navigation */}
              <div className="bg-gray-50 px-3 py-2 border-b">
                <div className="flex bg-white rounded-lg p-1 shadow-sm">
                  <button
                    onClick={() => setActiveTab('drive')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                      activeTab === 'drive'
                        ? 'bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-md transform scale-105'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <Cloud className="w-3 h-3 mr-1 inline" />
                    Drive Files
                  </button>
                  <button
                    onClick={() => setActiveTab('manager')}
                    className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all duration-200 ${
                      activeTab === 'manager'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md transform scale-105'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <BookOpen className="w-3 h-3 mr-1 inline" />
                    Research Manager
                  </button>
                </div>
              </div>

              <div className="p-3 space-y-3">

              {activeTab === 'drive' ? (
                <>
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <Input
                      placeholder="Search Google Drive..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-7 h-7 text-xs rounded-xl"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Document Manager Search and Filters */}
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                      <Input
                        placeholder="Search documents..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-7 h-7 text-xs rounded-xl"
                      />
                    </div>
                    
                    {/* Filters Row */}
                    <div className="flex gap-1 items-center">
                      <Button
                        variant={showFavorites ? "default" : "outline"}
                        size="sm"
                        className="h-6 text-xs px-2"
                        onClick={() => setShowFavorites(!showFavorites)}
                      >
                        <Star className={`w-3 h-3 mr-1 ${showFavorites ? 'fill-current' : ''}`} />
                        Favorites
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                            <Filter className="w-3 h-3 mr-1" />
                            {filterCategory === 'all' ? 'All' : filterCategory}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setFilterCategory('all')}>
                            All Categories
                          </DropdownMenuItem>
                          {getAvailableCategories().map(category => (
                            <DropdownMenuItem 
                              key={category} 
                              onClick={() => setFilterCategory(category)}
                            >
                              {category}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                            <SortAsc className="w-3 h-3 mr-1" />
                            Sort
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => setSortBy('name')}>
                            <SortAsc className="w-3 h-3 mr-2" />
                            Name
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSortBy('date')}>
                            <Clock className="w-3 h-3 mr-2" />
                            Date Modified
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSortBy('category')}>
                            <Tag className="w-3 h-3 mr-2" />
                            Category
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'drive' && (
                <>
                  {/* Search was moved above */}
                </>
              )}

              {activeTab === 'drive' ? (
                <>
                  {/* Quick Actions for Drive */}
              <div className="flex gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-xs flex-1 px-2 rounded-xl"
                  onClick={() => setShowCreateDialog(true)}
                  disabled={!isConnectedToDrive}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  New Folder
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-xs px-2 rounded-xl"
                  onClick={loadGoogleDriveFiles}
                  disabled={!isConnectedToDrive || isLoadingDrive}
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Drop Zone */}
              {dragOverFolder === null && (
                <div className="border-2 border-dashed border-green-300 bg-green-50/50 rounded-xl p-2 text-center">
                  <div className="text-green-600 text-xs font-medium">Drop document here to upload to Google Drive</div>
                </div>
              )}
              
              <ScrollArea 
                className="pr-2"
                style={{ 
                  height: `${Math.max(200, widgetSize.height - 180)}px` 
                }}
              >
                <div className="space-y-0.5">
                  {isConnectedToDrive ? (
                    <>
                      {/* Google Drive Folders */}
                      {filteredFolders.map((folder) => (
                        <DriveItem key={`drive-folder-${folder.id}`} item={folder} />
                      ))}
                      
                      {/* Google Drive Files */}
                      {filteredFiles.map((file) => (
                        <DriveItem key={`drive-file-${file.id}`} item={file} />
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-8 px-4 space-y-4">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-green-100 rounded-full flex items-center justify-center">
                        <CloudOff className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">Connect to Google Drive</h3>
                        <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                          Access your academic papers, thesis documents, and research files directly from Google Drive. 
                          Organize and manage your documents with advanced features.
                        </p>
                      </div>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="h-8 text-xs bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
                        onClick={connectToGoogleDrive}
                        disabled={isLoadingDrive}
                      >
                        {isLoadingDrive ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Cloud className="w-3 h-3 mr-2" />
                            Connect to Google Drive
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Empty State for connected but no files */}
                {isConnectedToDrive && filteredFolders.length === 0 && filteredFiles.length === 0 && !isLoadingDrive && (
                  <div className="text-center py-6 text-muted-foreground">
                    <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs mb-3">
                      {searchQuery ? 'No files match your search' : 'No files found in Google Drive'}
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
              ) : (
                <>
                  {/* Document Manager Content */}
                  <ScrollArea 
                    className="pr-2"
                    style={{ 
                      height: `${Math.max(200, widgetSize.height - 220)}px` 
                    }}
                  >
                    <div className="space-y-2">
                      {getFilteredDocuments().length > 0 ? (
                        getFilteredDocuments().map((file) => (
                          <div 
                            key={`manager-${file.id}`}
                            className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <FileText className="w-4 h-4 text-red-600 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-xs font-medium truncate">{file.name}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'No date'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => {
                                    if (favorites.has(file.id)) {
                                      removeFromFavorites(file.id);
                                    } else {
                                      addToFavorites(file.id);
                                    }
                                  }}
                                >
                                  <Star className={`w-3 h-3 ${favorites.has(file.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => setSelectedPdfFile(file)}
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <MoreVertical className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent>
                                    <DropdownMenuItem>
                                      <Edit className="w-3 h-3 mr-2" />
                                      Add Note
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Tag className="w-3 h-3 mr-2" />
                                      Add Tag
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <FolderTree className="w-3 h-3 mr-2" />
                                      Set Category
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Share className="w-3 h-3 mr-2" />
                                      Share
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            
                            {/* Document Metadata */}
                            <div className="space-y-1">
                              {/* Category */}
                              {documentCategories[file.id] && (
                                <div className="flex items-center space-x-1">
                                  <FolderTree className="w-3 h-3 text-blue-600" />
                                  <span className="text-xs text-blue-600 font-medium">
                                    {documentCategories[file.id]}
                                  </span>
                                </div>
                              )}
                              
                              {/* Tags */}
                              {documentTags[file.id] && documentTags[file.id].length > 0 && (
                                <div className="flex items-center space-x-1 flex-wrap">
                                  <Tag className="w-3 h-3 text-green-600" />
                                  <div className="flex flex-wrap gap-1">
                                    {documentTags[file.id].map((tag, index) => (
                                      <Badge key={index} variant="secondary" className="text-xs px-1 py-0">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Note */}
                              {documentNotes[file.id] && (
                                <div className="flex items-start space-x-1">
                                  <StickyNote className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                                  <p className="text-xs text-muted-foreground flex-1">
                                    {documentNotes[file.id]}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-xs mb-3">
                            {showFavorites 
                              ? 'No favorite documents yet' 
                              : filterCategory !== 'all'
                                ? `No documents in category "${filterCategory}"`
                                : 'No PDF documents found'
                            }
                          </p>
                          {!showFavorites && filterCategory === 'all' && (
                            <p className="text-xs text-muted-foreground">
                              Upload PDF documents to Google Drive to manage them here
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
            
            {/* Resize Handles - Multiple Corners and Edges */}
            {!isMinimized && (
              <>
                {/* Bottom-right corner (main) */}
                <div
                  className="absolute bottom-0 right-0 w-6 h-6 cursor-nw-resize opacity-60 hover:opacity-100 transition-all duration-200 flex items-center justify-center group"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')}
                  style={{
                    borderBottomRightRadius: '16px'
                  }}
                >
                  <div className="absolute bottom-1 right-1 flex flex-col space-y-1">
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-gray-400 rounded-full group-hover:bg-green-500 transition-colors"></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full group-hover:bg-green-500 transition-colors"></div>
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-1 h-1 bg-gray-400 rounded-full group-hover:bg-green-500 transition-colors"></div>
                      <div className="w-1 h-1 bg-gray-400 rounded-full group-hover:bg-green-500 transition-colors"></div>
                    </div>
                  </div>
                </div>

                {/* Right edge */}
                <div
                  className="absolute top-4 right-0 bottom-4 w-2 cursor-ew-resize opacity-40 hover:opacity-80 hover:bg-green-200 transition-all duration-200 rounded-l"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
                />

                {/* Bottom edge */}
                <div
                  className="absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize opacity-40 hover:opacity-80 hover:bg-green-200 transition-all duration-200 rounded-t"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
                />

                {/* Bottom-left corner */}
                <div
                  className="absolute bottom-0 left-0 w-4 h-4 cursor-ne-resize opacity-60 hover:opacity-100 transition-all duration-200"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')}
                />

                {/* Top-right corner */}
                <div
                  className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize opacity-60 hover:opacity-100 transition-all duration-200"
                  onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')}
                />
              </>
            )}
          </>
        )}
      </Card>

      {/* Create Folder Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
          <Card className="w-80 p-4 rounded-2xl">
            <h3 className="font-medium mb-3">
              {parentFolderId ? 'Create Subfolder' : 'Create New Folder in Google Drive'}
            </h3>
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

      {/* PDF Viewer Dialog - Redesigned */}
      {showPdfViewer && selectedPdfFile && (
        <div className="fixed inset-0 z-[60] bg-black/80">
          <div className="w-full h-full flex flex-col">
            {/* Simple Header */}
            <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-red-500" />
                <span className="font-medium text-gray-900">{selectedPdfFile.name}</span>
                <Badge className="bg-red-100 text-red-800 border-red-200">PDF</Badge>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* Add to Favorites */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFavorite(selectedPdfFile.id)}
                  className="h-8 px-3"
                >
                  <Star className={`w-4 h-4 ${favorites.has(selectedPdfFile.id) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'}`} />
                  <span className="ml-2 text-sm">
                    {favorites.has(selectedPdfFile.id) ? 'Favorited' : 'Add to Favorites'}
                  </span>
                </Button>
                
                {/* Download */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedPdfFile.webContentLink) {
                      window.open(selectedPdfFile.webContentLink, '_blank');
                    }
                  }}
                  className="h-8 px-3"
                >
                  <Download className="w-4 h-4" />
                  <span className="ml-2 text-sm">Download</span>
                </Button>
                
                {/* Close */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPdfViewer(false)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* PDF Content */}
            <div className="flex-1 bg-gray-100 relative">
              <iframe
                src={`https://drive.google.com/file/d/${selectedPdfFile.id}/preview`}
                className="w-full h-full border-0"
                title={selectedPdfFile.name}
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
