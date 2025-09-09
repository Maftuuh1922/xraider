import { Card, CardContent } from "./ui/card";
import { 
  Link, 
  BookOpen, 
  Cloud, 
  Target, 
  PenTool, 
  RefreshCw,
  Zap,
  Search,
  Download
} from "lucide-react";

const features = [
  {
    icon: Link,
    title: "Smart Extraction",
    description: "Extract papers from Google Scholar, ResearchGate, arXiv, PubMed, and DOI links with intelligent content parsing",
    gradient: "from-black to-gray-800"
  },
  {
    icon: BookOpen,
    title: "Lightning-Fast Reader",
    description: "Advanced PDF reader with zoom controls, page navigation, bookmarks, and annotation tools for seamless reading",
    gradient: "from-green-500 to-green-600"
  },
  {
    icon: Cloud,
    title: "Google Drive Integration",
    description: "Automatic backup and sync with Google Drive. Access your library anywhere with real-time collaboration features",
    gradient: "from-black to-black"
  },
  {
    icon: Target,
    title: "Auto-Organization",
    description: "Intelligent categorization by subject, keywords, and content analysis. Never lose track of important papers again",
    gradient: "from-orange-500 to-orange-600"
  },
  {
    icon: PenTool,
    title: "Rich Annotations",
    description: "Multi-color highlighting, notes, bookmarks, and citation management. Export annotations for research workflows",
    gradient: "from-pink-500 to-pink-600"
  },
  {
    icon: RefreshCw,
    title: "Real-time Sync",
    description: "Seamless synchronization across devices with offline support and conflict resolution for uninterrupted research",
    gradient: "from-teal-500 to-teal-600"
  }
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-8 bg-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-8">
          <h2 className="text-3xl lg:text-4xl font-bold">
            Powerful Features for
            <span className="text-foreground">
              {" "}Academic Research
            </span>
          </h2>
          <p className="text-lg text-foreground/70 max-w-3xl mx-auto">
            Everything you need to manage your academic documents efficiently. 
            From extraction to organization, we've got your research workflow covered.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card 
                key={index} 
                className="group hover:shadow-lg transition-all duration-300 border-2 border-black hover:border-gray-700 bg-card/50 hover:bg-card"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-background flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <IconComponent className="w-6 h-6 text-foreground" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold group-hover:text-blue-600 transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-foreground/70 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Features Row */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="text-center space-y-3 p-6 rounded-xl bg-secondary border border-border/50">
            <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center mx-auto">
              <Search className="w-5 h-5 text-foreground" />
            </div>
            <h4 className="font-semibold">Full-Text Search</h4>
            <p className="text-sm text-foreground/70">
              Search across all documents with advanced filters and highlighting
            </p>
          </div>
          
          <div className="text-center space-y-3 p-6 rounded-xl bg-secondary border border-border/50">
            <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center mx-auto">
              <Zap className="w-5 h-5 text-foreground" />
            </div>
            <h4 className="font-semibold">Batch Processing</h4>
            <p className="text-sm text-foreground/70">
              Extract multiple papers simultaneously with queue management
            </p>
          </div>
          
          <div className="text-center space-y-3 p-6 rounded-xl bg-secondary border border-border/50">
            <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center mx-auto">
              <Download className="w-5 h-5 text-foreground" />
            </div>
            <h4 className="font-semibold">Export & Citations</h4>
            <p className="text-sm text-foreground/70">
              Export in multiple formats with auto-generated citations
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}