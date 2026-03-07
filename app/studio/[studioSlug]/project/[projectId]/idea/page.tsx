"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Loader2, Check, Mic, MicOff, Plus, ChevronRight, ChevronDown, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Speech Recognition types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Section type
interface Section {
  id: string;
  title: string;
  content: string;
  collapsed: boolean;
}

// Default sections for new projects
const DEFAULT_SECTIONS: Section[] = [
  { id: '1', title: 'Brainstorming', content: 'Freely dump all your ideas here...', collapsed: false },
  { id: '2', title: 'Hook', content: 'What will grab attention in the first 5-30 seconds?', collapsed: false },
  { id: '3', title: 'Value', content: 'What\'s the core benefit viewers will get?', collapsed: false },
  { id: '4', title: 'Flow', content: 'How will the video be structured?', collapsed: false },
  { id: '5', title: 'CTA', content: 'What action do you want viewers to take?', collapsed: false },
];

// Grammar cleanup for voice-to-text
function cleanupTranscript(text: string): string {
  let result = text.trim();
  if (!result) return result;
  
  result = result
    .replace(/\b(period|full stop)\b/gi, '.')
    .replace(/\bcomma\b/gi, ',')
    .replace(/\b(question mark)\b/gi, '?')
    .replace(/\b(exclamation point|exclamation mark)\b/gi, '!')
    .replace(/\bcolon\b/gi, ':')
    .replace(/\bsemicolon\b/gi, ';')
    .replace(/\b(new line|newline|next line)\b/gi, '\n')
    .replace(/\b(new paragraph)\b/gi, '\n\n');
  
  result = result
    .replace(/\s+([.,!?;:])/g, '$1')
    .replace(/([.,!?;:])(?=[A-Za-z])/g, '$1 ')
    .replace(/\s+/g, ' ');
  
  result = result.charAt(0).toUpperCase() + result.slice(1);
  result = result.replace(/([.!?]\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  result = result.replace(/\bi\b/g, 'I');
  result = result.replace(/\byoutube\b/gi, 'YouTube');
  
  return result;
}

// Parse legacy HTML content into sections
function parseLegacyContent(html: string): Section[] {
  // Try to parse as JSON first (new format)
  try {
    const parsed = JSON.parse(html);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id) {
      return parsed;
    }
  } catch {}
  
  // Parse HTML into sections (legacy format)
  const sections: Section[] = [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const elements = doc.body.children;
  
  let currentSection: Section | null = null;
  let sectionId = 1;
  
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.tagName === 'H1') {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        id: String(sectionId++),
        title: el.textContent || 'Untitled',
        content: '',
        collapsed: false
      };
    } else if (currentSection) {
      currentSection.content += (currentSection.content ? '\n' : '') + el.textContent;
    }
  }
  
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections.length > 0 ? sections : DEFAULT_SECTIONS;
}

