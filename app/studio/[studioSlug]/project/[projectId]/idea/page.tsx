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
  Loader2, Check, Mic, MicOff, ChevronDown, ChevronRight,
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Heading1, Heading2, Heading3, Plus
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
<h2>Opening line ideas</h2>
<p>Write your hook ideas here...</p>
<h1>2. Value</h1>
<p>What's the core benefit viewers will get? Why should someone watch until the end?</p>
<h1>3. Flow</h1>
<p>How will the video be structured? How do you keep momentum and avoid drop-off?</p>
<h2>Key points</h2>
<p>List the main points to cover...</p>
<h3>Supporting details</h3>
<p>Add supporting info for each point...</p>
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
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
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
        placeholder: "Start writing... Use the + button or type /1 /2 /3 for sections",
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
      }),
    ],
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none min-h-[300px]",
      },
    },
    onUpdate: ({ editor }) => {
      // Check for slash commands
      const { selection } = editor.state;
      const { $from } = selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      
      // Quick slash commands: /1, /2, /3 for headings
      if (textBefore.endsWith('/1')) {
        editor.chain()
          .deleteRange({ from: $from.pos - 2, to: $from.pos })
          .setHeading({ level: 1 })
          .run();
      } else if (textBefore.endsWith('/2')) {
        editor.chain()
          .deleteRange({ from: $from.pos - 2, to: $from.pos })
          .setHeading({ level: 2 })
          .run();
      } else if (textBefore.endsWith('/3')) {
        editor.chain()
          .deleteRange({ from: $from.pos - 2, to: $from.pos })
          .setHeading({ level: 3 })
          .run();
      } else if (textBefore.endsWith('/p') || textBefore.endsWith('/text')) {
        const len = textBefore.endsWith('/p') ? 2 : 5;
        editor.chain()
          .deleteRange({ from: $from.pos - len, to: $from.pos })
          .setParagraph()
          .run();
      }
      
      updateCollapseStyles();
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

  // Update collapse styles when collapsed sections change
  const updateCollapseStyles = useCallback(() => {
    if (!editorContainerRef.current || !editor) return;

    const proseMirror = editorContainerRef.current.querySelector('.ProseMirror');
    if (!proseMirror) return;

    const headingElements = proseMirror.querySelectorAll('h1, h2, h3');
    
    headingElements.forEach((heading) => {
      const headingId = heading.textContent?.replace(/[\u200B-\u200D\uFEFF]/g, '').trim() || '';
      const level = parseInt(heading.tagName[1]);
      const isCollapsed = collapsedSections.has(headingId);
      
      // Update chevron
      let chevron = heading.querySelector('.collapse-chevron') as HTMLElement;
      if (!chevron) {
        chevron = document.createElement('span');
        chevron.className = 'collapse-chevron';
        chevron.setAttribute('contenteditable', 'false');
        heading.insertBefore(chevron, heading.firstChild);
        
        chevron.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const currentId = heading.textContent?.replace(/[\u200B-\u200D\uFEFF]/g, '').trim() || '';
          toggleCollapse(currentId);
        });
      }
      
      chevron.innerHTML = isCollapsed 
        ? '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>'
        : '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>';
      
      // Hide/show content under this heading
      let sibling = heading.nextElementSibling;
      while (sibling) {
        if (/^H[123]$/.test(sibling.tagName)) {
          const sibLevel = parseInt(sibling.tagName[1]);
          if (sibLevel <= level) break; // Stop at same or higher level heading
        }
        
        (sibling as HTMLElement).style.display = isCollapsed ? 'none' : '';
        sibling = sibling.nextElementSibling;
      }
    });
  }, [collapsedSections, editor]);

  useEffect(() => {
    const timer = setTimeout(updateCollapseStyles, 50);
    return () => clearTimeout(timer);
  }, [updateCollapseStyles, editor?.getHTML()]);

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
    setTimeout(updateCollapseStyles, 100);
  };

  const saveIdea = async () => {
    if (!editor) return;
    setSaving(true);
    
    // Clean up any injected chevrons before saving
    const content = editor.getHTML().replace(/<span[^>]*class="collapse-chevron"[^>]*>.*?<\/span>/g, '');
    
    await supabase
      .from("projects")
      .update({ idea_markdown: content })
      .eq("id", projectId);
    
    setLastSaved(new Date());
    setSaving(false);
  };

  const toggleCollapse = (headingId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(headingId)) {
        next.delete(headingId);
      } else {
        next.add(headingId);
      }
      return next;
    });
  };

  const insertHeading = (level: 1 | 2 | 3) => {
    if (!editor) return;
    editor.chain().focus().setHeading({ level }).run();
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
            Type <code className="bg-white/10 px-1 rounded">/1</code> <code className="bg-white/10 px-1 rounded">/2</code> <code className="bg-white/10 px-1 rounded">/3</code> for sections
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
        {/* Section buttons */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Section
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => insertHeading(1)} className="gap-2">
              <Heading1 className="h-4 w-4" />
              <div>
                <div className="font-medium">Main Section</div>
                <div className="text-xs text-muted-foreground">Large heading (H1) · /1</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertHeading(2)} className="gap-2">
              <Heading2 className="h-4 w-4" />
              <div>
                <div className="font-medium">Sub-Section</div>
                <div className="text-xs text-muted-foreground">Medium heading (H2) · /2</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => insertHeading(3)} className="gap-2">
              <Heading3 className="h-4 w-4" />
              <div>
                <div className="font-medium">Detail Section</div>
                <div className="text-xs text-muted-foreground">Small heading (H3) · /3</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-muted' : ''}`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-muted' : ''}`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-muted' : ''}`}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-5 bg-border mx-1" />
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('bulletList') ? 'bg-muted' : ''}`}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`h-8 w-8 p-0 ${editor.isActive('orderedList') ? 'bg-muted' : ''}`}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div data-tutorial="idea-editor" className="flex-1 overflow-auto pb-32">
        <div className="max-w-4xl mx-auto py-4 md:py-6 px-4 md:px-6">
          <div ref={editorContainerRef} className="idea-editor">
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
        .idea-editor .ProseMirror {
          outline: none;
        }
        
        .idea-editor .ProseMirror h1,
        .idea-editor .ProseMirror h2,
        .idea-editor .ProseMirror h3 {
          position: relative;
          padding-left: 1.75rem;
        }
        
        .idea-editor .ProseMirror h1 { 
          font-size: 1.5rem; 
          font-weight: 700; 
          margin-top: 2rem; 
          margin-bottom: 0.75rem;
        }
        .idea-editor .ProseMirror h2 { 
          font-size: 1.25rem; 
          font-weight: 600; 
          margin-top: 1.5rem; 
          margin-bottom: 0.5rem;
          color: rgba(255,255,255,0.9);
        }
        .idea-editor .ProseMirror h3 { 
          font-size: 1.1rem; 
          font-weight: 500; 
          margin-top: 1rem; 
          margin-bottom: 0.5rem;
          color: rgba(255,255,255,0.8);
        }
        
        .idea-editor .ProseMirror > h1:first-child,
        .idea-editor .ProseMirror > h2:first-child,
        .idea-editor .ProseMirror > h3:first-child {
          margin-top: 0;
        }
        
        .idea-editor .collapse-chevron {
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          cursor: pointer;
          opacity: 0.4;
          transition: opacity 0.2s, background 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 0.25rem;
          user-select: none;
        }
        
        .idea-editor .collapse-chevron:hover {
          opacity: 1;
          background: rgba(255,255,255,0.1);
        }
        
        .idea-editor .ProseMirror p { 
          margin: 0.5rem 0;
          padding-left: 1.75rem;
        }
        
        .idea-editor .ProseMirror ul,
        .idea-editor .ProseMirror ol { 
          margin: 0.5rem 0;
          padding-left: 3rem;
        }
        
        .idea-editor .ProseMirror li {
          margin: 0.25rem 0;
        }
        
        .idea-editor .ProseMirror p.is-editor-empty:first-child::before {
          color: rgba(255, 255, 255, 0.3);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
        
        @keyframes shine {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
