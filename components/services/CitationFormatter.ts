export type CitationStyle = 'APA' | 'IEEE' | 'Chicago' | 'Harvard';

export interface Citation {
  id: string;
  type: 'book' | 'journal' | 'conference' | 'website' | 'thesis';
  title: string;
  authors: string[];
  year: number;
  publisher?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  url?: string;
  doi?: string;
  accessDate?: string;
}

export interface Reference {
  citation: Citation;
  inTextFormat: string;
  fullReference: string;
}

export class CitationFormatter {
  private style: CitationStyle;

  constructor(style: CitationStyle = 'APA') {
    this.style = style;
  }

  setStyle(style: CitationStyle) {
    this.style = style;
  }

  formatInText(citation: Citation, pageNumber?: string): string {
    switch (this.style) {
      case 'APA':
        return this.formatAPAInText(citation, pageNumber);
      case 'IEEE':
        return this.formatIEEEInText(citation);
      case 'Chicago':
        return this.formatChicagoInText(citation, pageNumber);
      case 'Harvard':
        return this.formatHarvardInText(citation, pageNumber);
      default:
        return this.formatAPAInText(citation, pageNumber);
    }
  }

  formatFullReference(citation: Citation): string {
    switch (this.style) {
      case 'APA':
        return this.formatAPAReference(citation);
      case 'IEEE':
        return this.formatIEEEReference(citation);
      case 'Chicago':
        return this.formatChicagoReference(citation);
      case 'Harvard':
        return this.formatHarvardReference(citation);
      default:
        return this.formatAPAReference(citation);
    }
  }

  // APA Style Formatting
  private formatAPAInText(citation: Citation, pageNumber?: string): string {
    const authorText = citation.authors.length > 0 
      ? citation.authors.length === 1
        ? citation.authors[0].split(' ').pop() // Last name only
        : citation.authors.length === 2
          ? `${citation.authors[0].split(' ').pop()} & ${citation.authors[1].split(' ').pop()}`
          : `${citation.authors[0].split(' ').pop()} et al.`
      : 'Anonymous';
    
    const pageText = pageNumber ? `, p. ${pageNumber}` : '';
    return `(${authorText}, ${citation.year}${pageText})`;
  }

  private formatAPAReference(citation: Citation): string {
    const authors = this.formatAPAAuthors(citation.authors);
    
    switch (citation.type) {
      case 'book':
        return `${authors} (${citation.year}). ${citation.title}. ${citation.publisher}.`;
      
      case 'journal':
        const volume = citation.volume ? `${citation.volume}` : '';
        const issue = citation.issue ? `(${citation.issue})` : '';
        const pages = citation.pages ? `, ${citation.pages}` : '';
        return `${authors} (${citation.year}). ${citation.title}. ${citation.journal}, ${volume}${issue}${pages}.`;
      
      case 'website':
        const accessDate = citation.accessDate ? ` Retrieved ${citation.accessDate}` : '';
        return `${authors} (${citation.year}). ${citation.title}.${accessDate}, from ${citation.url}`;
      
      default:
        return `${authors} (${citation.year}). ${citation.title}.`;
    }
  }

  private formatAPAAuthors(authors: string[]): string {
    if (authors.length === 0) return 'Anonymous';
    if (authors.length === 1) return this.formatAPAAuthorName(authors[0]);
    if (authors.length === 2) {
      return `${this.formatAPAAuthorName(authors[0])}, & ${this.formatAPAAuthorName(authors[1])}`;
    }
    
    const formattedAuthors = authors.slice(0, -1).map(author => this.formatAPAAuthorName(author));
    return `${formattedAuthors.join(', ')}, & ${this.formatAPAAuthorName(authors[authors.length - 1])}`;
  }

  private formatAPAAuthorName(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length < 2) return name;
    
