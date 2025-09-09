import { useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { useAuth } from '../AuthContext';
import {
  X,
  Search,
  Folder,
  FolderOpen,
  FileText,
  Calendar,
  Filter,
  SortAsc,
  Eye,
  Download,
  Trash2,
  BookOpen,
  Newspaper,
  Book,
  User,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Highlighter,
  Share,
  Maximize,
  Grid,
  List,
  LayoutGrid
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import type { Document, DocumentCategory } from '../Dashboard';

interface LibraryPopupProps {
  isOpen: boolean;
  onClose: () => void;
  documents: Document[];
}

// Reuse dashboard categories for consistent UX
const dashboardCategories: { id: DocumentCategory; label: string; icon: any }[] = [
  { id: 'Computer Science', label: 'Computer Science', icon: FileText },
  { id: 'Physics', label: 'Physics', icon: BookOpen },
  { id: 'Environmental Science', label: 'Environmental Science', icon: Newspaper },
  { id: 'Medical Science', label: 'Medical Science', icon: Book },
  { id: 'General', label: 'General', icon: User }
];

export function LibraryPopup({ isOpen, onClose, documents }: LibraryPopupProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<DocumentCategory | 'All'>('All');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [realContent, setRealContent] = useState<string | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [isFolderManagerMinimized, setIsFolderManagerMinimized] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const { getDriveAccessToken } = useAuth();

  if (!isOpen) return null;

  const toggleFolder = (folderId: string) => {
    // Remove toggle logic since we're using floating manager
  };

  const filteredDocuments = documents
    .filter(doc => activeCategory === 'All' || doc.category === activeCategory)
    .filter(doc => {
      // If no folder selected, show all
      if (!selectedFolder) return true;
      
      // Filter by folder selection from floating manager
      switch (selectedFolder) {
        case 'recent':
          const daysSinceCreated = Math.floor((Date.now() - doc.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          return daysSinceCreated <= 7;
        case 'starred':
          return doc.tags.includes('starred');
        case 'shared':
          return doc.url.includes('drive.google.com');
        case 'research':
          return doc.category === 'Computer Science' || doc.category === 'Physics' || doc.category === 'Medical Science';
        case 'research-cs':
          return doc.category === 'Computer Science';
        case 'research-physics':
          return doc.category === 'Physics';
        case 'projects':
          return doc.tags.some(tag => tag.toLowerCase().includes('project') || tag.toLowerCase().includes('work'));
        case 'archive':
          return doc.tags.includes('archived');
        default:
          return doc.tags.includes(selectedFolder);
      }
    })
    .filter(doc =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const zoomLevels = [50, 75, 100, 125, 150, 200, 300];

  const handleZoomIn = () => {
    const currentIndex = zoomLevels.indexOf(zoom);
    if (currentIndex < zoomLevels.length - 1) {
      setZoom(zoomLevels[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = zoomLevels.indexOf(zoom);
    if (currentIndex > 0) {
      setZoom(zoomLevels[currentIndex - 1]);
    }
  };

  const nextPage = () => {
    const maxPages = Math.max(selectedDocument?.pageCount || 10, 10);
    if (selectedDocument && currentPage < maxPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleDocumentClick = async (document: Document) => {
    setSelectedDocument(document);
    setCurrentPage(1);
    setZoom(100);
    setRealContent(null);
    
    // If it's a Google Drive file, try to get real content
    if (document.url.includes('drive.google.com') && getDriveAccessToken()) {
      setContentLoading(true);
      try {
        // Extract file ID from URL
        const fileIdMatch = document.url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (fileIdMatch) {
          const fileId = fileIdMatch[1];
          
          // For any Google Drive file, use embed preview for fastest loading
          setRealContent(`https://drive.google.com/file/d/${fileId}/preview`);
          setContentLoading(false);
          return;
        }
      } catch (error) {
        console.error('Failed to load real content:', error);
      } finally {
        setContentLoading(false);
      }
    }
  };

  const handleCloseReader = () => {
    setSelectedDocument(null);
    setRealContent(null);
    setContentLoading(false);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    try {
      const dragDataStr = e.dataTransfer.getData('application/json');
      const dragData = JSON.parse(dragDataStr);
      
      if (dragData.type === 'document' && dragData.sourceType === 'dashboard') {
        console.log('Document dropped into library:', dragData.data);
        // Handle adding document to library
        // In a real app, you might want to show a confirmation or move the document
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <Card 
          className={`w-full max-w-6xl h-[85vh] bg-background border-border shadow-2xl transition-all ${
            isDragOver ? 'border-blue-400 border-2 border-dashed bg-blue-50/10' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-6 border-b border-border">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Document Library</h2>
              <p className="text-sm text-muted-foreground">
                Organize and manage your academic documents
                {selectedFolder && (
                  <span className="ml-2 text-blue-600">
                    • Filtered by folder
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFolderManagerMinimized(!isFolderManagerMinimized)}
              >
                <Folder className="w-4 h-4 mr-2" />
                {isFolderManagerMinimized ? 'Show' : 'Hide'} Folders
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 overflow-hidden">
            {/* Full Width Content - Document List */}
            <div className="h-full flex flex-col">
              {/* Category Tabs and Controls */}
              <div className="p-4 border-b border-border space-y-4">
                <div className="space-y-3">
                  <Tabs value={activeCategory} onValueChange={(val) => setActiveCategory(val as DocumentCategory | 'All')}>
                    <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
                      <TabsTrigger value="All" className="flex items-center gap-2 text-xs lg:text-sm">
                        <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium">All</span>
                        <span className="hidden sm:inline">All</span>
                      </TabsTrigger>
                      {dashboardCategories.map(cat => {
                        const Icon = cat.icon;
                        const count = documents.filter(d => d.category === cat.id).length;
                        return (
                          <TabsTrigger key={cat.id} value={cat.id} className="flex items-center gap-2 text-xs lg:text-sm">
                            <Icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{cat.label}</span>
                            {count > 0 && (
                              <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">{count}</Badge>
                            )}
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </Tabs>
                </div>

                {/* Search and View Controls */}
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search documents, authors, or tags..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                    <Button
                      variant={viewMode === 'list' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('list')}
                      className="h-8 w-8 p-0"
                    >
                      <List className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="h-8 w-8 p-0"
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <Button variant="outline" size="sm">
                    <SortAsc className="w-4 h-4 mr-2" />
                    Sort
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''} found
                    {selectedFolder && (
                      <span className="ml-2 text-blue-600">
                        in selected folder
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    {selectedFolder && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedFolder(null)}
                      >
                        Clear folder filter
                      </Button>
                    )}
                    {searchQuery && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSearchQuery('')}
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Document List with Scroll */}
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {viewMode === 'list' ? (
                    <div className="space-y-3">
                      {filteredDocuments.map((document) => (
                        <div
                          key={document.id}
                          className="flex items-center gap-4 p-3 bg-card/50 hover:bg-card border border-border/50 hover:border-border rounded-lg group transition-all duration-200 cursor-pointer"
                          onClick={() => handleDocumentClick(document)}
                        >
                          {/* Document Icon/Thumbnail */}
                          <div className="w-10 h-12 bg-muted rounded overflow-hidden flex-shrink-0">
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </div>

                          {/* Document Info */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <h4 className="font-medium text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                              {document.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {document.author}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {document.createdAt.toLocaleDateString()}
                              </span>
                              <span>{document.pageCount} pages</span>
                              <Badge variant="outline" className="text-xs">
                                {document.category}
                              </Badge>
                            </div>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1 max-w-40">
                            {document.tags.slice(0, 3).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDocumentClick(document);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {filteredDocuments.map((document) => (
                        <div
                          key={document.id}
                          className="bg-card/50 hover:bg-card border border-border/50 hover:border-border rounded-lg p-4 group transition-all duration-200 cursor-pointer space-y-3"
                          onClick={() => handleDocumentClick(document)}
                        >
                          {/* Document Thumbnail */}
                          <div className="w-full aspect-[3/4] bg-muted rounded overflow-hidden">
                            <div className="w-full h-full flex items-center justify-center">
                              <FileText className="w-8 h-8 text-muted-foreground" />
                            </div>
                          </div>

                          {/* Document Info */}
                          <div className="space-y-1">
                            <h4 className="font-medium text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">
                              {document.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {document.author}
                            </p>
                          </div>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1">
                            {document.tags.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0.5">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-muted-foreground">
                              {document.pageCount}p
                            </span>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDocumentClick(document);
                                }}
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {filteredDocuments.length === 0 && (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-12 h-12 bg-muted/50 rounded-xl flex items-center justify-center mx-auto">
                        <Search className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-medium">No documents found</h4>
                        <p className="text-sm text-muted-foreground">
                          {searchQuery 
                            ? `No results for "${searchQuery}"`
                            : selectedFolder
                              ? "This folder is empty"
                              : "No documents to display"
                          }
                        </p>
                      </div>
                      {(searchQuery || selectedFolder) && (
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedFolder(null);
                          }}
                        >
                          Clear all filters
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Folder Manager */}
      <FloatingFolderManager
        documents={documents}
        isMinimized={isFolderManagerMinimized}
        onToggleMinimize={() => setIsFolderManagerMinimized(!isFolderManagerMinimized)}
        onFolderSelect={setSelectedFolder}
        selectedFolderId={selectedFolder}
      />

      {/* Document Reader Dialog - Same as DocumentReader but in Dialog */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <Card className="w-full max-w-7xl h-[90vh] bg-background border-border shadow-2xl">
            {/* Header with controls like DocumentReader */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b border-border">
              {/* Document Info */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-12 bg-muted rounded overflow-hidden">
                  <ImageWithFallback
                    src={selectedDocument.thumbnail}
                    alt={selectedDocument.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">{selectedDocument.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedDocument.author}
                    {realContent?.startsWith('http') && (
                      <span className="ml-2 text-blue-600">• Konten asli dari Google Drive</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Controls - Hide zoom for Google Drive files since they have their own */}
              <div className="flex items-center gap-2">
                {/* Zoom Controls - Only show for non-Drive files */}
                {(!realContent?.startsWith('http')) && (
                  <>
                    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleZoomOut}
                        disabled={zoom === zoomLevels[0]}
                      >
                        <ZoomOut className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium px-2 min-w-[60px] text-center">
                        {zoom}%
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleZoomIn}
                        disabled={zoom === zoomLevels[zoomLevels.length - 1]}
                      >
                        <ZoomIn className="w-4 h-4" />
                      </Button>
                    </div>

                    <Separator orientation="vertical" className="h-6" />
                  </>
                )}

                {/* Page Navigation - Only show for non-Drive files */}
                {(!realContent?.startsWith('http')) && (
                  <>
                    <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={prevPage}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm font-medium px-3 min-w-[80px] text-center">
                        {currentPage} / {Math.max(selectedDocument.pageCount, 10)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={nextPage}
                        disabled={currentPage === Math.max(selectedDocument.pageCount, 10)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>

                    <Separator orientation="vertical" className="h-6" />
                  </>
                )}

                {/* Reader Tools */}
                <Button variant="ghost" size="sm">
                  <Bookmark className="w-4 h-4" />
                </Button>

                <Button variant="ghost" size="sm">
                  <Highlighter className="w-4 h-4" />
                </Button>

                <Button variant="ghost" size="sm">
                  <Download className="w-4 h-4" />
                </Button>

                <Button variant="ghost" size="sm">
                  <Share className="w-4 h-4" />
                </Button>

                <Button variant="ghost" size="sm">
                  <Maximize className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className="h-6" />

                <Button variant="ghost" size="sm" onClick={handleCloseReader}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>

            {/* Content area with document view and page thumbnails */}
            <CardContent className="p-0 flex-1 overflow-hidden">
              <div className="h-full flex">
                {/* Main Document View */}
                <div className="flex-1 bg-black overflow-hidden">
                  {contentLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-sm text-muted-foreground">Memuat konten asli...</p>
                        </div>
                      </div>
                    ) : realContent?.startsWith('http') ? (
                      // Display real PDF/document content via iframe
                      <div className="w-full h-full bg-black">
                        <iframe 
                          src={realContent} 
                          className="w-full h-full border-0 bg-transparent" 
                          title={selectedDocument.title}
                          allow="autoplay"
                          style={{ 
                            margin: 0, 
                            padding: 0,
                            backgroundColor: 'transparent'
                          }}
                        />
                      </div>
                    ) : realContent ? (
                      // Display extracted text content
                      <ScrollArea className="w-full h-full">
                        <div className="w-full max-w-4xl mx-auto p-8">
                          <div className="bg-white shadow-lg rounded-lg p-12 space-y-6">
                            <div className="space-y-4">
                              <h1 className="text-2xl font-bold text-gray-900">
                                {selectedDocument.title}
                              </h1>
                              <p className="text-gray-600">
                                By {selectedDocument.author}
                              </p>
                              <div className="flex gap-2 flex-wrap">
                                {selectedDocument.tags.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            
                            <div className="space-y-4 text-gray-800 text-sm leading-relaxed">
                              <h2 className="text-lg font-semibold">Konten Asli</h2>
                              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-gray-50 p-4 rounded-lg">
                                {realContent}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </ScrollArea>
                    ) : (
                      // Fallback to simulated content if real content not available
                      <ScrollArea className="w-full h-full flex items-center justify-center">
                        <div 
                          className="bg-white shadow-lg rounded-lg overflow-hidden mx-auto my-8"
                          style={{ 
                            transform: `scale(${zoom / 100})`,
                            transformOrigin: 'center center'
                          }}
                        >
                        {/* Real PDF-like content based on document */}
                        <div className="w-[595px] h-[842px] bg-white p-12 space-y-6 relative">
                          <div className="space-y-4">
                            <h1 className="text-2xl font-bold text-gray-900">
                              {selectedDocument.title}
                            </h1>
                            <p className="text-gray-600">
                              By {selectedDocument.author}
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {selectedDocument.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="space-y-4 text-gray-800 text-sm leading-relaxed">
                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                              <p className="text-sm text-yellow-800">
                                <strong>Note:</strong> Konten asli tidak dapat dimuat. Menampilkan konten simulasi.
                                Untuk dokumen Google Drive, pastikan file dapat diakses publik atau login dengan akun yang tepat.
                              </p>
                            </div>
                            
                            {currentPage === 1 && (
                              <>
                                <h2 className="text-lg font-semibold">Abstract</h2>
                                <p>
                                  This research paper presents a comprehensive study on {selectedDocument.title}. 
                                  The work is categorized under {selectedDocument.category} and demonstrates significant 
                                  contributions to the field. This document was sourced from {selectedDocument.url.includes('drive.google.com') ? 'Google Drive' : 'URL extraction'} 
                                  and contains valuable insights for researchers and practitioners.
                                </p>
                                
                                <h2 className="text-lg font-semibold">Keywords</h2>
                                <p className="italic">
                                  {selectedDocument.tags.join(', ')}
                                </p>

                                <h2 className="text-lg font-semibold">1. Introduction</h2>
                                <p>
                                  In recent years, research in {selectedDocument.category} has gained significant momentum. 
                                  This paper contributes to the existing body of knowledge by exploring innovative approaches 
                                  and methodologies. The findings presented here have implications for both theoretical 
                                  understanding and practical applications in the field.
                                </p>
                                
                                <p>
                                  The structure of this paper is organized as follows: Section 2 presents the literature review, 
                                  Section 3 outlines the methodology, Section 4 discusses the results, and Section 5 concludes 
                                  with future research directions.
                                </p>
                              </>
                            )}

                            {currentPage === 2 && (
                              <>
                                <h2 className="text-lg font-semibold">2. Literature Review</h2>
                                <p>
                                  The literature in {selectedDocument.category} reveals several important trends and developments. 
                                  Previous studies have established foundational knowledge that informs current research directions.
                                </p>
                                
                                <h3 className="font-semibold">2.1 Historical Context</h3>
                                <p>
                                  Early work in this field laid the groundwork for contemporary understanding. The evolution 
                                  of concepts and methodologies has been marked by significant milestones that continue to 
                                  influence current research paradigms.
                                </p>

                                <h3 className="font-semibold">2.2 Current State of Research</h3>
                                <p>
                                  Recent advances have opened new avenues for investigation. The integration of modern 
                                  technologies and analytical methods has enhanced the depth and scope of research 
                                  capabilities in {selectedDocument.category}.
                                </p>

                                <h3 className="font-semibold">2.3 Research Gaps</h3>
                                <p>
                                  Despite significant progress, several areas require further investigation. This study 
                                  addresses some of these gaps by proposing novel approaches and solutions.
                                </p>
                              </>
                            )}

                            {currentPage === 3 && (
                              <>
                                <h2 className="text-lg font-semibold">3. Methodology</h2>
                                <p>
                                  This section outlines the research methodology employed in this study. The approach 
                                  combines both quantitative and qualitative methods to ensure comprehensive analysis.
                                </p>
                                
                                <h3 className="font-semibold">3.1 Research Design</h3>
                                <p>
                                  The research design follows a systematic approach that incorporates multiple data sources 
                                  and analytical techniques. This multi-faceted methodology ensures robust and reliable results.
                                </p>

                                <h3 className="font-semibold">3.2 Data Collection</h3>
                                <p>
                                  Data collection procedures were designed to maximize validity and minimize bias. 
                                  Primary and secondary data sources were utilized to provide comprehensive coverage 
                                  of the research domain.
                                </p>

                                <h3 className="font-semibold">3.3 Analysis Framework</h3>
                                <p>
                                  The analytical framework employs advanced statistical methods and computational tools 
                                  to process and interpret the collected data. This approach ensures accurate and 
                                  meaningful conclusions.
                                </p>
                              </>
                            )}

                            {currentPage >= 4 && (
                              <>
                                <h2 className="text-lg font-semibold">{currentPage}. Results and Discussion</h2>
                                <p>
                                  This section presents the findings from the research investigation. The results 
                                  demonstrate significant insights into {selectedDocument.category} and provide 
                                  evidence for the proposed hypotheses.
                                </p>
                                
                                <h3 className="font-semibold">{currentPage}.1 Key Findings</h3>
                                <p>
                                  The analysis reveals several important patterns and relationships within the data. 
                                  These findings contribute to a deeper understanding of the research domain and 
                                  have implications for future work.
                                </p>

                                <h3 className="font-semibold">{currentPage}.2 Implications</h3>
                                <p>
                                  The results have both theoretical and practical implications. From a theoretical 
                                  perspective, they advance our understanding of fundamental concepts. Practically, 
                                  they offer actionable insights for practitioners in the field.
                                </p>

                                <h3 className="font-semibold">{currentPage}.3 Limitations</h3>
                                <p>
                                  While the study provides valuable insights, certain limitations should be acknowledged. 
                                  These limitations provide opportunities for future research and methodological improvements.
                                </p>
                              </>
                            )}
                          </div>

                          {/* Page Number Footer */}
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                            <span className="text-sm text-gray-500">Page {currentPage} of {Math.max(selectedDocument.pageCount, 10)}</span>
                          </div>
                        </div>
                        </div>
                      </ScrollArea>
                    )}
                </div>

                {/* Sidebar - Page Thumbnails with scroll - Only show for non-iframe content */}
                {(!realContent?.startsWith('http')) && (
                  <div className="w-48 bg-muted/30 border-l border-border p-4 space-y-4 flex flex-col">
                    <h4 className="font-medium text-sm">Pages</h4>
                    <ScrollArea className="flex-1">
                      <div className="space-y-2">
                        {Array.from({ length: Math.max(selectedDocument.pageCount, 10) }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-full aspect-[3/4] bg-white border-2 rounded-lg overflow-hidden transition-colors ${
                              currentPage === page 
                                ? 'border-blue-500 ring-2 ring-blue-200' 
                                : 'border-border hover:border-muted-foreground'
                            }`}
                          >
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                              Page {page}
                            </div>
                          </button>
                        ))}
                        {Math.max(selectedDocument.pageCount, 10) > 10 && (
                          <div className="text-xs text-muted-foreground text-center py-2">
                            ... and {Math.max(selectedDocument.pageCount, 10) - 10} more pages
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}