"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Type,
  Square,
  Pencil,
  MousePointer2,
  Trash2,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";

// Types
interface WhiteboardElement {
  id: string;
  element_type: "panel" | "text" | "drawing";
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  content: string | null;
  background_color: string;
  border_color: string;
  text_color: string;
  font_size: number;
  title: string | null;
  z_index: number;
}

interface WhiteboardConnection {
  id: string;
  source_element_id: string;
  target_element_id: string;
  line_color: string;
  line_width: number;
  line_style: string;
  source_arrow: boolean;
  target_arrow: boolean;
}

type Tool = "select" | "panel" | "text" | "draw";
type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const COLORS = [
  "#1a1a2e", "#2d2d44", "#3d3d5c",
  "#dc2626", "#ea580c", "#d97706",
  "#16a34a", "#0d9488", "#0891b2",
  "#2563eb", "#7c3aed", "#c026d3",
  "#ffffff", "#a3a3a3", "#525252",
];

const TEXT_COLORS = [
  "#ffffff", "#f5f5f5", "#a3a3a3",
  "#fca5a5", "#fdba74", "#fcd34d",
  "#86efac", "#5eead4", "#7dd3fc",
  "#93c5fd", "#c4b5fd", "#f0abfc",
];

const MIN_WIDTH = 80;
const MIN_HEIGHT = 40;
const DEFAULT_WIDTH = 140;
const DEFAULT_HEIGHT = 60;

