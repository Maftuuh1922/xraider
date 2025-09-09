import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { 
  Download, 
  Link2, 
  Loader2, 
  CheckCircle,
  Globe,
  FileText,
  BookOpen,
  Microscope
} from 'lucide-react';
import { toast } from "sonner";

interface DocumentInputProps {
  onExtract: (url: string) => Promise<void>;
}

const supportedSources = [
  { name: 'Google Scholar', icon: Globe, domain: 'scholar.google.com' },
  { name: 'ResearchGate', icon: FileText, domain: 'researchgate.net' },
  { name: 'arXiv', icon: BookOpen, domain: 'arxiv.org' },
  { name: 'PubMed', icon: Microscope, domain: 'pubmed.ncbi.nlm.nih.gov' },
];

export function DocumentInput({ onExtract }: DocumentInputProps) {
  const [url, setUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedCount, setExtractedCount] = useState(0);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const getSourceInfo = (url: string) => {
    try {
      const urlObj = new URL(url);
      const source = supportedSources.find(s => urlObj.hostname.includes(s.domain.split('.')[0]));
      return source;
    } catch {
      return null;
    }
  };

  const handleExtract = async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    if (!validateUrl(url)) {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsExtracting(true);
    
    try {
      await onExtract(url);
      setUrl('');
      setExtractedCount(prev => prev + 1);
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Extraction failed:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isExtracting) {
      handleExtract();
    }
  };

  const sourceInfo = url ? getSourceInfo(url) : null;

  return (
    <Card className="bg-background border border-border/60 shadow-sm">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Extract Academic Document</h2>
            <p className="text-sm text-muted-foreground">
              Enter a URL from any supported academic source to extract and organize the document
            </p>
          </div>
          
          {extractedCount > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              {extractedCount} extracted
            </Badge>
          )}
        </div>

        {/* URL Input */}
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://scholar.google.com/paper/123... or arXiv URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
                disabled={isExtracting}
              />
            </div>
            
            <Button 
              onClick={handleExtract}
              disabled={!url.trim() || isExtracting}
              className="bg-background hover:bg-secondary"
            >
              {isExtracting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              {isExtracting ? 'Extracting...' : 'Extract'}
            </Button>
          </div>

          {/* Source Detection */}
          {sourceInfo && (
            <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
              <sourceInfo.icon className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-600 font-medium">
                {sourceInfo.name} detected
              </span>
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          )}
        </div>

        {/* Supported Sources - Compact Grid */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Supported Sources</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {supportedSources.map((source, index) => {
              const IconComponent = source.icon;
              return (
                <div 
                  key={index}
                  className="flex items-center gap-2 px-2 py-1.5 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors text-xs"
                >
                  <IconComponent className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">{source.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions - Real Examples */}
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setUrl('https://arxiv.org/abs/1706.03762')}
            disabled={isExtracting}
            className="text-xs px-3 py-1"
          >
            Try: Attention Is All You Need
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setUrl('https://arxiv.org/abs/2005.14165')}
            disabled={isExtracting}
            className="text-xs px-3 py-1"
          >
            Try: GPT-3 Paper
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setUrl('https://doi.org/10.1038/nature14539')}
            disabled={isExtracting}
            className="text-xs px-3 py-1"
          >
            Try: Nature DOI
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setUrl('')}
            disabled={isExtracting}
            className="text-xs px-3 py-1"
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}