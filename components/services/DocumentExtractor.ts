import { Document } from '../DocumentContext';

interface ExtractedMetadata {
  title: string;
  authors: string[];
  abstract: string;
  source: string;
  url: string;
  pdfUrl?: string;
  datePublished?: string;
  tags: string[];
  category: string;
  pages?: number;
  doi?: string;
  citation?: string;
}

export class DocumentExtractor {
  private static instance: DocumentExtractor;
  
  public static getInstance(): DocumentExtractor {
    if (!DocumentExtractor.instance) {
      DocumentExtractor.instance = new DocumentExtractor();
    }
    return DocumentExtractor.instance;
  }

  /**
   * Extract document metadata from various academic sources
   */
  async extractFromUrl(url: string): Promise<ExtractedMetadata> {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Route to appropriate extractor based on domain
    if (hostname.includes('arxiv.org')) {
      return this.extractFromArXiv(url);
    } else if (hostname.includes('scholar.google')) {
      return this.extractFromGoogleScholar(url);
    } else if (hostname.includes('researchgate.net')) {
      return this.extractFromResearchGate(url);
    } else if (hostname.includes('pubmed.ncbi.nlm.nih.gov')) {
      return this.extractFromPubMed(url);
    } else if (hostname.includes('doi.org') || hostname.includes('dx.doi.org')) {
      return this.extractFromDOI(url);
    } else if (url.toLowerCase().endsWith('.pdf')) {
      return this.extractFromDirectPDF(url);
    } else {
      return this.extractFromGenericUrl(url);
    }
  }

  /**
   * Extract from arXiv URLs
   */
  private async extractFromArXiv(url: string): Promise<ExtractedMetadata> {
    try {
      // Extract arXiv ID from URL
      const arxivId = this.extractArXivId(url);
      if (!arxivId) {
        throw new Error('Invalid arXiv URL');
      }

      // Use arXiv API to get metadata
      const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
      
      const response = await fetch(apiUrl);
      const xmlText = await response.text();
      
      // Parse XML response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const entry = xmlDoc.querySelector('entry');
      if (!entry) {
        throw new Error('Paper not found');
      }

      const title = entry.querySelector('title')?.textContent?.trim() || 'Unknown Title';
      const summary = entry.querySelector('summary')?.textContent?.trim() || '';
      const published = entry.querySelector('published')?.textContent?.trim() || '';
      
      // Extract authors
      const authors = Array.from(entry.querySelectorAll('author name')).map(
        author => author.textContent?.trim() || ''
      ).filter(Boolean);

      // Extract categories for classification
      const categories = Array.from(entry.querySelectorAll('category')).map(
        cat => cat.getAttribute('term') || ''
      ).filter(Boolean);

      const category = this.classifyCategory(categories.join(' ') + ' ' + title);
      
      // Generate PDF URL
      const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;

      return {
        title,
        authors,
        abstract: summary,
        source: 'arXiv',
        url,
        pdfUrl,
        datePublished: published,
        tags: ['arxiv', 'preprint', ...categories.slice(0, 3)],
        category,
        doi: arxivId,
        citation: this.generateCitation(title, authors, 'arXiv', published)
      };
    } catch (error) {
      console.error('arXiv extraction failed:', error);
      return this.fallbackExtraction(url, 'arXiv');
    }
  }

