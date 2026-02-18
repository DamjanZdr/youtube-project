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

// Section configuration
const IDEA_SECTIONS = [
  {
    key: "brainstorm" as const,
    title: "Brainstorming",
    placeholder: "Freely dump all your ideas here... topics, angles, random thoughts, inspiration...",
    description: null,
    example: null,
  },
  {
    key: "hook" as const,
    title: "1. Hook",
    placeholder: "What will grab attention in the first 5-30 seconds?",
    description: "The opening moment that stops viewers from scrolling. Create curiosity, shock, or intrigue.",
    example: "Example: \"I spent $10,000 on YouTube ads so you don't have to...\" or \"This one trick doubled my views overnight.\"",
  },
  {
    key: "value" as const,
    title: "2. Value",
    placeholder: "What's the core benefit viewers will get?",
    description: "The main takeaway or transformation. Why should someone watch until the end?",
    example: "Example: \"By the end, you'll know exactly how to edit videos 3x faster\" or \"Learn the algorithm secret most creators miss.\"",
  },
  {
    key: "flow" as const,
    title: "3. Flow",
    placeholder: "How will the video be structured?",
    description: "The logical progression of your content. How do you keep momentum and avoid drop-off?",
    example: "Example: \"Hook → Problem → 3 Solutions → Proof → Summary\" or \"Story opener → Lesson 1 → Lesson 2 → Lesson 3 → CTA\"",
  },
  {
    key: "cta" as const,
    title: "4. CTA",
    placeholder: "What action do you want viewers to take?",
    description: "The specific call to action. Be clear about what you want them to do next.",
    example: "Example: \"Subscribe and hit the bell\" or \"Download the free template in the description\" or \"Comment your biggest struggle below.\"",
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
  const [expandedSections, setExpandedSections] = useState<Set<SectionKey>>(new Set(["brainstorm"]));
  
  // Speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const editorRefs = useRef<Record<SectionKey, any>>({} as Record<SectionKey, any>);

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  // Initialize speech recognition
  const initSpeechRecognition = useCallback((sectionKey: SectionKey) => {
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

      const editor = editorRefs.current[sectionKey];
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
      setActiveSection(null);
    };

    recognition.onend = () => {
      if (isListening && recognitionRef.current && activeSection === sectionKey) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          // Already started, ignore
        }
      } else {
        setIsListening(false);
        setActiveSection(null);
      }
    };

    return recognition;
  }, [isListening, activeSection]);

  const toggleListening = useCallback((sectionKey: SectionKey) => {
    if (!speechSupported) {
      toast.error("Speech recognition is not supported in your browser. Try Chrome or Edge.");
      return;
    }

    if (isListening && activeSection === sectionKey) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      setIsListening(false);
      setActiveSection(null);
      
      const editor = editorRefs.current[sectionKey];
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
      }
    } else {
      // Stop any existing recognition
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      
      // Start listening for this section
      const recognition = initSpeechRecognition(sectionKey);
      if (recognition) {
        recognitionRef.current = recognition;
        try {
          recognition.start();
          setIsListening(true);
          setActiveSection(sectionKey);
          // Expand the section if collapsed
          setExpandedSections(prev => new Set([...prev, sectionKey]));
        } catch (e) {
          toast.error("Failed to start voice input");
        }
      }
    }
  }, [isListening, activeSection, speechSupported, initSpeechRecognition]);

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
      
      // Expand sections that have content
      const expanded = new Set<SectionKey>(["brainstorm"]);
      if (data.idea_hook) expanded.add("hook");
      if (data.idea_value) expanded.add("value");
      if (data.idea_flow) expanded.add("flow");
      if (data.idea_cta) expanded.add("cta");
      setExpandedSections(expanded);
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
        <div className="max-w-4xl mx-auto space-y-4">
          {IDEA_SECTIONS.map((section) => {
            const isExpanded = expandedSections.has(section.key);
            const hasContent = content[section.key]?.trim().length > 0;
            const isRecording = isListening && activeSection === section.key;
            
            return (
              <div 
                key={section.key}
                className={`border rounded-lg transition-all ${
                  isExpanded 
                    ? "border-border/50 bg-card/30" 
                    : "border-border/30 hover:border-border/50"
                }`}
              >
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.key)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{section.title}</span>
                    {hasContent && !isExpanded && (
                      <span className="text-xs text-green-500">●</span>
                    )}
                  </div>
                  {speechSupported && isExpanded && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleListening(section.key);
                      }}
                      className={`p-2 rounded-lg transition-all ${
                        isRecording
                          ? "bg-red-500/20 text-red-400"
                          : "hover:bg-white/10 text-muted-foreground hover:text-foreground"
                      }`}
                      title={isRecording ? "Stop recording" : "Start voice input"}
                    >
                      {isRecording ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </button>
                
                {/* Section Content */}
                {isExpanded && (
                  <div className="px-4 pb-4">
                    {/* Description and Example */}
                    {section.description && (
                      <div className="mb-3 text-sm">
                        <p className="text-muted-foreground">{section.description}</p>
                        {section.example && (
                          <p className="text-muted-foreground/70 italic mt-1">{section.example}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Editor */}
                    <RichTextEditor
                      content={content[section.key]}
                      onChange={(value) => updateSection(section.key, value)}
                      onEditorReady={(editor) => { editorRefs.current[section.key] = editor; }}
                      placeholder={section.placeholder}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