export default function IdeaPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const supabase = createClient();

  const canvasRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [connections, setConnections] = useState<WhiteboardConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<string | null>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, ex: 0, ey: 0 });

  // Connection state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [connectMousePos, setConnectMousePos] = useState({ x: 0, y: 0 });
  const [connectTarget, setConnectTarget] = useState<string | null>(null);

  // Viewport state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPath, setDrawPath] = useState<string>("");
  const [drawColor, setDrawColor] = useState("#ffffff");

  // History
  const [history, setHistory] = useState<WhiteboardElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load whiteboard
  useEffect(() => {
    loadWhiteboard();
  }, [projectId]);

  // Debounced auto-save
  const debouncedSave = useCallback((element: Partial<WhiteboardElement> & { id: string }) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      await supabase.from("project_whiteboard_elements").update(element).eq("id", element.id);
    }, 500);
  }, [supabase]);

  async function loadWhiteboard() {
    setLoading(true);
    try {
      const { data: elementsData } = await supabase
        .from("project_whiteboard_elements")
        .select("*")
        .eq("project_id", projectId)
        .order("z_index", { ascending: true });

      const { data: connectionsData } = await supabase
        .from("project_whiteboard_connections")
        .select("*")
        .eq("project_id", projectId);

      if (elementsData) {
        setElements(elementsData);
        setHistory([elementsData]);
        setHistoryIndex(0);
      }
      if (connectionsData) {
        setConnections(connectionsData);
      }
    } catch (err) {
      console.error("Whiteboard load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function createElement(element: Partial<WhiteboardElement>) {
    const tempId = crypto.randomUUID();
    const tempElement = { ...element, id: tempId } as WhiteboardElement;
    setElements((prev) => [...prev, tempElement]);

    const { data, error } = await supabase
      .from("project_whiteboard_elements")
      .insert({ ...element, project_id: projectId })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create element");
      setElements((prev) => prev.filter((el) => el.id !== tempId));
    } else if (data) {
      setElements((prev) => prev.map((el) => (el.id === tempId ? data : el)));
      pushHistory([...elements.filter(el => el.id !== tempId), data]);
    }
  }

  async function saveConnection(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const exists = connections.some(
      (c) =>
        (c.source_element_id === sourceId && c.target_element_id === targetId) ||
        (c.source_element_id === targetId && c.target_element_id === sourceId)
    );
    if (exists) return;

    const { data, error } = await supabase
      .from("project_whiteboard_connections")
      .insert({ project_id: projectId, source_element_id: sourceId, target_element_id: targetId })
      .select()
      .single();

    if (!error && data) {
      setConnections((prev) => [...prev, data]);
    }
  }

  async function deleteElement(id: string) {
    await supabase.from("project_whiteboard_elements").delete().eq("id", id);
    setElements((prev) => prev.filter((el) => el.id !== id));
    setConnections((prev) => prev.filter((c) => c.source_element_id !== id && c.target_element_id !== id));
    setSelectedElement(null);
    setEditingElement(null);
  }

  function pushHistory(newElements: WhiteboardElement[]) {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }

  function undo() {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  }

  function redo() {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  }

  function getCanvasPos(e: React.MouseEvent | MouseEvent): { x: number; y: number } {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }

  function getElementBounds(el: WhiteboardElement) {
    const w = el.width ?? DEFAULT_WIDTH;
    const h = el.height ?? DEFAULT_HEIGHT;
    return { x: el.x, y: el.y, w, h };
  }

  function getConnectionPath(conn: WhiteboardConnection): string {
    const source = elements.find((el) => el.id === conn.source_element_id);
    const target = elements.find((el) => el.id === conn.target_element_id);
    if (!source || !target) return "";

    const s = getElementBounds(source);
    const t = getElementBounds(target);

    const sx = s.x + s.w / 2;
    const sy = s.y + s.h / 2;
    const tx = t.x + t.w / 2;
    const ty = t.y + t.h / 2;

    // Bezier curve
    const dx = tx - sx;
    const dy = ty - sy;
    const ctrl = Math.min(Math.abs(dx), Math.abs(dy), 80);

    if (Math.abs(dx) > Math.abs(dy)) {
      return `M ${sx} ${sy} C ${sx + ctrl * Math.sign(dx)} ${sy}, ${tx - ctrl * Math.sign(dx)} ${ty}, ${tx} ${ty}`;
    } else {
      return `M ${sx} ${sy} C ${sx} ${sy + ctrl * Math.sign(dy)}, ${tx} ${ty - ctrl * Math.sign(dy)}, ${tx} ${ty}`;
    }
  }

  // Canvas handlers
  function handleCanvasMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;

    // Pan with middle click or alt+click
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    // Ignore if clicking on element or handle
    if (target.closest("[data-element]") || target.closest("[data-resize]") || target.closest("[data-connector]")) {
      return;
    }

    const pos = getCanvasPos(e);

    if (activeTool === "draw") {
      setIsDrawing(true);
      setDrawPath(`M ${pos.x} ${pos.y}`);
    } else if (activeTool === "panel") {
      createElement({
        element_type: "panel",
        x: pos.x - DEFAULT_WIDTH / 2,
        y: pos.y - DEFAULT_HEIGHT / 2,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        background_color: "#1a1a2e",
        border_color: "#ffffff20",
        text_color: "#ffffff",
        font_size: 14,
        title: null,
        content: "",
        z_index: elements.length,
      });
    } else if (activeTool === "text") {
      createElement({
        element_type: "text",
        x: pos.x,
        y: pos.y,
        width: null,
        height: null,
        background_color: "transparent",
        border_color: "transparent",
        text_color: "#ffffff",
        font_size: 16,
        title: null,
        content: "Text",
        z_index: elements.length,
      });
    } else if (activeTool === "select") {
      setSelectedElement(null);
      setEditingElement(null);
      if (isConnecting) {
        setIsConnecting(false);
        setConnectFrom(null);
        setConnectTarget(null);
      }
    }
  }

  function handleElementMouseDown(e: React.MouseEvent, el: WhiteboardElement) {
    if (activeTool !== "select") return;
    e.stopPropagation();

    // If connecting, complete connection
    if (isConnecting && connectFrom && connectFrom !== el.id) {
      saveConnection(connectFrom, el.id);
      setIsConnecting(false);
      setConnectFrom(null);
      setConnectTarget(null);
      return;
    }

    setSelectedElement(el.id);
    setIsDragging(true);
    const pos = getCanvasPos(e);
    setDragOffset({ x: el.x - pos.x, y: el.y - pos.y });
  }

  function handleElementDoubleClick(e: React.MouseEvent, el: WhiteboardElement) {
    if (activeTool !== "select") return;
    e.stopPropagation();
    if (el.element_type !== "drawing") {
      setEditingElement(el.id);
    }
  }

  function handleResizeMouseDown(e: React.MouseEvent, el: WhiteboardElement, handle: ResizeHandle) {
    e.stopPropagation();
    setSelectedElement(el.id);
    setIsResizing(true);
    setResizeHandle(handle);
    const pos = getCanvasPos(e);
    const bounds = getElementBounds(el);
    setResizeStart({ x: bounds.x, y: bounds.y, w: bounds.w, h: bounds.h, ex: pos.x, ey: pos.y });
  }

  function handleConnectorMouseDown(e: React.MouseEvent, elId: string) {
    e.stopPropagation();
    setIsConnecting(true);
    setConnectFrom(elId);
    setConnectMousePos(getCanvasPos(e));
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (isPanning) {
      setPan({ x: pan.x + (e.clientX - panStart.x), y: pan.y + (e.clientY - panStart.y) });
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const pos = getCanvasPos(e);

    if (isConnecting) {
      setConnectMousePos(pos);
      // Check hover target
      const target = e.target as HTMLElement;
      const elDiv = target.closest("[data-element]");
      if (elDiv) {
        const targetId = elDiv.getAttribute("data-element-id");
        if (targetId && targetId !== connectFrom) {
          setConnectTarget(targetId);
        } else {
          setConnectTarget(null);
        }
      } else {
        setConnectTarget(null);
      }
      return;
    }

    if (isDrawing && activeTool === "draw") {
      setDrawPath((prev) => `${prev} L ${pos.x} ${pos.y}`);
      return;
    }

    if (isResizing && selectedElement && resizeHandle) {
      const el = elements.find((e) => e.id === selectedElement);
      if (!el) return;

      const dx = pos.x - resizeStart.ex;
      const dy = pos.y - resizeStart.ey;
      let newX = resizeStart.x;
      let newY = resizeStart.y;
      let newW = resizeStart.w;
      let newH = resizeStart.h;

      // Handle resize directions
      if (resizeHandle.includes("e")) newW = Math.max(MIN_WIDTH, resizeStart.w + dx);
      if (resizeHandle.includes("w")) {
        const dw = Math.min(dx, resizeStart.w - MIN_WIDTH);
        newX = resizeStart.x + dw;
        newW = resizeStart.w - dw;
      }
      if (resizeHandle.includes("s")) newH = Math.max(MIN_HEIGHT, resizeStart.h + dy);
      if (resizeHandle.includes("n")) {
        const dh = Math.min(dy, resizeStart.h - MIN_HEIGHT);
        newY = resizeStart.y + dh;
        newH = resizeStart.h - dh;
      }

      setElements((prev) =>
        prev.map((item) =>
          item.id === selectedElement
            ? { ...item, x: newX, y: newY, width: newW, height: newH }
            : item
        )
      );
      return;
    }

    if (isDragging && selectedElement) {
      setElements((prev) =>
        prev.map((item) =>
          item.id === selectedElement
            ? { ...item, x: pos.x + dragOffset.x, y: pos.y + dragOffset.y }
            : item
        )
      );
    }
  }

  function handleMouseUp() {
    if (isConnecting && connectFrom && connectTarget) {
      saveConnection(connectFrom, connectTarget);
    }

    if (isDragging && selectedElement) {
      const el = elements.find((e) => e.id === selectedElement);
      if (el) debouncedSave({ id: el.id, x: el.x, y: el.y });
    }

    if (isResizing && selectedElement) {
      const el = elements.find((e) => e.id === selectedElement);
      if (el) debouncedSave({ id: el.id, x: el.x, y: el.y, width: el.width, height: el.height });
    }

    if (isDrawing && drawPath) {
      createElement({
        element_type: "drawing",
        x: 0,
        y: 0,
        width: null,
        height: null,
        content: drawPath,
        background_color: "transparent",
        border_color: drawColor,
        text_color: drawColor,
        font_size: 2,
        title: null,
        z_index: elements.length,
      });
      setDrawPath("");
    }

    setIsPanning(false);
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setIsDrawing(false);
    setIsConnecting(false);
    setConnectFrom(null);
    setConnectTarget(null);
  }

  async function updateContent(id: string, content: string) {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, content } : el)));
    debouncedSave({ id, content });
  }

  async function updateColor(id: string, key: string, color: string) {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, [key]: color } : el)));
    debouncedSave({ id, [key]: color });
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedEl = elements.find((el) => el.id === selectedElement);

  // Resize handle cursors
  const cursorMap: Record<ResizeHandle, string> = {
    n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
    ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize",
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="glass-strong border-b border-white/5 p-2 flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 border-r border-white/10">
          <Button variant={activeTool === "select" ? "secondary" : "ghost"} size="icon" onClick={() => setActiveTool("select")} title="Select (V)">
            <MousePointer2 className="w-4 h-4" />
          </Button>
          <Button variant={activeTool === "panel" ? "secondary" : "ghost"} size="icon" onClick={() => { setActiveTool("panel"); setSelectedElement(null); }} title="Add Box (B)">
            <Square className="w-4 h-4" />
          </Button>
          <Button variant={activeTool === "text" ? "secondary" : "ghost"} size="icon" onClick={() => { setActiveTool("text"); setSelectedElement(null); }} title="Add Text (T)">
            <Type className="w-4 h-4" />
          </Button>
          <Button variant={activeTool === "draw" ? "secondary" : "ghost"} size="icon" onClick={() => { setActiveTool("draw"); setSelectedElement(null); }} title="Draw (D)">
            <Pencil className="w-4 h-4" />
          </Button>
        </div>

        {activeTool === "draw" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" title="Draw Color">
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: drawColor }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-5 gap-1">
                {TEXT_COLORS.map((color) => (
                  <button key={color} className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => setDrawColor(color)} />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {selectedEl && activeTool === "select" && (
          <>
            <div className="h-6 w-px bg-white/10" />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="w-4 h-4 rounded border border-white/20" style={{ backgroundColor: selectedEl.background_color }} />
                  <span className="text-xs">Fill</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {COLORS.map((color) => (
                    <button key={color} className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => updateColor(selectedEl.id, "background_color", color)} />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="w-4 h-4 rounded border-2" style={{ borderColor: selectedEl.border_color }} />
                  <span className="text-xs">Border</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {COLORS.map((color) => (
                    <button key={color} className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => updateColor(selectedEl.id, "border_color", color)} />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Type className="w-3 h-3" style={{ color: selectedEl.text_color }} />
                  <span className="text-xs">Text</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {TEXT_COLORS.map((color) => (
                    <button key={color} className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform" style={{ backgroundColor: color }} onClick={() => updateColor(selectedEl.id, "text_color", color)} />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-300" onClick={() => deleteElement(selectedEl.id)} title="Delete">
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}

        <div className="flex-1" />

        <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0} title="Undo">
          <Undo className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo">
          <Redo className="w-4 h-4" />
        </Button>
        <div className="h-6 w-px bg-white/10" />
        <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(z / 1.2, 0.25))} title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(z * 1.2, 3))} title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset View">
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{
          background: "radial-gradient(circle at center, #1a1a2e 0%, #0f0f1a 100%)",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          cursor: isConnecting ? "crosshair" : activeTool === "draw" ? "crosshair" : activeTool === "select" ? "default" : "crosshair",
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.min(Math.max(z * (e.deltaY > 0 ? 0.9 : 1.1), 0.25), 3)); }}
      >
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
          {/* SVG Connections */}
          <svg className="absolute inset-0 pointer-events-none" style={{ overflow: "visible" }}>
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#ffffff50" />
              </marker>
              <marker id="arrow-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
              </marker>
            </defs>
            {connections.map((c) => (
              <path key={c.id} d={getConnectionPath(c)} stroke="#ffffff50" strokeWidth={2} fill="none" markerEnd="url(#arrow)" />
            ))}
            {/* Connection preview */}
            {isConnecting && connectFrom && (
              <g>
                {(() => {
                  const fromEl = elements.find((e) => e.id === connectFrom);
                  if (!fromEl) return null;
                  const b = getElementBounds(fromEl);
                  const sx = b.x + b.w / 2;
                  const sy = b.y + b.h / 2;
                  return (
                    <>
                      <line
                        x1={sx}
                        y1={sy}
                        x2={connectMousePos.x}
                        y2={connectMousePos.y}
                        stroke={connectTarget ? "#22c55e" : "#60a5fa"}
                        strokeWidth={2}
                        strokeDasharray={connectTarget ? undefined : "6 4"}
                        markerEnd={connectTarget ? "url(#arrow-active)" : undefined}
                      />
                      {!connectTarget && (
                        <circle cx={connectMousePos.x} cy={connectMousePos.y} r={5} fill="#60a5fa">
                          <animate attributeName="r" values="5;7;5" dur="0.8s" repeatCount="indefinite" />
                        </circle>
                      )}
                    </>
                  );
                })()}
              </g>
            )}
            {/* Draw preview */}
            {drawPath && (
              <path d={drawPath} stroke={drawColor} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>

          {/* Elements */}
          {elements.map((el) => {
            const isSelected = selectedElement === el.id;
            const isEditing = editingElement === el.id;
            const isConnectSrc = connectFrom === el.id;
            const isConnectTgt = isConnecting && connectFrom !== el.id;
            const isHoverTgt = connectTarget === el.id;
            const bounds = getElementBounds(el);

            if (el.element_type === "drawing") {
              return (
                <svg
                  key={el.id}
                  data-element="true"
                  data-element-id={el.id}
                  className="absolute pointer-events-auto"
                  style={{ overflow: "visible", left: 0, top: 0, cursor: activeTool === "select" ? "pointer" : "default" }}
                  onClick={() => activeTool === "select" && setSelectedElement(el.id)}
                >
                  <path
                    d={el.content || ""}
                    stroke={isSelected ? "#60a5fa" : el.border_color}
                    strokeWidth={el.font_size}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              );
            }

            return (
              <div
                key={el.id}
                data-element="true"
                data-element-id={el.id}
                className={`absolute pointer-events-auto transition-shadow ${
                  isSelected ? "shadow-lg shadow-primary/20" : ""
                } ${isConnectSrc ? "ring-2 ring-blue-400 opacity-60" : ""} ${
                  isHoverTgt ? "ring-2 ring-green-500 shadow-lg shadow-green-500/30" : ""
                } ${isConnectTgt && !isHoverTgt ? "opacity-80" : ""}`}
                style={{
                  left: bounds.x,
                  top: bounds.y,
                  width: bounds.w,
                  height: bounds.h,
                  backgroundColor: el.background_color,
                  border: `1px solid ${isHoverTgt ? "#22c55e" : isSelected ? "#60a5fa" : el.border_color}`,
                  borderRadius: 8,
                  cursor: isConnecting ? (isConnectTgt ? "pointer" : "not-allowed") : isDragging ? "grabbing" : "grab",
                  zIndex: isHoverTgt ? 1000 : el.z_index,
                }}
                onMouseDown={(e) => handleElementMouseDown(e, el)}
                onDoubleClick={(e) => handleElementDoubleClick(e, el)}
              >
                {/* Content */}
                <div className="w-full h-full p-2 overflow-hidden">
                  {isEditing ? (
                    <textarea
                      autoFocus
                      value={el.content || ""}
                      onChange={(e) => updateContent(el.id, e.target.value)}
                      onBlur={() => setEditingElement(null)}
                      onKeyDown={(e) => e.key === "Escape" && setEditingElement(null)}
                      className="w-full h-full bg-transparent border-none outline-none resize-none text-sm"
                      style={{ color: el.text_color, fontSize: el.font_size }}
                      placeholder="Type here..."
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div
                      className="w-full h-full text-sm whitespace-pre-wrap overflow-hidden"
                      style={{ color: el.text_color, fontSize: el.font_size }}
                    >
                      {el.content || <span className="opacity-40">Double-click to edit</span>}
                    </div>
                  )}
                </div>

                {/* Resize handles (8 points) - only when selected */}
                {isSelected && !isEditing && (
                  <>
                    {(["n", "s", "e", "w", "ne", "nw", "se", "sw"] as ResizeHandle[]).map((handle) => {
                      const style: React.CSSProperties = {
                        position: "absolute",
                        width: 8,
                        height: 8,
                        backgroundColor: "#60a5fa",
                        border: "2px solid white",
                        borderRadius: 2,
                        cursor: cursorMap[handle],
                        zIndex: 10,
                      };
                      // Position handles
                      if (handle === "n") { style.top = -4; style.left = "50%"; style.marginLeft = -4; }
                      if (handle === "s") { style.bottom = -4; style.left = "50%"; style.marginLeft = -4; }
                      if (handle === "e") { style.right = -4; style.top = "50%"; style.marginTop = -4; }
                      if (handle === "w") { style.left = -4; style.top = "50%"; style.marginTop = -4; }
                      if (handle === "ne") { style.top = -4; style.right = -4; }
                      if (handle === "nw") { style.top = -4; style.left = -4; }
                      if (handle === "se") { style.bottom = -4; style.right = -4; }
                      if (handle === "sw") { style.bottom = -4; style.left = -4; }

                      return (
                        <div
                          key={handle}
                          data-resize={handle}
                          style={style}
                          onMouseDown={(e) => handleResizeMouseDown(e, el, handle)}
                        />
                      );
                    })}

                    {/* Connector button (center right) */}
                    <div
                      data-connector="true"
                      className="absolute w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-md cursor-crosshair hover:scale-110 transition-transform flex items-center justify-center"
                      style={{ right: -10, top: "50%", marginTop: -10, zIndex: 20 }}
                      onMouseDown={(e) => handleConnectorMouseDown(e, el.id)}
                    >
                      <Plus className="w-3 h-3 text-white" />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Connection hint */}
        {isConnecting && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 glass rounded-lg text-sm flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connectTarget ? "bg-green-500" : "bg-blue-400 animate-pulse"}`} />
            {connectTarget ? "Release to connect" : "Drag to another box to connect"}
          </div>
        )}

        {/* Empty state */}
        {elements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start brainstorming</h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Click to add boxes. Double-click to edit. Drag the green connector to link boxes.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
