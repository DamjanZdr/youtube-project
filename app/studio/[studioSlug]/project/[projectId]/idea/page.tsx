"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { 
  Loader2, Check, Mic, MicOff, ChevronDown, ChevronRight, 
  Plus, Trash2, GripVertical 
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

// Section type - each section has a level (1, 2, or 3), title, and content
interface Section {
  id: string;
  level: 1 | 2 | 3;
  title: string;
  content: string;
}

// Default sections for new projects
const DEFAULT_SECTIONS: Section[] = [
  {
    id: "brainstorm",
    level: 1,
    title: "Brainstorming",
    content: "",
  },
  {
    id: "hook",
    level: 1,
    title: "1. Hook",
    content: "",
  },
  {
    id: "value",
    level: 1,
    title: "2. Value",
    content: "",
  },
  {
    id: "flow",
    level: 1,
    title: "3. Flow",
    content: "",
  },
  {
    id: "cta",
    level: 1,
    title: "4. CTA",
    content: "",
  },
];

// Placeholder hints for default sections
const SECTION_PLACEHOLDERS: Record<string, string> = {
  "Brainstorming": "Freely dump all your ideas here... topics, angles, random thoughts, inspiration...",
  "1. Hook": "What will grab attention in the first 5-30 seconds?",
  "2. Value": "What's the core benefit viewers will get? Why should someone watch until the end?",
  "3. Flow": "How will the video be structured? How do you keep momentum and avoid drop-off?",
  "4. CTA": "What specific action do you want viewers to take?",
};

// Parse markdown into sections
function parseMarkdownToSections(markdown: string): Section[] {
  if (!markdown || !markdown.trim()) {
    return DEFAULT_SECTIONS.map(s => ({ ...s, id: crypto.randomUUID() }));
  }

  const sections: Section[] = [];
  const lines = markdown.split('\n');
  let currentSection: Section | null = null;
  let contentLines: string[] = [];

  for (const line of lines) {
    const h1Match = line.match(/^# (.+)$/);
    const h2Match = line.match(/^## (.+)$/);
    const h3Match = line.match(/^### (.+)$/);

    if (h1Match || h2Match || h3Match) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        sections.push(currentSection);
      }

      // Start new section
      const level = h3Match ? 3 : h2Match ? 2 : 1;
      const title = (h3Match?.[1] || h2Match?.[1] || h1Match?.[1]) ?? '';
      currentSection = {
        id: crypto.randomUUID(),
        level: level as 1 | 2 | 3,
        title,
        content: "",
      };
      contentLines = [];
    } else {
      contentLines.push(line);
    }
  }

  // Don't forget the last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    sections.push(currentSection);
  }

  // If no sections found, create default
  if (sections.length === 0) {
    return DEFAULT_SECTIONS.map(s => ({ ...s, id: crypto.randomUUID() }));
  }

  return sections;
}

// Convert sections back to markdown
function sectionsToMarkdown(sections: Section[]): string {
  return sections.map(section => {
    const prefix = '#'.repeat(section.level);
    const content = section.content.trim();
    return `${prefix} ${section.title}\n${content}`;
  }).join('\n\n');
}

// Grammar cleanup for voice-to-text transcription
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