export default function IdeaPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  
  // Speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  // Load content
  useEffect(() => {
    loadIdea();
  }, [projectId]);

  // Auto-save with debounce
  useEffect(() => {
    if (loading) return;
    
    const timer = setTimeout(() => {
      saveIdea();
    }, 1000);

    return () => clearTimeout(timer);
  }, [sections]);

  const loadIdea = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("projects")
      .select("idea_markdown")
      .eq("id", projectId)
      .single();

    if (data?.idea_markdown) {
      setSections(parseLegacyContent(data.idea_markdown));
    } else {
      setSections(DEFAULT_SECTIONS);
    }
    setLoading(false);
  };

  const saveIdea = async () => {
    setSaving(true);
    
    await supabase
      .from("projects")
      .update({ idea_markdown: JSON.stringify(sections) })
      .eq("id", projectId);
    
    setLastSaved(new Date());
    setSaving(false);
  };

  const addSection = () => {
    const newId = String(Date.now());
    setSections(prev => [...prev, {
      id: newId,
      title: 'New Section',
      content: '',
      collapsed: false
    }]);
    // Focus the new section's title after render
    setTimeout(() => {
      const input = document.querySelector(`[data-section-title="${newId}"]`) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 50);
  };

  const updateSection = (id: string, updates: Partial<Section>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const deleteSection = (id: string) => {
    if (sections.length <= 1) {
      toast.error("You need at least one section");
      return;
    }
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const toggleCollapse = (id: string) => {
    setSections(prev => prev.map(s => 
      s.id === id ? { ...s, collapsed: !s.collapsed } : s
    ));
  };

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      if (finalTranscript && activeSectionId) {
        const cleanedText = cleanupTranscript(finalTranscript);
        setSections(prev => prev.map(s => 
          s.id === activeSectionId 
            ? { ...s, content: s.content + (s.content ? ' ' : '') + cleanedText }
            : s
        ));
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied.");
      } else if (event.error !== "aborted") {
        toast.error("Speech recognition error.");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {}
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [isListening, activeSectionId]);

  const toggleListening = useCallback(() => {
    if (!speechSupported) {
      toast.error("Speech recognition not supported. Try Chrome or Edge.");
      return;
    }

    if (!activeSectionId) {
      toast.error("Click on a section first to dictate into it");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      setIsListening(false);
    } else {
      const recognition = initSpeechRecognition();
      if (recognition) {
        recognitionRef.current = recognition;
        try {
          recognition.start();
          setIsListening(true);
        } catch (e) {
          toast.error("Failed to start voice input");
        }
      }
    }
  }, [isListening, speechSupported, initSpeechRecognition, activeSectionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Auto-resize textareas
  const autoResize = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(80, textarea.scrollHeight) + 'px';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 md:px-6 py-3 border-b border-border/50 bg-card/30">
        <div>
          <h2 className="text-base md:text-lg font-semibold">Idea</h2>
          <p className="text-xs md:text-sm text-muted-foreground">
            Organize your thoughts in collapsible sections
          </p>
        </div>
        {/* Save Status */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span>Saved</span>
            </>
          ) : null}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 md:px-6 py-2 border-b border-border/30 bg-card/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={addSection}
          className="h-8 px-3 gap-1.5 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Section</span>
        </Button>
      </div>

      {/* Sections */}
      <div data-tutorial="idea-editor" className="flex-1 overflow-auto pb-32">
        <div className="max-w-4xl mx-auto py-4 md:py-6 px-4 md:px-6 space-y-3">
          {sections.map((section) => (
            <div 
              key={section.id}
              className={`
                rounded-lg border transition-all duration-200
                ${activeSectionId === section.id 
                  ? 'border-primary/50 bg-card/50 shadow-lg shadow-primary/5' 
                  : 'border-border/50 bg-card/30 hover:border-border'
                }
              `}
            >
              {/* Section Header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
                <button
                  onClick={() => toggleCollapse(section.id)}
                  className="p-1 hover:bg-muted rounded transition-colors"
                >
                  {section.collapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                
                <Input
                  data-section-title={section.id}
                  value={section.title}
                  onChange={(e) => updateSection(section.id, { title: e.target.value })}
                  className="flex-1 h-7 px-2 text-sm font-medium bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Section title..."
                />
                
                <button
                  onClick={() => deleteSection(section.id)}
                  className="p-1 hover:bg-destructive/20 hover:text-destructive rounded transition-colors opacity-50 hover:opacity-100"
                  title="Delete section"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              
              {/* Section Content */}
              {!section.collapsed && (
                <div className="p-3">
                  <textarea
                    ref={(el) => {
                      if (el) {
                        textareaRefs.current.set(section.id, el);
                        autoResize(el);
                      }
                    }}
                    value={section.content}
                    onChange={(e) => {
                      updateSection(section.id, { content: e.target.value });
                      autoResize(e.target);
                    }}
                    onFocus={() => setActiveSectionId(section.id)}
                    className="w-full min-h-[80px] bg-transparent border-0 resize-none text-sm text-foreground/90 placeholder:text-muted-foreground/50 focus:outline-none"
                    placeholder="Write your ideas here..."
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Floating Voice Input Button */}
      {speechSupported && (
        <div className="fixed bottom-20 md:bottom-8 left-0 right-0 z-50 px-4 md:px-6">
          <div className="max-w-4xl mx-auto flex justify-center">
            <button
            data-tutorial="voice-button"
            onClick={toggleListening}
            className={`
              group relative overflow-hidden
              px-6 py-3 rounded-full
              backdrop-blur-xl border
              transition-all duration-500 ease-out
              ${isListening 
                ? "bg-red-500/20 border-red-400/50 shadow-[0_0_40px_rgba(239,68,68,0.4)]" 
                : "bg-white/10 border-white/20 hover:bg-white/15 hover:border-white/30 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]"
              }
            `}
            style={{
              boxShadow: isListening 
                ? "0 8px 32px rgba(239, 68, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 60px rgba(239, 68, 68, 0.2)"
                : "0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
            }}
          >
            <div 
              className={`
                absolute inset-0 opacity-0 transition-opacity duration-500
                ${isListening ? "opacity-100" : "group-hover:opacity-50"}
              `}
              style={{
                background: isListening
                  ? "radial-gradient(circle at 50% 50%, rgba(239, 68, 68, 0.3) 0%, transparent 70%)"
                  : "radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 70%)"
              }}
            />
            
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full border border-red-400/30 animate-ping" />
                <span className="absolute inset-[-4px] rounded-full border border-red-400/20 animate-ping [animation-delay:150ms]" />
                <span className="absolute inset-[-8px] rounded-full border border-red-400/10 animate-ping [animation-delay:300ms]" />
              </>
            )}
            
            <div className="relative flex items-center gap-3">
              <div className={`
                relative transition-transform duration-300
                ${isListening ? "scale-110" : "group-hover:scale-110"}
              `}>
                {isListening ? (
                  <MicOff className="h-5 w-5 text-red-400" />
                ) : (
                  <Mic className="h-5 w-5 text-white/80 group-hover:text-white" />
                )}
              </div>
              
              <span className={`
                font-medium transition-colors duration-300
                ${isListening ? "text-red-300" : "text-white/80 group-hover:text-white"}
              `}>
                {isListening ? "Recording" : "Voice"}
              </span>
              
              {isListening && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
            </div>

            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{
                background: "linear-gradient(105deg, transparent 40%, rgba(255, 255, 255, 0.1) 45%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.1) 55%, transparent 60%)",
                backgroundSize: "200% 100%",
                animation: "shine 1.5s ease-in-out infinite"
              }}
            />
          </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