  /**
   * Extract arXiv ID from various URL formats
   */
  private extractArXivId(url: string): string | null {
    const patterns = [
      /arxiv\.org\/abs\/([^\/\?]+)/,
      /arxiv\.org\/pdf\/([^\/\?]+)/,
      /arxiv\.org\/([^\/\?]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1].replace('.pdf', '');
      }
    }
    return null;
  }

  /**
   * Extract from Google Scholar (limited due to bot protection)
   */
  private async extractFromGoogleScholar(url: string): Promise<ExtractedMetadata> {
    // Google Scholar blocks automated requests, so we'll do basic URL parsing
    const title = this.extractTitleFromUrl(url);
    return this.fallbackExtraction(url, 'Google Scholar', title);
  }

  /**
   * Extract from ResearchGate
   */
  private async extractFromResearchGate(url: string): Promise<ExtractedMetadata> {
    try {
      // ResearchGate also blocks bots, but we can try basic parsing
      const title = this.extractTitleFromUrl(url);
      return this.fallbackExtraction(url, 'ResearchGate', title);
    } catch (error) {
      return this.fallbackExtraction(url, 'ResearchGate');
    }
  }

  /**
   * Extract from PubMed
   */
  private async extractFromPubMed(url: string): Promise<ExtractedMetadata> {
    try {
      // Extract PMID from URL
      const pmidMatch = url.match(/\/(\d+)\/?/);
      if (!pmidMatch) {
        return this.fallbackExtraction(url, 'PubMed');
      }

      const pmid = pmidMatch[1];
      
      // Use PubMed API (NCBI eUtils)
      const apiUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      const paper = data.result[pmid];
      if (!paper) {
        throw new Error('Paper not found');
      }

      const title = paper.title || 'Unknown Title';
      const authors = paper.authors?.map((author: any) => author.name) || [];
      const abstract = paper.abstract || '';
      const journal = paper.source || '';
      const pubdate = paper.pubdate || '';

      return {
        title,
        authors,
        abstract,
        source: 'PubMed',
        url,
        datePublished: pubdate,
        tags: ['pubmed', 'medical', journal.toLowerCase().replace(/\s+/g, '-')].filter(Boolean),
        category: 'Medical Science',
        doi: paper.articleids?.find((id: any) => id.idtype === 'doi')?.value,
        citation: this.generateCitation(title, authors, journal, pubdate)
      };
    } catch (error) {
      console.error('PubMed extraction failed:', error);
      return this.fallbackExtraction(url, 'PubMed');
    }
  }

  /**
   * Extract from DOI URLs
   */
  private async extractFromDOI(url: string): Promise<ExtractedMetadata> {
    try {
      // Extract DOI from URL
      const doiMatch = url.match(/10\.\d+\/[^\s]+/);
      if (!doiMatch) {
        throw new Error('Invalid DOI');
      }

      const doi = doiMatch[0];
      
      // Use CrossRef API for DOI metadata
      const apiUrl = `https://api.crossref.org/works/${doi}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      const work = data.message;
      
      const title = work.title?.[0] || 'Unknown Title';
      const authors = work.author?.map((author: any) => 
        `${author.given || ''} ${author.family || ''}`.trim()
      ) || [];
      const abstract = work.abstract || '';
      const journal = work['container-title']?.[0] || '';
      const published = work.published?.['date-parts']?.[0]?.join('-') || '';

      return {
        title,
        authors,
        abstract,
        source: journal || 'DOI',
        url,
        datePublished: published,
        tags: ['doi', 'published', journal.toLowerCase().replace(/\s+/g, '-')].filter(Boolean),
        category: this.classifyCategory(title + ' ' + journal),
        doi,
        citation: this.generateCitation(title, authors, journal, published)
      };
    } catch (error) {
      console.error('DOI extraction failed:', error);
      return this.fallbackExtraction(url, 'DOI');
    }
  }

  /**
   * Extract from direct PDF URLs
   */
  private async extractFromDirectPDF(url: string): Promise<ExtractedMetadata> {
    const filename = url.split('/').pop()?.replace('.pdf', '') || 'Unknown';
    const title = filename.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    return {
      title,
      authors: ['Unknown'],
      abstract: 'Direct PDF upload. Metadata will be extracted after processing.',
      source: 'Direct PDF',
      url,
      pdfUrl: url,
      tags: ['pdf', 'direct-upload'],
      category: 'General',
      citation: `${title}. Retrieved from ${url}`
    };
  }

  /**
   * Generic URL extraction (fallback)
   */
  private async extractFromGenericUrl(url: string): Promise<ExtractedMetadata> {
    try {
      // Try to fetch the page and extract basic metadata
      const response = await fetch(url);
      const html = await response.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract title from various sources
      const title = doc.querySelector('title')?.textContent?.trim() ||
                   doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
                   doc.querySelector('h1')?.textContent?.trim() ||
                   'Unknown Title';

      // Extract description/abstract
      const abstract = doc.querySelector('meta[name="description"]')?.getAttribute('content') ||
                      doc.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                      '';

      const hostname = new URL(url).hostname;
      
      return {
        title,
        authors: ['Unknown'],
        abstract,
        source: hostname,
        url,
        tags: ['web-extract', hostname.replace(/\./g, '-')],
        category: this.classifyCategory(title + ' ' + abstract),
        citation: `${title}. Retrieved from ${url}`
      };
    } catch (error) {
      return this.fallbackExtraction(url, 'Web');
    }
  }

  /**
   * Fallback extraction when APIs fail
   */
  private fallbackExtraction(url: string, source: string, title?: string): ExtractedMetadata {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    
    const extractedTitle = title || 
      pathParts[pathParts.length - 1]?.replace(/[-_]/g, ' ') ||
      urlObj.hostname.replace('www.', '');

    return {
      title: extractedTitle.charAt(0).toUpperCase() + extractedTitle.slice(1),
      authors: ['Unknown'],
      abstract: `Document extracted from ${source}. Full metadata may not be available.`,
      source,
      url,
      tags: [source.toLowerCase().replace(/\s+/g, '-'), 'extracted'],
      category: this.classifyCategory(extractedTitle),
      citation: `${extractedTitle}. Retrieved from ${url}`
    };
  }

  /**
   * Simple title extraction from URL
   */
  private extractTitleFromUrl(url: string): string {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p);
    
    // Look for meaningful parts in the URL
    for (let i = pathParts.length - 1; i >= 0; i--) {
      const part = pathParts[i];
      if (part.length > 5 && !part.includes('.') && isNaN(Number(part))) {
        return part.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      }
    }
    
    return urlObj.hostname.replace('www.', '');
  }

  /**
   * Classify document category based on content
   */
  private classifyCategory(content: string): string {
    const text = content.toLowerCase();
    
    const categories = {
      'Computer Science': ['computer', 'algorithm', 'machine learning', 'artificial intelligence', 'programming', 'software', 'neural network', 'deep learning'],
      'Physics': ['physics', 'quantum', 'relativity', 'particle', 'mechanics', 'thermodynamics', 'electromagnetic'],
      'Medical Science': ['medical', 'medicine', 'health', 'clinical', 'patient', 'treatment', 'disease', 'therapeutic'],
      'Environmental Science': ['environment', 'climate', 'ecology', 'sustainability', 'carbon', 'ecosystem', 'conservation']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'General';
  }

  /**
   * Generate basic citation
   */
  private generateCitation(title: string, authors: string[], source: string, date: string): string {
    const authorStr = authors.length > 0 ? authors.join(', ') : 'Unknown';
    const year = date ? new Date(date).getFullYear() : 'n.d.';
    return `${authorStr} (${year}). ${title}. ${source}.`;
  }
}

// Export singleton instance
export const documentExtractor = DocumentExtractor.getInstance();
