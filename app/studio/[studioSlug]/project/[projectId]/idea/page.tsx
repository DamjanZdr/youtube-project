"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Placeholder from "@tiptap/extension-placeholder";
import { 
  Loader2, Check, Mic, MicOff, Plus, ChevronDown, ChevronRight,
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

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

// Default content for new projects
const DEFAULT_CONTENT = `<h1>Brainstorming</h1>
<p>Freely dump all your ideas here... topics, angles, random thoughts, inspiration...</p>
<h1>1. Hook</h1>
<p>What will grab attention in the first 5-30 seconds?</p>
<h1>2. Value</h1>
<p>What's the core benefit viewers will get? Why should someone watch until the end?</p>
<h1>3. Flow</h1>
<p>How will the video be structured? How do you keep momentum and avoid drop-off?</p>
<h1>4. CTA</h1>
<p>What specific action do you want viewers to take?</p>`;

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

interface HeadingInfo {
  index: number;
  level: number;
  top: number;
  bottom: number;
  text: string;
}

export default function IdeaPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [collapsedHeadings, setCollapsedHeadings] = useState<Set<number>>(new Set());
  const [headings, setHeadings] = useState<HeadingInfo[]>([]);
  const [contentHeight, setContentHeight] = useState(0);
  
  // Speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextStyle,
      Color,
      Placeholder.configure({
        placeholder: "Start writing your video idea...",
      }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[300px]",
      },
    },
    onUpdate: () => {
      updateHeadingPositions();
    },
  });

  // Check for speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SpeechRecognition);
  }, []);

  // Load content
  useEffect(() => {
    loadIdea();
  }, [projectId, editor]);

  // Auto-save with debounce
  useEffect(() => {
    if (loading || !editor) return;
    
    const timer = setTimeout(() => {
      saveIdea();
    }, 1000);

    return () => clearTimeout(timer);
  }, [editor?.getHTML()]);

  // Update heading positions when content changes
  const updateHeadingPositions = useCallback(() => {
    if (!editorContainerRef.current || !editor) return;

    const proseMirror = editorContainerRef.current.querySelector('.ProseMirror');
    if (!proseMirror) return;

    const containerRect = editorContainerRef.current.getBoundingClientRect();
    const headingElements = proseMirror.querySelectorAll('h1, h2, h3');
    
    const newHeadings: HeadingInfo[] = [];
    
    headingElements.forEach((heading, index) => {
      const rect = heading.getBoundingClientRect();
      const level = parseInt(heading.tagName[1]);
      
      // Find end position (next heading of same or higher level, or end of content)
      let bottomPos = proseMirror.getBoundingClientRect().bottom - containerRect.top;
      let sibling = heading.nextElementSibling;
      
      while (sibling) {
        if (/^H[123]$/.test(sibling.tagName)) {
          const sibLevel = parseInt(sibling.tagName[1]);
          if (sibLevel <= level) {
            bottomPos = sibling.getBoundingClientRect().top - containerRect.top;
            break;
          }
        }
        sibling = sibling.nextElementSibling;
      }
      
      newHeadings.push({
        index,
        level,
        top: rect.top - containerRect.top,
        bottom: bottomPos,
        text: heading.textContent || '',
      });
    });
    
    setHeadings(newHeadings);
    setContentHeight(proseMirror.getBoundingClientRect().height);
  }, [editor]);

  // Update positions on scroll and resize
  useEffect(() => {
    const timer = setTimeout(updateHeadingPositions, 100);
    
    const handleScroll = () => updateHeadingPositions();
    const scrollContainer = scrollContainerRef.current;
    scrollContainer?.addEventListener('scroll', handleScroll);
    
    window.addEventListener('resize', updateHeadingPositions);
    
    return () => {
      clearTimeout(timer);
      scrollContainer?.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', updateHeadingPositions);
    };
  }, [updateHeadingPositions, editor?.getHTML()]);

  // Apply collapse styles
  useEffect(() => {
    if (!editorContainerRef.current || !editor) return;

    const proseMirror = editorContainerRef.current.querySelector('.ProseMirror');
    if (!proseMirror) return;

    const headingElements = proseMirror.querySelectorAll('h1, h2, h3');
    
    headingElements.forEach((heading, index) => {
      const level = parseInt(heading.tagName[1]);
      let sibling = heading.nextElementSibling;
      
      while (sibling) {
        if (/^H[123]$/.test(sibling.tagName)) {
          const sibLevel = parseInt(sibling.tagName[1]);
          if (sibLevel <= level) break;
        }
        
        if (collapsedHeadings.has(index)) {
          (sibling as HTMLElement).style.display = 'none';
        } else {
          (sibling as HTMLElement).style.display = '';
        }
        
        sibling = sibling.nextElementSibling;
      }
    });
    
    // Re-calculate positions after collapse change
    setTimeout(updateHeadingPositions, 10);
  }, [collapsedHeadings, editor]);

  const loadIdea = async () => {
    if (!editor) return;
    setLoading(true);
    const { data } = await supabase
      .from("projects")
      .select("idea_markdown")
      .eq("id", projectId)
      .single();

    if (data?.idea_markdown) {
      editor.commands.setContent(data.idea_markdown);
    } else {
      editor.commands.setContent(DEFAULT_CONTENT);
    }
    setLoading(false);
    setTimeout(updateHeadingPositions, 100);
  };

  const saveIdea = async () => {
    if (!editor) return;
    setSaving(true);
    
    await supabase
      .from("projects")
      .update({ idea_markdown: editor.getHTML() })
      .eq("id", projectId);
    
    setLastSaved(new Date());
    setSaving(false);
  };

  const toggleCollapse = (index: number) => {
    setCollapsedHeadings(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const addSectionAfter = (headingIndex: number, level: number) => {
    if (!editor || !editorContainerRef.current) return;
    
    const proseMirror = editorContainerRef.current.querySelector('.ProseMirror');
    if (!proseMirror) return;
    
    const headingElements = proseMirror.querySelectorAll('h1, h2, h3');
    const heading = headingElements[headingIndex];
    if (!heading) return;
    
    // Find the last element of this section
    let lastElement: Element = heading;
    let sibling = heading.nextElementSibling;
    
    while (sibling) {
      if (/^H[123]$/.test(sibling.tagName)) {
        const sibLevel = parseInt(sibling.tagName[1]);
        if (sibLevel <= level) break;
      }
      lastElement = sibling;
      sibling = sibling.nextElementSibling;
    }
    
    // Get position at end of last element
    const view = editor.view;
    const pos = view.posAtDOM(lastElement, lastElement.childNodes.length);
    
    editor.chain()
      .focus()
      .setTextSelection(pos)
      .insertContent(`<h${level}>New Section</h${level}><p></p>`)
      .run();
  };

  const addMainSection = () => {
    if (!editor) return;
    editor.chain()
      .focus('end')
      .insertContent('<h1>New Section</h1><p></p>')
      .run();
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
      let interimTranscript = "";
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

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
  }, [isListening, editor]);

  const toggleListening = useCallback(() => {
    if (!speechSupported) {
      toast.error("Speech recognition not supported. Try Chrome or Edge.");
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
          editor?.commands.focus('end');
        } catch (e) {
          toast.error("Failed to start voice input");
        }
      }
    }
  }, [isListening, speechSupported, initSpeechRecognition, editor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  if (loading || !editor) {
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
            Click chevrons to collapse, + to add sections
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
      <div className="flex items-center gap-1 px-4 md:px-6 py-2 border-b border-border/30 bg-card/20 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-muted' : ''}`}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-muted' : ''}`}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-muted' : ''}`}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-muted' : ''}`}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-muted' : ''}`}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div ref={scrollContainerRef} data-tutorial="idea-editor" className="flex-1 overflow-auto pb-32">
        <div className="max-w-4xl mx-auto py-4 md:py-6 px-4 md:px-6">
          <div ref={editorContainerRef} className="relative">
            {/* Collapse toggles overlay */}
            {headings.map((h, i) => (
              <button
                key={`toggle-${i}`}
                onClick={() => toggleCollapse(h.index)}
                className="absolute -left-6 w-5 h-5 flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-muted/50 rounded transition-all z-10"
                style={{ top: h.top + 2 }}
                title={collapsedHeadings.has(h.index) ? "Expand section" : "Collapse section"}
              >
                {collapsedHeadings.has(h.index) ? (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            ))}
            
            {/* Add section buttons overlay */}
            {headings.map((h, i) => !collapsedHeadings.has(h.index) && (
              <button
                key={`add-${i}`}
                onClick={() => addSectionAfter(h.index, h.level)}
                className="absolute left-1/2 -translate-x-1/2 w-6 h-6 flex items-center justify-center opacity-0 hover:opacity-100 border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 rounded-full transition-all z-10 group"
                style={{ top: h.bottom - 14 }}
                title="Add section"
              >
                <Plus className="h-3 w-3 text-white/40 group-hover:text-white/80" />
              </button>
            ))}
            
            {/* Editor content */}
            <EditorContent editor={editor} />
            
            {/* Add main section button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={addMainSection}
                className="flex items-center gap-2 px-4 py-2 border border-dashed border-white/20 hover:border-white/40 hover:bg-white/5 rounded-lg text-white/50 hover:text-white/80 transition-all text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Add Section</span>
              </button>
            </div>
          </div>
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
      )}

      <style jsx global>{`
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
          position: relative;
        }
        
        .ProseMirror h1 { font-size: 1.25rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.5rem; }
        .ProseMirror h2 { font-size: 1.125rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; }
        .ProseMirror h3 { font-size: 1rem; font-weight: 500; margin-top: 0.75rem; margin-bottom: 0.25rem; }
        
        .ProseMirror p { margin: 0.25rem 0; }
        .ProseMirror ul { list-style: disc; margin-left: 1rem; }
        .ProseMirror ol { list-style: decimal; margin-left: 1rem; }
        
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