    const lastName = parts.pop()!;
    const initials = parts.map(part => part.charAt(0).toUpperCase() + '.').join(' ');
    return `${lastName}, ${initials}`;
  }

  // IEEE Style Formatting
  private formatIEEEInText(citation: Citation): string {
    return `[${citation.id}]`;
  }

  private formatIEEEReference(citation: Citation): string {
    const authors = citation.authors.length > 0 
      ? citation.authors.join(', ') 
      : 'Anonymous';
    
    switch (citation.type) {
      case 'book':
        return `${authors}, "${citation.title}," ${citation.publisher}, ${citation.year}.`;
      
      case 'journal':
        const volume = citation.volume ? `, vol. ${citation.volume}` : '';
        const issue = citation.issue ? `, no. ${citation.issue}` : '';
        const pages = citation.pages ? `, pp. ${citation.pages}` : '';
        return `${authors}, "${citation.title}," ${citation.journal}${volume}${issue}${pages}, ${citation.year}.`;
      
      default:
        return `${authors}, "${citation.title}," ${citation.year}.`;
    }
  }

  // Chicago Style Formatting
  private formatChicagoInText(citation: Citation, pageNumber?: string): string {
    const authorText = citation.authors.length > 0 
      ? citation.authors[0].split(' ').pop()
      : 'Anonymous';
    const pageText = pageNumber ? `, ${pageNumber}` : '';
    return `(${authorText} ${citation.year}${pageText})`;
  }

  private formatChicagoReference(citation: Citation): string {
    const authors = citation.authors.length > 0 
      ? citation.authors.join(', ') 
      : 'Anonymous';
    
    switch (citation.type) {
      case 'book':
        return `${authors}. ${citation.title}. ${citation.publisher}, ${citation.year}.`;
      
      case 'journal':
        const volume = citation.volume ? ` ${citation.volume}` : '';
        const issue = citation.issue ? `, no. ${citation.issue}` : '';
        const pages = citation.pages ? ` (${citation.pages})` : '';
        return `${authors}. "${citation.title}." ${citation.journal}${volume}${issue} (${citation.year})${pages}.`;
      
      default:
        return `${authors}. ${citation.title}. ${citation.year}.`;
    }
  }

  // Harvard Style Formatting
  private formatHarvardInText(citation: Citation, pageNumber?: string): string {
    const authorText = citation.authors.length > 0 
      ? citation.authors[0].split(' ').pop()
      : 'Anonymous';
    const pageText = pageNumber ? `:${pageNumber}` : '';
    return `(${authorText} ${citation.year}${pageText})`;
  }

  private formatHarvardReference(citation: Citation): string {
    const authors = citation.authors.length > 0 
      ? citation.authors.join(', ') 
      : 'Anonymous';
    
    switch (citation.type) {
      case 'book':
        return `${authors} ${citation.year}, ${citation.title}, ${citation.publisher}.`;
      
      case 'journal':
        const volume = citation.volume ? `, vol. ${citation.volume}` : '';
        const issue = citation.issue ? `, no. ${citation.issue}` : '';
        const pages = citation.pages ? `, pp. ${citation.pages}` : '';
        return `${authors} ${citation.year}, '${citation.title}', ${citation.journal}${volume}${issue}${pages}.`;
      
      default:
        return `${authors} ${citation.year}, ${citation.title}.`;
    }
  }

  // Utility Methods
  extractCitationsFromText(text: string): Citation[] {
    const citations: Citation[] = [];
    
    // Simple pattern matching for common citation formats
    const patterns = [
      /\(([A-Za-z\s&,]+),?\s*(\d{4})\)/g, // (Author, Year) format
      /\[(\d+)\]/g, // [1] format
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        // Extract citation info - this is a simplified implementation
        const citation: Citation = {
          id: `cite_${citations.length + 1}`,
          type: 'book',
          title: 'Unknown Title',
          authors: match[1] ? [match[1].trim()] : [],
          year: match[2] ? parseInt(match[2]) : new Date().getFullYear(),
        };
        citations.push(citation);
      }
    });

    return citations;
  }

  generateBibliography(citations: Citation[]): string {
    const sortedCitations = [...citations].sort((a, b) => {
      const aAuthor = a.authors[0] || 'Anonymous';
      const bAuthor = b.authors[0] || 'Anonymous';
      return aAuthor.localeCompare(bAuthor);
    });

    return sortedCitations
      .map(citation => this.formatFullReference(citation))
      .join('\n\n');
  }

  formatDocument(text: string, citations: Citation[]): string {
    let formattedText = text;
    
    // Replace in-text citations
    citations.forEach(citation => {
      const inTextCitation = this.formatInText(citation);
      // Simple replacement - in reality, this would be more sophisticated
      formattedText = formattedText.replace(
        new RegExp(`\\(${citation.authors[0]},?\\s*${citation.year}\\)`, 'g'),
        inTextCitation
      );
    });

    return formattedText;
  }
}
