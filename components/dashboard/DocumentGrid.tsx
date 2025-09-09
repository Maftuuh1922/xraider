import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  BookOpen, 
  FileText, 
  Newspaper, 
  Book, 
  User,
  Eye,
  Download,
  Trash2,
  Calendar,
  Tag
} from 'lucide-react';
import type { Document, DocumentCategory } from '../Dashboard';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface DocumentGridProps {
  documents: Document[];
  activeCategory: DocumentCategory;
  onCategoryChange: (category: DocumentCategory) => void;
  onSelectDocument: (document: Document) => void;
}

const categories = [
  { id: 'Computer Science' as DocumentCategory, label: 'Computer Science', icon: FileText },
  { id: 'Physics' as DocumentCategory, label: 'Physics', icon: BookOpen },
  { id: 'Environmental Science' as DocumentCategory, label: 'Environmental Science', icon: Newspaper },
  { id: 'Medical Science' as DocumentCategory, label: 'Medical Science', icon: Book },
  { id: 'General' as DocumentCategory, label: 'General', icon: User },
];

export function DocumentGrid({ 
  documents, 
  activeCategory, 
  onCategoryChange, 
  onSelectDocument 
}: DocumentGridProps) {
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, document: Document) => {
    const dragData = {
      type: 'document',
      data: document,
      sourceType: 'dashboard'
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = 'move';
    
    // Add visual feedback
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // Reset visual feedback
    e.currentTarget.style.opacity = '1';
  };

  const EmptyState = ({ category }: { category: DocumentCategory }) => {
    const categoryInfo = categories.find(c => c.id === category);
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-12 space-y-3">
        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
          {categoryInfo && <categoryInfo.icon className="w-6 h-6 text-muted-foreground" />}
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-base font-medium">No {categoryInfo?.label} Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Start by extracting documents from academic sources or upload your own files.
          </p>
        </div>
        <Button 
          variant="outline"
          size="sm"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          Extract Your First Document
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={(value) => onCategoryChange(value as DocumentCategory)}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          {categories.map((category) => {
            const IconComponent = category.icon;
            return (
              <TabsTrigger 
                key={category.id} 
                value={category.id}
                className="flex items-center gap-2 text-xs lg:text-sm"
              >
                <IconComponent className="w-4 h-4" />
                <span className="hidden sm:inline">{category.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          {documents.length === 0 ? (
            <EmptyState category={activeCategory} />
          ) : (
            <div className="space-y-3">
              {/* Documents Count */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {documents.length} document{documents.length !== 1 ? 's' : ''} found
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Sort by Date
                  </Button>
                  <Button variant="outline" size="sm">
                    Filter
                  </Button>
                </div>
              </div>

              {/* Document Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {documents.map((document) => (
                  <Card 
                    key={document.id} 
                    className="group transition-all duration-200 cursor-pointer bg-background hover:bg-muted/40 border border-border/60 shadow-sm"
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, document)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectDocument(document)}
                  >
                    <CardContent className="p-0">
                      {/* Document Thumbnail */}
                      <div className="relative aspect-[3/4] overflow-hidden rounded-t-lg">
                        <ImageWithFallback
                          src={document.thumbnail}
                          alt={`${document.title} thumbnail`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        
                        {/* Page Count Badge */}
                        <Badge 
                          variant="secondary" 
                          className="absolute top-2 right-2 bg-foreground/90 text-background border-0 text-xs"
                        >
                          {document.pageCount} pages
                        </Badge>

                        {/* Quick Actions - Show on Hover */}
                        <div className="absolute inset-0 bg-foreground/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectDocument(document);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Read
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle download
                            }}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle delete
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Document Info */}
                      <div className="p-3 space-y-2">
                        <div className="space-y-1">
                          <h3 className="font-medium line-clamp-2 group-hover:text-blue-600 transition-colors text-sm">
                            {document.title}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {document.author}
                          </p>
                        </div>

                        {/* Tags */}
                        {document.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {document.tags.slice(0, 2).map((tag) => (
                              <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="text-xs px-2 py-0.5"
                              >
                                <Tag className="w-2 h-2 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                            {document.tags.length > 2 && (
                              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                                +{document.tags.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Date */}
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(document.createdAt)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}