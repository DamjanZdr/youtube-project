"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { RichTextEditor } from "@/components/shared/rich-text-editor";
import { Loader2, Check, Mic, MicOff, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";

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

// Section configuration - placeholder acts like input placeholder (disappears when typing)
const IDEA_SECTIONS = [
  {
    key: "brainstorm" as const,
    title: "Brainstorming",
    placeholder: "Freely dump all your ideas here... topics, angles, random thoughts, inspiration...",
  },
  {
    key: "hook" as const,
    title: "1. Hook",
    placeholder: "What will grab attention in the first 5-30 seconds?\nExample: \"I spent $10,000 on YouTube ads so you don't have to...\" or \"This one trick doubled my views overnight.\"",
  },
  {
    key: "value" as const,
    title: "2. Value",
    placeholder: "What's the core benefit viewers will get? Why should someone watch until the end?\nExample: \"By the end, you'll know exactly how to edit videos 3x faster.\"",
  },
  {
    key: "flow" as const,
    title: "3. Flow",
    placeholder: "How will the video be structured? How do you keep momentum and avoid drop-off?\nExample: \"Hook → Problem → 3 Solutions → Proof → Summary\"",
  },
  {
    key: "cta" as const,
    title: "4. CTA",
    placeholder: "What specific action do you want viewers to take?\nExample: \"Subscribe and hit the bell\" or \"Download the free template in the description.\"",
  },
];

type SectionKey = "brainstorm" | "hook" | "value" | "flow" | "cta";

interface SectionContent {
  brainstorm: string;
  hook: string;
  value: string;
  flow: string;
  cta: string;
}

export default function IdeaPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const supabase = createClient();

  const [content, setContent] = useState<SectionContent>({
    brainstorm: "",
    hook: "",
    value: "",
    flow: "",
    cta: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(
    new Set(["brainstorm", "hook", "value", "flow", "cta"])
  );
  const [focusedSection, setFocusedSection] = useState<SectionKey>("brainstorm");
  
  // Speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const editorRefs = useRef<Record<SectionKey, any>>({} as Record<SectionKey, any>);

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

      // Insert into the focused section's editor
      const editor = editorRefs.current[focusedSection];
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
          editor.commands.insertContent(finalTranscript + " ");
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
  }, [isListening, focusedSection]);

  const toggleListening = useCallback(() => {
    if (!speechSupported) {
      toast.error("Speech recognition is not supported in your browser. Try Chrome or Edge.");
      return;
    }

    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      setIsListening(false);
      
      // Clean up interim text in focused section
      const editor = editorRefs.current[focusedSection];
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
    } else {
      // Expand focused section if collapsed
      setExpandedSections(prev => new Set([...prev, focusedSection]));
      
      // Start listening
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
  }, [isListening, speechSupported, initSpeechRecognition, focusedSection]);

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
    if (loading) return;
    
    const timer = setTimeout(() => {
      saveIdea();
    }, 1000);

    return () => clearTimeout(timer);
  }, [content]);

  const loadIdea = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("projects")
      .select("idea_brainstorm, idea_hook, idea_value, idea_flow, idea_cta")
      .eq("id", projectId)
      .single();

    if (data) {
      setContent({
        brainstorm: data.idea_brainstorm || "",
        hook: data.idea_hook || "",
        value: data.idea_value || "",
        flow: data.idea_flow || "",
        cta: data.idea_cta || "",
      });
    }
    setLoading(false);
  };

  const saveIdea = async () => {
    setSaving(true);
    await supabase
      .from("projects")
      .update({ 
        idea_brainstorm: content.brainstorm,
        idea_hook: content.hook,
        idea_value: content.value,
        idea_flow: content.flow,
        idea_cta: content.cta,
      })
      .eq("id", projectId);
    
    setLastSaved(new Date());
    setSaving(false);
  };

  const updateSection = (key: SectionKey, value: string) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const toggleSection = (key: SectionKey) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
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
            Structure your video concept from hook to CTA
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

      {/* Sections */}
      <div data-tutorial="idea-editor" className="flex-1 overflow-auto p-4 md:p-6 pb-32">
        <div className="max-w-4xl mx-auto space-y-2">
          {IDEA_SECTIONS.map((section) => {
            const isExpanded = expandedSections.has(section.key);
            const hasContent = content[section.key]?.trim().length > 0;
            const isFocused = focusedSection === section.key;
            
            return (
              <div 
                key={section.key}
                className="border-b border-border/30 last:border-b-0"
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center gap-2 py-3 text-left hover:text-foreground transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className="font-medium text-sm">{section.title}</span>
                  {hasContent && !isExpanded && (
                    <span className="text-xs text-green-500">●</span>
                  )}
                </button>
                
                {/* Section Content */}
                {isExpanded && (
                  <div 
                    className={`pb-4 transition-all cursor-text ${isFocused && isListening ? "ring-1 ring-red-400/50 rounded-lg" : ""}`}
                    onFocus={() => setFocusedSection(section.key)}
                    onClick={(e) => {
                      const editor = editorRefs.current[section.key];
                      if (!editor) return;
                      
                      // Use TipTap's posAtCoords to get document position from click
                      const pos = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
                      if (pos) {
                        editor.commands.focus();
                        editor.commands.setTextSelection(pos.pos);
                      } else {
                        // Clicked outside content area
                        const editorEl = e.currentTarget.querySelector('.ProseMirror');
                        if (editorEl) {
                          const rect = editorEl.getBoundingClientRect();
                          const clickY = e.clientY - rect.top;
                          
                          // If clicked ABOVE the editor area, just focus at start
                          if (clickY < 0) {
                            editor.commands.focus('start');
                            return;
                          }
                          
                          // Clicked below content - calculate target line
                          const lineHeight = 28;
                          const targetLine = Math.floor(clickY / lineHeight);
                          
                          // Get current HTML and add paragraphs atomically
                          const currentHtml = editor.getHTML();
                          const currentParagraphs = (currentHtml.match(/<p>/g) || []).length;
                          const paragraphsNeeded = Math.max(0, targetLine - currentParagraphs + 1);
                          
                          if (paragraphsNeeded > 0) {
                            const newHtml = currentHtml + '<p></p>'.repeat(paragraphsNeeded);
                            editor.commands.setContent(newHtml);
                          }
                          
                          // Now position cursor at the clicked location
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
                      content={content[section.key]}
                      onChange={(value) => updateSection(section.key, value)}
                      onEditorReady={(editor) => { 
                        editorRefs.current[section.key] = editor;
                      }}
                      placeholder={section.placeholder}
                      minHeight="140px"
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
                {isListening ? `Recording → ${IDEA_SECTIONS.find(s => s.key === focusedSection)?.title}` : "Voice"}
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
