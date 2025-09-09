import React, { useState, useRef } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { 
  Upload, 
  File, 
  FileText, 
  Image, 
  X, 
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  onUpload: (files: FileList) => Promise<void>;
  acceptedTypes?: string[];
  maxFileSize?: number; // in MB
  maxFiles?: number;
}

interface FileUploadItem {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  id: string;
}

export function FileUpload({ 
  onUpload, 
  acceptedTypes = ['.pdf', '.doc', '.docx', '.txt'],
  maxFileSize = 100,
  maxFiles = 10
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadItems, setUploadItems] = useState<FileUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (file: File) => {
    if (file.type.includes('pdf')) return FileText;
    if (file.type.includes('image')) return Image;
    return File;
  };

  const getFileColor = (file: File) => {
    if (file.type.includes('pdf')) return 'text-red-500';
    if (file.type.includes('image')) return 'text-blue-500';
    if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) return 'text-blue-600';
    return 'text-gray-500';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return `File size exceeds ${maxFileSize}MB limit`;
    }

    // Check file type
    if (acceptedTypes.length > 0) {
      const isAccepted = acceptedTypes.some(type => 
        file.name.toLowerCase().endsWith(type.toLowerCase()) ||
        file.type.includes(type.replace('.', ''))
      );
      if (!isAccepted) {
        return `File type not supported. Accepted: ${acceptedTypes.join(', ')}`;
      }
    }

    return null;
  };

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    
    if (fileArray.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const newUploadItems: FileUploadItem[] = fileArray.map(file => ({
      file,
      progress: 0,
      status: 'pending',
      id: Math.random().toString(36).substr(2, 9)
    }));

    // Validate files
    const invalidFiles = newUploadItems.filter(item => validateFile(item.file));
    if (invalidFiles.length > 0) {
      invalidFiles.forEach(item => {
        const error = validateFile(item.file);
        toast.error(`${item.file.name}: ${error}`);
      });
      return;
    }

    setUploadItems(newUploadItems);
    setIsUploading(true);

    try {
      // Simulate upload progress
      for (let i = 0; i < newUploadItems.length; i++) {
        const item = newUploadItems[i];
        
        // Update status to uploading
        setUploadItems(prev => prev.map(p => 
          p.id === item.id ? { ...p, status: 'uploading' } : p
        ));

        // Simulate progress
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          setUploadItems(prev => prev.map(p => 
            p.id === item.id ? { ...p, progress } : p
          ));
        }

        // Mark as completed
        setUploadItems(prev => prev.map(p => 
          p.id === item.id ? { ...p, status: 'completed', progress: 100 } : p
        ));
      }

      // Process files through the upload handler
      await onUpload(files);
      
      toast.success(`${fileArray.length} files uploaded successfully!`);
      
      // Clear upload items after success
      setTimeout(() => {
        setUploadItems([]);
      }, 2000);
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed. Please try again.');
      
      // Mark all as error
      setUploadItems(prev => prev.map(p => ({ ...p, status: 'error' })));
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    e.target.value = '';
  };

  const removeUploadItem = (id: string) => {
    setUploadItems(prev => prev.filter(item => item.id !== id));
  };

  return (
    <Card className="bg-background border border-border/60 shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Upload Documents</h2>
          <p className="text-sm text-muted-foreground">
            Drag & drop files or click to browse. Supports PDF, DOC, DOCX, and TXT files.
          </p>
        </div>

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragOver 
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          <h3 className="text-lg font-medium mb-2">
            {isDragOver ? 'Drop files here' : 'Upload your documents'}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag & drop files here, or click to browse
          </p>
          <Button variant="outline" disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Browse Files
              </>
            )}
          </Button>
        </div>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Upload Progress */}
        {uploadItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Upload Progress</h4>
            {uploadItems.map((item) => {
              const IconComponent = getFileIcon(item.file);
              const iconColor = getFileColor(item.file);
              
              return (
                <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <IconComponent className={`w-5 h-5 ${iconColor}`} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium truncate">{item.file.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(item.file.size)}
                        </span>
                        {item.status === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {item.status === 'error' && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        {item.status === 'uploading' && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-4 h-4 p-0"
                          onClick={() => removeUploadItem(item.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <Progress 
                      value={item.progress} 
                      className="h-2"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* File Info */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Maximum file size: {maxFileSize}MB</p>
          <p>• Maximum files: {maxFiles}</p>
          <p>• Supported formats: {acceptedTypes.join(', ')}</p>
        </div>
      </CardContent>
    </Card>
  );
}
