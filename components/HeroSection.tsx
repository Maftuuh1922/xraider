import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Download, Github, Zap, Shield, Users } from "lucide-react";

export function HeroSection() {
  return (
    <section className="min-h-screen flex items-center pt-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
                <span className="text-foreground">
                  XRAIDER
                </span>
              </h1>
              <h2 className="text-2xl lg:text-3xl text-foreground/90">
                The all-in-one academic document extractor & manager
              </h2>
            </div>

            {/* Description */}
            <p className="text-lg text-foreground/70 max-w-2xl leading-relaxed">
              Extract, organize, and manage academic papers from any source. 
              Features lightning-fast PDF reader, smart annotations, Google Drive sync, 
              and intelligent categorization. Perfect for researchers, students, and academics.
            </p>

            {/* CTA Button */}
            <div className="pt-2">
              <Button 
                size="lg" 
                className="bg-black hover:bg-gray-800 text-white px-8 py-4 text-lg font-semibold rounded-lg"
              >
                Get Started
              </Button>
            </div>
          </div>

          {/* Right Image */}
          <div className="space-y-6">
            <div className="relative">
              <div className="absolute inset-0 bg-black/20 rounded-2xl blur-2xl"></div>
              <div className="relative bg-card border border-border rounded-2xl p-6 shadow-2xl">
                <img 
                  src="/new.gif" 
                  alt="Student using XRAIDER academic document extractor" 
                  className="w-full max-w-lg h-auto rounded-lg mx-auto"
                  style={{ maxHeight: '500px', objectFit: 'contain' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}