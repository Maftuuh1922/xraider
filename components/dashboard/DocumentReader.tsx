import { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Separator } from '../ui/separator';
import { 
  X, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Highlighter,
  Download,
  Share,
  Maximize,
  Settings
} from 'lucide-react';
import { Document } from '../Dashboard';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface DocumentReaderProps {
  document: Document;
  onClose: () => void;
}

export function DocumentReader({ document, onClose }: DocumentReaderProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);

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
    if (currentPage < document.pageCount) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <Card className="fixed inset-4 z-50 bg-background border-border shadow-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b border-border">
        {/* Document Info */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-12 bg-muted rounded overflow-hidden">
            <ImageWithFallback
              src={document.thumbnail}
              alt={document.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-1">
            <h3 className="font-medium text-sm">{document.title}</h3>
            <p className="text-xs text-muted-foreground">{document.author}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
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

          {/* Page Navigation */}
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
              {currentPage} / {document.pageCount}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={nextPage}
              disabled={currentPage === document.pageCount}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Reader Tools */}
          <Button
            variant={isBookmarked ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsBookmarked(!isBookmarked)}
          >
            <Bookmark className="w-4 h-4" />
          </Button>

          <Button
            variant={highlightMode ? "default" : "ghost"}
            size="sm"
            onClick={() => setHighlightMode(!highlightMode)}
          >
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

          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Main Document View */}
          <div className="flex-1 bg-muted/20 flex items-center justify-center overflow-auto">
            <div 
              className="bg-white shadow-lg rounded-lg overflow-hidden"
              style={{ 
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center'
              }}
            >
              {/* Simulated PDF Page */}
              <div className="w-[595px] h-[842px] bg-white p-12 space-y-6">
                <div className="space-y-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {document.title}
                  </h1>
                  <p className="text-gray-600">
                    {document.author}
                  </p>
                </div>
                
                <div className="space-y-4 text-gray-800 text-sm leading-relaxed">
                  <h2 className="text-lg font-semibold">Abstract</h2>
                  <p>
                    This document represents page {currentPage} of {document.pageCount} from the academic paper 
                    "{document.title}". In a real implementation, this would display the actual PDF content 
                    using PDF.js or similar library.
                  </p>
                  
                  <h2 className="text-lg font-semibold">Introduction</h2>
                  <p>
                    The document reader provides a comprehensive viewing experience with zoom controls, 
                    page navigation, annotations, and bookmarking capabilities. This simulated view 
                    demonstrates the layout and functionality of the PDF reader component.
                  </p>

                  <p>
                    Key features include:
                  </p>
                  <ul className="list-disc pl-6 space-y-1">
                    <li>Variable zoom levels from 50% to 300%</li>
                    <li>Page-by-page navigation</li>
                    <li>Bookmark and highlighting tools</li>
                    <li>Download and sharing options</li>
                    <li>Full-screen reading mode</li>
                  </ul>
                </div>

                {/* Page Number Footer */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                  <span className="text-sm text-gray-500">Page {currentPage}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Page Thumbnails (Optional) */}
          <div className="w-48 bg-muted/30 border-l border-border p-4 space-y-4">
            <h4 className="font-medium text-sm">Pages</h4>
            <div className="space-y-2">
              {Array.from({ length: Math.min(document.pageCount, 10) }, (_, i) => i + 1).map((page) => (
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
              {document.pageCount > 10 && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  ... and {document.pageCount - 10} more pages
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}