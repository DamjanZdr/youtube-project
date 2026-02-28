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
  Loader2, Check, Mic, MicOff, Plus,
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

export default function IdeaPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [collapsedHeadings, setCollapsedHeadings] = useState<Set<number>>(new Set());
  const [updateTrigger, setUpdateTrigger] = useState(0);
  
  // Speech-to-text state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

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
      setUpdateTrigger(prev => prev + 1);
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

  // Inject collapse toggles and + buttons
  useEffect(() => {
    if (!editorContainerRef.current || !editor) return;

    const injectControls = () => {
      const proseMirror = editorContainerRef.current?.querySelector('.ProseMirror');
      if (!proseMirror) return;

      // Remove existing injected elements
      proseMirror.querySelectorAll('.collapse-toggle, .add-section-btn').forEach(el => el.remove());

      const headings = proseMirror.querySelectorAll('h1, h2, h3');
      
      headings.forEach((heading, index) => {
        // Add collapse toggle
        const toggle = document.createElement('span');
        toggle.className = 'collapse-toggle';
        toggle.setAttribute('contenteditable', 'false');
        toggle.innerHTML = collapsedHeadings.has(index) 
          ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>'
          : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>';
        
        toggle.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleCollapse(index);
        };
        
        heading.insertBefore(toggle, heading.firstChild);
        
        // Find content elements and apply collapse
        const headingLevel = parseInt(heading.tagName[1]);
        let sibling = heading.nextElementSibling;
        let lastContentElement: Element | null = null;
        
        while (sibling) {
          const isHeading = /^H[123]$/.test(sibling.tagName);
          if (isHeading) {
            const siblingLevel = parseInt(sibling.tagName[1]);
            if (siblingLevel <= headingLevel) break;
          }
          
          if (collapsedHeadings.has(index)) {
            sibling.classList.add('collapsed-content');
          } else {
            sibling.classList.remove('collapsed-content');
          }
          
          if (!sibling.classList.contains('add-section-btn')) {
            lastContentElement = sibling;
          }
          
          sibling = sibling.nextElementSibling;
        }
        
        // Add + button after this section's content (only if not collapsed)
        if (!collapsedHeadings.has(index)) {
          const addBtn = document.createElement('div');
          addBtn.className = 'add-section-btn';
          addBtn.setAttribute('contenteditable', 'false');
          addBtn.innerHTML = '<button class="add-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg></button>';
          
          addBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            addSectionAfter(heading as HTMLElement, headingLevel);
          };
          
          // Insert after the last content element of this section
          if (lastContentElement && lastContentElement.nextSibling) {
            lastContentElement.parentNode?.insertBefore(addBtn, lastContentElement.nextSibling);
          } else if (lastContentElement) {
            lastContentElement.parentNode?.appendChild(addBtn);
          } else {
            heading.parentNode?.insertBefore(addBtn, heading.nextSibling);
          }
        }
      });

      // Add main + button at the very end
      const existingMainBtn = proseMirror.querySelector('.add-main-section-btn');
      if (existingMainBtn) existingMainBtn.remove();
      
      const mainAddBtn = document.createElement('div');
      mainAddBtn.className = 'add-main-section-btn';
      mainAddBtn.setAttribute('contenteditable', 'false');
      mainAddBtn.innerHTML = '<button class="add-main-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg><span>Add Section</span></button>';
      
      mainAddBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addMainSection();
      };
      
      proseMirror.appendChild(mainAddBtn);
    };

    const timer = setTimeout(injectControls, 50);
    return () => clearTimeout(timer);
  }, [updateTrigger, collapsedHeadings, editor]);

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
  };

  const saveIdea = async () => {
    if (!editor) return;
    setSaving(true);
    
    // Clone and clean before saving
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = editor.getHTML();
    tempDiv.querySelectorAll('.collapse-toggle, .add-section-btn, .add-main-section-btn').forEach(el => el.remove());
    
    await supabase
      .from("projects")
      .update({ idea_markdown: tempDiv.innerHTML })
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

  const addSectionAfter = (afterHeading: HTMLElement, level: number) => {
    if (!editor) return;
    
    // Find position after this heading's section
    const proseMirror = editorContainerRef.current?.querySelector('.ProseMirror');
    if (!proseMirror) return;
    
    // Find the last element of this section
    let sibling = afterHeading.nextElementSibling;
    let lastElement: Element = afterHeading;
    
    while (sibling) {
      if (/^H[123]$/.test(sibling.tagName)) {
        const sibLevel = parseInt(sibling.tagName[1]);
        if (sibLevel <= level) break;
      }
      if (!sibling.classList.contains('add-section-btn') && !sibling.classList.contains('add-main-section-btn')) {
        lastElement = sibling;
      }
      sibling = sibling.nextElementSibling;
    }
    
    // Get editor position for this element
    const view = editor.view;
    const pos = view.posAtDOM(lastElement, lastElement.childNodes.length);
    
    // Insert new heading after
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
      <div data-tutorial="idea-editor" className="flex-1 overflow-auto pb-32">
        <div className="max-w-4xl mx-auto py-4 md:py-6 px-4 md:px-6">
          <div ref={editorContainerRef}>
            <EditorContent editor={editor} />
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
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .ProseMirror h1 { font-size: 1.25rem; font-weight: 700; margin-top: 1.5rem; margin-bottom: 0.5rem; }
        .ProseMirror h2 { font-size: 1.125rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; }
        .ProseMirror h3 { font-size: 1rem; font-weight: 500; margin-top: 0.75rem; margin-bottom: 0.25rem; }
        
        .ProseMirror p { margin: 0.25rem 0; }
        .ProseMirror ul { list-style: disc; margin-left: 1rem; }
        .ProseMirror ol { list-style: decimal; margin-left: 1rem; }
        
        .collapse-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          cursor: pointer;
          opacity: 0.5;
          transition: opacity 0.2s;
          flex-shrink: 0;
          user-select: none;
          border-radius: 3px;
        }
        
        .collapse-toggle:hover {
          opacity: 1;
          background: rgba(255,255,255,0.1);
        }
        
        .collapsed-content {
          display: none !important;
        }
        
        .add-section-btn {
          display: flex;
          justify-content: center;
          padding: 0.25rem 0;
          margin: 0.25rem 0;
        }
        
        .add-section-btn .add-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: transparent;
          border: 1px dashed rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.4);
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .add-section-btn .add-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.4);
          color: rgba(255,255,255,0.8);
        }
        
        .add-main-section-btn {
          display: flex;
          justify-content: center;
          padding: 1rem 0;
          margin-top: 1rem;
        }
        
        .add-main-section-btn .add-main-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          background: transparent;
          border: 1px dashed rgba(255,255,255,0.2);
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.875rem;
        }
        
        .add-main-section-btn .add-main-btn:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.4);
          color: rgba(255,255,255,0.8);
        }
        
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
