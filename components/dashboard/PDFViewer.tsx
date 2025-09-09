import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Download,
  Share,
  Maximize,
  Star,
  FileText,
  Settings,
  BookOpen
} from 'lucide-react';
import { Document } from '../Dashboard';

interface PDFViewerProps {
  document: Document;
  onClose: () => void;
}

export function PDFViewer({ document, onClose }: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(document.pageCount || 1);
  const [zoom, setZoom] = useState(100);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  // Generate iframe src for different sources
  const getPDFSource = () => {
    if (document.url.includes('arxiv.org')) {
      // Convert arXiv URL to PDF URL
      const arxivId = document.url.match(/arxiv\.org\/abs\/([^\/\?]+)/)?.[1];
      if (arxivId) {
        return `https://arxiv.org/pdf/${arxivId}.pdf`;
      }
    }
    
    if (document.url.includes('doi.org')) {
      // For DOI links, we'll show the original URL
      return document.url;
    }
    
    // If it's already a PDF URL or blob URL
    if (document.url.toLowerCase().endsWith('.pdf') || document.url.startsWith('blob:')) {
      return document.url;
    }
    
    // If we have a specific PDF URL from extraction
    if (document.url && document.url.includes('pdf')) {
      return document.url;
    }
    
    // Fallback: try to construct a PDF URL
    return document.url;
  };

  const pdfSource = getPDFSource();

  return (
    <div className="fixed inset-0 z-[100] bg-white">
      <div className="w-full h-full flex flex-col">
        {/* Top Navigation Bar */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          {/* Left Side - Logo and Document Info */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="text-xl font-bold text-gray-900">X</div>
              <div className="text-sm font-medium text-gray-600">XRAIDER</div>
            </div>
            
            <div className="flex items-center space-x-3 ml-6">
              <div className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                PDF
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-900 truncate max-w-md">
                  {document.title}
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {document.category}
              </Badge>
            </div>
          </div>

          {/* Center - Document Controls */}
          <div className="flex items-center space-x-4">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={() => setZoom(Math.max(50, zoom - 25))}
              >
                <ZoomOut className="w-3 h-3" />
              </Button>
              <span className="text-xs font-medium px-2">{zoom}%</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={() => setZoom(Math.min(300, zoom + 25))}
              >
                <ZoomIn className="w-3 h-3" />
              </Button>
            </div>

            {/* Page Navigation */}
            <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-xs font-medium px-2">{currentPage} / {totalPages}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Right Side - Actions */}
          <div className="flex items-center space-x-2">
            {/* Pages Panel Toggle */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0" 
              title="Pages"
              onClick={() => setShowSidebar(!showSidebar)}
            >
              <div className="text-xs font-mono">Pages</div>
            </Button>
            
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Library">
              <BookOpen className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Settings">
              <Settings className="w-4 h-4" />
            </Button>
            
            {/* User Avatar */}
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">M</span>
            </div>
            
            {/* Favorite Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFavorite(!isFavorite)}
              className="h-8 w-8 p-0"
              title={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-500'}`} />
            </Button>
            
            {/* Download */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(pdfSource, '_blank')}
              className="h-8 w-8 p-0"
              title="Download PDF"
            >
              <Download className="w-4 h-4" />
            </Button>
            
            {/* Share */}
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Share">
              <Share className="w-4 h-4" />
            </Button>
            
            {/* Close */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
              title="Close"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Main Content Area - FULL SCREEN PDF */}
        <div className="flex-1 flex bg-gray-50 relative">
          {/* PDF Viewer - FULL WIDTH */}
          <div className="flex-1 bg-white relative">
            {pdfSource ? (
              <iframe
                src={pdfSource}
                className="w-full h-full border-0"
                title={document.title}
                allow="autoplay"
                style={{ zoom: zoom / 100 }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">PDF Not Available</h3>
                    <p className="text-gray-500">The PDF could not be loaded. You can try opening the original link.</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => window.open(document.url, '_blank')}
                  >
                    Open Original Link
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Right Sidebar - Document Info - ONLY SHOW WHEN TOGGLED */}
          {showSidebar && (
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-lg">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Document Info</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSidebar(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-medium text-gray-600 mb-1">Title</h4>
                  <p className="text-sm text-gray-900">{document.title}</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-600 mb-1">Author(s)</h4>
                  <p className="text-sm text-gray-900">{document.author}</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-600 mb-1">Category</h4>
                  <Badge variant="outline" className="text-xs">
                    {document.category}
                  </Badge>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-600 mb-1">Pages</h4>
                  <p className="text-sm text-gray-900">{document.pageCount} pages</p>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-600 mb-1">Added</h4>
                  <p className="text-sm text-gray-900">{new Date(document.createdAt).toLocaleDateString()}</p>
                </div>
                
                {document.tags && document.tags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-gray-600 mb-1">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {document.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Page Thumbnails */}
              <div className="p-4 flex-1">
                <h4 className="text-xs font-medium text-gray-600 mb-3">Pages</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {/* Show first few page thumbnails */}
                  {Array.from({ length: Math.min(10, totalPages) }, (_, i) => i + 1).map((page) => (
                    <div
                      key={page}
                      className={`border rounded-lg p-2 cursor-pointer transition-colors ${
                        currentPage === page 
                          ? 'border-blue-400 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      <div className="aspect-[3/4] bg-white rounded border flex items-center justify-center">
                        <span className="text-xs text-gray-500">Page {page}</span>
                      </div>
                    </div>
                  ))}
                  
                  {totalPages > 10 && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      ... and {totalPages - 10} more pages
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