export default function IdeaPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const supabase = createClient();

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [focusedSectionId, setFocusedSectionId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  
  // Speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const editorRefs = useRef<Record<string, any>>({});

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

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
      let interimTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (!focusedSectionId) return;
      const editor = editorRefs.current[focusedSectionId];
      if (editor) {
        const { state } = editor;
        let interimPos: { from: number; to: number } | null = null;
        
        state.doc.descendants((node: any, pos: number) => {
          if (node.marks?.some((m: any) => m.type.name === 'textStyle' && m.attrs?.color === '#888888')) {
            interimPos = { from: pos, to: pos + node.nodeSize };
            return false;
          }
        });
        
        if (interimPos) {
          editor.chain().focus().deleteRange(interimPos).run();
        }
        
        if (finalTranscript) {
          const cleanedText = cleanupTranscript(finalTranscript);
          editor.commands.insertContent(cleanedText + " ");
        }
        
        if (interimTranscript) {
          editor.commands.insertContent({
            type: 'text',
            text: interimTranscript,
            marks: [
              { type: 'textStyle', attrs: { color: '#888888' } },
              { type: 'italic' }
            ]
          });
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        toast.error("Microphone access denied. Please allow microphone access in your browser settings.");
      } else if (event.error !== "aborted") {
        toast.error("Speech recognition error. Please try again.");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening && recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already started, ignore
        }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [isListening, focusedSectionId]);

  const toggleListening = useCallback(() => {
    if (!speechSupported) {
      toast.error("Speech recognition is not supported in your browser. Try Chrome or Edge.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      setIsListening(false);
      
      if (focusedSectionId) {
        const editor = editorRefs.current[focusedSectionId];
        if (editor) {
          const { state } = editor;
          let interimPos: { from: number; to: number } | null = null;
          let interimText = "";
          
          state.doc.descendants((node: any, pos: number) => {
            if (node.marks?.some((m: any) => m.type.name === 'textStyle' && m.attrs?.color === '#888888')) {
              interimPos = { from: pos, to: pos + node.nodeSize };
              interimText = node.text || "";
              return false;
            }
          });
          
          if (interimPos && interimText) {
            editor.chain()
              .focus()
              .deleteRange(interimPos)
              .insertContent(interimText + " ")
              .run();
          }
          
          editor.commands.insertContent('<p></p>');
        }
      }
    } else {
      if (focusedSectionId) {
        setExpandedSections(prev => new Set([...prev, focusedSectionId]));
      }
      
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
  }, [isListening, speechSupported, initSpeechRecognition, focusedSectionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    loadIdea();
  }, [projectId]);

  // Auto-save with debounce
  useEffect(() => {
    if (loading || sections.length === 0) return;
    
    const timer = setTimeout(() => {
      saveIdea();
    }, 1000);

    return () => clearTimeout(timer);
  }, [sections]);

  const loadIdea = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("projects")
      .select("idea_markdown, idea_brainstorm, idea_hook, idea_value, idea_flow, idea_cta")
      .eq("id", projectId)
      .single();

    if (data) {
      // If we have markdown, use it; otherwise try to build from old columns
      if (data.idea_markdown) {
        const parsed = parseMarkdownToSections(data.idea_markdown);
        setSections(parsed);
        setExpandedSections(new Set(parsed.map(s => s.id)));
      } else if (data.idea_brainstorm || data.idea_hook || data.idea_value || data.idea_flow || data.idea_cta) {
        // Migrate from old format
        const migrated: Section[] = [];
        if (data.idea_brainstorm) migrated.push({ id: crypto.randomUUID(), level: 1, title: "Brainstorming", content: data.idea_brainstorm });
        if (data.idea_hook) migrated.push({ id: crypto.randomUUID(), level: 1, title: "1. Hook", content: data.idea_hook });
        if (data.idea_value) migrated.push({ id: crypto.randomUUID(), level: 1, title: "2. Value", content: data.idea_value });
        if (data.idea_flow) migrated.push({ id: crypto.randomUUID(), level: 1, title: "3. Flow", content: data.idea_flow });
        if (data.idea_cta) migrated.push({ id: crypto.randomUUID(), level: 1, title: "4. CTA", content: data.idea_cta });
        
        if (migrated.length > 0) {
          setSections(migrated);
          setExpandedSections(new Set(migrated.map(s => s.id)));
        } else {
          const defaults = DEFAULT_SECTIONS.map(s => ({ ...s, id: crypto.randomUUID() }));
          setSections(defaults);
          setExpandedSections(new Set(defaults.map(s => s.id)));
        }
      } else {
        // No content - use defaults
        const defaults = DEFAULT_SECTIONS.map(s => ({ ...s, id: crypto.randomUUID() }));
        setSections(defaults);
        setExpandedSections(new Set(defaults.map(s => s.id)));
      }
    } else {
      const defaults = DEFAULT_SECTIONS.map(s => ({ ...s, id: crypto.randomUUID() }));
      setSections(defaults);
      setExpandedSections(new Set(defaults.map(s => s.id)));
    }
    setLoading(false);
  };

  const saveIdea = async () => {
    setSaving(true);
    const markdown = sectionsToMarkdown(sections);
    await supabase
      .from("projects")
      .update({ idea_markdown: markdown })
      .eq("id", projectId);
    
    setLastSaved(new Date());
    setSaving(false);
  };

  const updateSectionContent = (id: string, content: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, content } : s));
  };

  const updateSectionTitle = (id: string, title: string) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  };

  const updateSectionLevel = (id: string, level: 1 | 2 | 3) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, level } : s));
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const addSection = (afterId?: string) => {
    const newSection: Section = {
      id: crypto.randomUUID(),
      level: 1,
      title: "New Section",
      content: "",
    };
    
    setSections(prev => {
      if (afterId) {
        const index = prev.findIndex(s => s.id === afterId);
        return [...prev.slice(0, index + 1), newSection, ...prev.slice(index + 1)];
      }
      return [...prev, newSection];
    });
    
    setExpandedSections(prev => new Set([...prev, newSection.id]));
    setEditingTitleId(newSection.id);
  };

  const deleteSection = (id: string) => {
    if (sections.length <= 1) {
      toast.error("You must have at least one section");
      return;
    }
    setSections(prev => prev.filter(s => s.id !== id));
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    setSections(prev => {
      const index = prev.findIndex(s => s.id === id);
      if (direction === 'up' && index > 0) {
        const newSections = [...prev];
        [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
        return newSections;
      }
      if (direction === 'down' && index < prev.length - 1) {
        const newSections = [...prev];
        [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
        return newSections;
      }
      return prev;
    });
  };

  const getPlaceholder = (title: string) => {
    return SECTION_PLACEHOLDERS[title] || "Write your content here...";
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
            Structure your video concept with freeform sections
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => addSection()}
            className="h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Section
          </Button>
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
      </div>

      {/* Sections */}
      <div data-tutorial="idea-editor" className="flex-1 overflow-auto p-4 md:p-6 pb-32">
        <div className="max-w-4xl mx-auto space-y-1">
          {sections.map((section, index) => {
            const isExpanded = expandedSections.has(section.id);
            const isFocused = focusedSectionId === section.id;
            const isEditingTitle = editingTitleId === section.id;
            const indentClass = section.level === 2 ? "ml-4" : section.level === 3 ? "ml-8" : "";
            
            return (
              <div 
                key={section.id}
                className={`border-b border-border/30 last:border-b-0 ${indentClass}`}
              >
                {/* Section Header */}
                <div className="flex items-center gap-1 py-2 group">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="p-1 hover:bg-muted/50 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                  
                  {/* Level indicator */}
                  <button
                    onClick={() => updateSectionLevel(section.id, section.level === 3 ? 1 : (section.level + 1) as 1 | 2 | 3)}
                    className="px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground hover:text-foreground bg-muted/50 rounded transition-colors"
                    title="Click to change heading level"
                  >
                    H{section.level}
                  </button>
                  
                  {/* Title */}
                  {isEditingTitle ? (
                    <Input
                      autoFocus
                      value={section.title}
                      onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                      onBlur={() => setEditingTitleId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setEditingTitleId(null);
                        if (e.key === 'Escape') setEditingTitleId(null);
                      }}
                      className="h-7 flex-1 text-sm font-medium bg-transparent border-none focus-visible:ring-1"
                    />
                  ) : (
                    <button
                      onClick={() => setEditingTitleId(section.id)}
                      className={`flex-1 text-left font-medium text-sm hover:text-foreground transition-colors ${
                        section.level === 1 ? "text-foreground" : 
                        section.level === 2 ? "text-foreground/90" : 
                        "text-foreground/80"
                      }`}
                    >
                      {section.title || "Untitled Section"}
                    </button>
                  )}
                  
                  {/* Actions - visible on hover */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => addSection(section.id)}
                      className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
                      title="Add section below"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveSection(section.id, 'up')}
                      disabled={index === 0}
                      className="p-1.5 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground disabled:opacity-30"
                      title="Move up"
                    >
                      <GripVertical className="h-3.5 w-3.5 rotate-180" />
                    </button>
                    <button
                      onClick={() => deleteSection(section.id)}
                      className="p-1.5 hover:bg-destructive/10 rounded transition-colors text-muted-foreground hover:text-destructive"
                      title="Delete section"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                
                {/* Section Content */}
                {isExpanded && (
                  <div 
                    className={`pb-4 transition-all cursor-text ${isFocused && isListening ? "ring-1 ring-red-400/50 rounded-lg" : ""}`}
                    onFocus={() => setFocusedSectionId(section.id)}
                    onClick={(e) => {
                      const editor = editorRefs.current[section.id];
                      if (!editor) return;
                      
                      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
                      if (pos) {
                        editor.commands.focus();
                        editor.commands.setTextSelection(pos.pos);
                      } else {
                        const editorEl = e.currentTarget.querySelector('.ProseMirror');
                        if (editorEl) {
                          const rect = editorEl.getBoundingClientRect();
                          const clickY = e.clientY - rect.top;
                          
                          if (clickY < 0) {
                            editor.commands.focus('start');
                            return;
                          }
                          
                          const lineHeight = 28;
                          const targetLine = Math.floor(clickY / lineHeight);
                          const currentHtml = editor.getHTML();
                          const currentParagraphs = (currentHtml.match(/<p>/g) || []).length;
                          const paragraphsNeeded = Math.max(0, targetLine - currentParagraphs + 1);
                          
                          if (paragraphsNeeded > 0) {
                            const newHtml = currentHtml + '<p></p>'.repeat(paragraphsNeeded);
                            editor.commands.setContent(newHtml);
                          }
                          
                          setTimeout(() => {
                            const newPos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
                            if (newPos) {
                              editor.commands.focus();
                              editor.commands.setTextSelection(newPos.pos);
                            } else {
                              editor.commands.focus('end');
                            }
                          }, 0);
                        } else {
                          editor.commands.focus('end');
                        }
                      }
                    }}
                  >
                    <RichTextEditor
                      content={section.content}
                      onChange={(value) => updateSectionContent(section.id, value)}
                      onEditorReady={(editor) => { 
                        editorRefs.current[section.id] = editor;
                      }}
                      placeholder={getPlaceholder(section.title)}
                      minHeight="100px"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Voice Input Button */}
      {speechSupported && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50">
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
            {/* Animated background gradient */}
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
            
            {/* Ripple rings when listening */}
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full border border-red-400/30 animate-ping" />
                <span className="absolute inset-[-4px] rounded-full border border-red-400/20 animate-ping [animation-delay:150ms]" />
                <span className="absolute inset-[-8px] rounded-full border border-red-400/10 animate-ping [animation-delay:300ms]" />
              </>
            )}
            
            {/* Content */}
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
              
              {/* Live indicator dot */}
              {isListening && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
              )}
            </div>

            {/* Shine effect on hover */}
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
      )}

      {/* Keyframes for shine animation */}
      <style jsx>{`
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
