'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download, Bookmark, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  size?: string;
  modifiedTime?: string;
}

interface FullScreenPDFViewerProps {
  file: DriveFile;
  onClose: () => void;
  onToggleFavorite?: (fileId: string) => void;
  isFavorite?: boolean;
}

export function FullScreenPDFViewer({ 
  file, 
  onClose, 
  onToggleFavorite, 
  isFavorite = false 
}: FullScreenPDFViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showSidebar, setShowSidebar] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Generate PDF URL for viewing
    if (file.webViewLink) {
      // Convert Google Drive view link to embed link
      const fileId = file.id;
      const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      setPdfUrl(embedUrl);
    } else if (file.webContentLink) {
      setPdfUrl(file.webContentLink);
    }
  }, [file]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 50));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    if (file.webContentLink) {
      window.open(file.webContentLink, '_blank');
    }
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const formatFileSize = (size?: string) => {
    if (!size) return 'Unknown size';
    const bytes = parseInt(size);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white border-b px-4 py-3 shadow-sm">
        {/* Left Section - Brand and File Info */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">X</span>
            </div>
            <span className="font-semibold text-gray-900">XRAIDER</span>
          </div>
          
          <div className="h-6 w-px bg-gray-300" />
          
          <div className="flex items-center space-x-2">
            <div className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
              PDF
            </div>
            <span className="text-sm font-medium text-gray-900 max-w-96 truncate">
              {file.name}
            </span>
          </div>
        </div>

        {/* Center Section - Navigation Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-600">
                {currentPage} / {totalPages}
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-gray-300" />

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center space-x-2 min-w-32">
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={50}
                max={300}
                step={25}
                className="w-20"
              />
              <span className="text-sm font-medium text-gray-700 min-w-12 text-center">
                {zoom}%
              </span>
            </div>
            
            <Button variant="ghost" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRotate}
            title="Rotate"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFavorite?.(file.id)}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Bookmark className={`w-4 h-4 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar(!showSidebar)}
            title={showSidebar ? "Hide sidebar" : "Show sidebar"}
          >
            {showSidebar ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
          
          <div className="h-6 w-px bg-gray-300" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-100 flex items-center justify-center">
          {isLoading && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading PDF...</p>
              </div>
            </div>
          )}
          
          {pdfUrl && (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              className="w-full h-full border-0"
              style={{
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center center'
              }}
              onLoad={() => setIsLoading(false)}
              title={file.name}
            />
          )}
          
          {!pdfUrl && !isLoading && (
            <div className="text-center text-gray-500">
              <p className="text-lg mb-2">Unable to preview this PDF</p>
              <p className="text-sm">The file might not be publicly accessible or supported for preview.</p>
              <Button
                onClick={handleDownload}
                className="mt-4"
                disabled={!file.webContentLink}
              >
                <Download className="w-4 h-4 mr-2" />
                Download File
              </Button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2">Document Info</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* File Details */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <span className="text-gray-900 truncate ml-2">{file.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Size:</span>
                    <span className="text-gray-900">{formatFileSize(file.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Modified:</span>
                    <span className="text-gray-900">{formatDate(file.modifiedTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type:</span>
                    <span className="text-gray-900">PDF Document</span>
                  </div>
                </div>
              </div>

              {/* Page Thumbnails */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Pages</h4>
                <div className="bg-blue-50 rounded-lg p-8 text-center border-2 border-dashed border-blue-200">
                  <div className="text-blue-600 mb-2">📄</div>
                  <p className="text-sm text-blue-700 font-medium">Page {currentPage}</p>
                  <p className="text-xs text-blue-600 mt-1">Click page to navigate</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Actions</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => onToggleFavorite?.(file.id)}
                  >
                    <Bookmark className={`w-4 h-4 mr-2 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    {isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={handleDownload}
                    disabled={!file.webContentLink}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
