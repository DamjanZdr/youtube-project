"use client";

import { useState, useEffect, useRef } from "react";
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

const DRAG_THRESHOLD = 5;
const HANDLE_SIZE = 10;

export default function IdeaPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const supabase = createClient();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [connections, setConnections] = useState<WhiteboardConnection[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  

  const [connectingFrom, setConnectingFrom] = useState<{ elementId: string; side: string; startX: number; startY: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPath, setDrawPath] = useState<string>("");
  const [drawColor, setDrawColor] = useState("#ffffff");

  const [mouseDownPos, setMouseDownPos] = useState<{ x: number; y: number } | null>(null);
  const [mouseDownElement, setMouseDownElement] = useState<WhiteboardElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [history, setHistory] = useState<WhiteboardElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    loadWhiteboard();
  }, [projectId]);

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

  async function saveElement(element: Partial<WhiteboardElement> & { id?: string }) {
    if (element.id) {
      await supabase.from("project_whiteboard_elements").update(element).eq("id", element.id);
    } else {
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
        pushHistory([...elements, data]);
      }
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

  function getCanvasPosition(e: React.MouseEvent | MouseEvent): { x: number; y: number } {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }

  async function updateElementContent(id: string, content: string) {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, content } : el)));
    await supabase.from("project_whiteboard_elements").update({ content }).eq("id", id);
  }

  async function updateElementColor(id: string, colorKey: string, color: string) {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, [colorKey]: color } : el)));
    await supabase.from("project_whiteboard_elements").update({ [colorKey]: color }).eq("id", id);
  }

  function getElementSize(element: WhiteboardElement): { w: number; h: number } {
    if (element.element_type === "panel") {
      const content = element.content || "";
      if (!content.trim()) {
        return { w: 70, h: 34 };
      }
      const lines = content.split("\n");
      const maxLineLength = Math.max(...lines.map((l) => l.length), 1);
      const w = Math.max(70, Math.min(280, maxLineLength * 8 + 24));
      const h = Math.max(34, lines.length * 18 + 16);
      return { w, h };
    }
    return { w: element.width || 80, h: element.height || 28 };
  }

  function getElementCenter(element: WhiteboardElement): { x: number; y: number } {
    const size = getElementSize(element);
    return { x: element.x + size.w / 2, y: element.y + size.h / 2 };
  }

  function getHandlePosition(element: WhiteboardElement, side: string): { x: number; y: number } {
    const size = getElementSize(element);
    switch (side) {
      case "top": return { x: element.x + size.w / 2, y: element.y };
      case "right": return { x: element.x + size.w, y: element.y + size.h / 2 };
      case "bottom": return { x: element.x + size.w / 2, y: element.y + size.h };
      case "left": return { x: element.x, y: element.y + size.h / 2 };
      default: return { x: element.x, y: element.y };
    }
  }

  function getBestConnectionPoints(source: WhiteboardElement, target: WhiteboardElement): { start: { x: number; y: number }; end: { x: number; y: number } } {
    const sourceCenter = getElementCenter(source);
    const targetCenter = getElementCenter(target);
    const sourceSize = getElementSize(source);
    const targetSize = getElementSize(target);

    // Determine best sides based on relative position
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;

    let startSide: string, endSide: string;
    if (Math.abs(dx) > Math.abs(dy)) {
      startSide = dx > 0 ? "right" : "left";
      endSide = dx > 0 ? "left" : "right";
    } else {
      startSide = dy > 0 ? "bottom" : "top";
      endSide = dy > 0 ? "top" : "bottom";
    }

    return {
      start: getHandlePosition(source, startSide),
      end: getHandlePosition(target, endSide),
    };
  }

  function getConnectionPath(connection: WhiteboardConnection): string {
    const source = elements.find((el) => el.id === connection.source_element_id);
    const target = elements.find((el) => el.id === connection.target_element_id);
    if (!source || !target) return "";

    const { start, end } = getBestConnectionPoints(source, target);

    // Smooth bezier curve
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    const dx = Math.abs(end.x - start.x);
    const dy = Math.abs(end.y - start.y);
    const curve = Math.min(dx, dy) * 0.5;

    if (dx > dy) {
      return `M ${start.x} ${start.y} C ${start.x + curve} ${start.y}, ${end.x - curve} ${end.y}, ${end.x} ${end.y}`;
    } else {
      return `M ${start.x} ${start.y} C ${start.x} ${start.y + curve}, ${end.x} ${end.y - curve}, ${end.x} ${end.y}`;
    }
  }

  function getHandlePositions(element: WhiteboardElement) {
    const size = getElementSize(element);
    return {
      top: { x: element.x + size.w / 2, y: element.y },
      right: { x: element.x + size.w, y: element.y + size.h / 2 },
      bottom: { x: element.x + size.w / 2, y: element.y + size.h },
      left: { x: element.x, y: element.y + size.h / 2 },
    };
  }

  function handleCanvasMouseDown(e: React.MouseEvent) {
    const target = e.target as HTMLElement;

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!target.closest("[data-element]") && !target.closest("[data-handle]")) {
      const pos = getCanvasPosition(e);

      if (activeTool === "draw") {
        setIsDrawing(true);
        setDrawPath(`M ${pos.x} ${pos.y}`);
      } else if (activeTool === "panel") {
        saveElement({
          element_type: "panel",
          x: pos.x,
          y: pos.y,
          width: null,
          height: null,
          background_color: "#1a1a2e",
          border_color: "#ffffff20",
          text_color: "#ffffff",
          font_size: 14,
          title: null,
          content: "",
          z_index: elements.length,
        });
      } else if (activeTool === "text") {
        saveElement({
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
        if (connectingFrom) {
          setConnectingFrom(null);
          setHoverTargetId(null);
        }
      }
    }
  }

  function handleElementMouseDown(e: React.MouseEvent, element: WhiteboardElement) {
    if (activeTool !== "select") return;
    e.stopPropagation();

    const pos = getCanvasPosition(e);
    setMouseDownPos(pos);
    setMouseDownElement(element);
    setDragOffset({ x: element.x - pos.x, y: element.y - pos.y });
  }

  function handleHandleMouseDown(e: React.MouseEvent, elementId: string, side: string) {
    e.stopPropagation();
    e.preventDefault();
    const pos = getCanvasPosition(e);
    const element = elements.find(el => el.id === elementId);
    if (!element) return;
    const handlePos = getHandlePosition(element, side);
    setConnectingFrom({ elementId, side, startX: handlePos.x, startY: handlePos.y });
    setMousePos(pos);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (isPanning) {
      setPan({ x: pan.x + (e.clientX - panStart.x), y: pan.y + (e.clientY - panStart.y) });
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (connectingFrom) {
      const pos = getCanvasPosition(e);
      setMousePos(pos);
      
      // Check if hovering over a potential target element
      const target = e.target as HTMLElement;
      const elementDiv = target.closest("[data-element]");
      if (elementDiv) {
        const targetId = elementDiv.getAttribute("data-element-id");
        if (targetId && targetId !== connectingFrom.elementId) {
          setHoverTargetId(targetId);
        } else {
          setHoverTargetId(null);
        }
      } else {
        setHoverTargetId(null);
      }
      return;
    }

    if (isDrawing && activeTool === "draw") {
      const pos = getCanvasPosition(e);
      setDrawPath((prev) => `${prev} L ${pos.x} ${pos.y}`);
      return;
    }

    if (mouseDownPos && mouseDownElement && !isDragging) {
      const pos = getCanvasPosition(e);
      const dist = Math.sqrt(Math.pow(pos.x - mouseDownPos.x, 2) + Math.pow(pos.y - mouseDownPos.y, 2));
      if (dist > DRAG_THRESHOLD) {
        setIsDragging(true);
        setSelectedElement(mouseDownElement.id);
        setEditingElement(null);
      }
    }

    if (isDragging && mouseDownElement) {
      const pos = getCanvasPosition(e);
      setElements((prev) =>
        prev.map((el) => (el.id === mouseDownElement.id ? { ...el, x: pos.x + dragOffset.x, y: pos.y + dragOffset.y } : el))
      );
    }
  }

  function handleMouseUp(e: React.MouseEvent) {
    if (connectingFrom) {
      if (hoverTargetId) {
        saveConnection(connectingFrom.elementId, hoverTargetId);
      }
      setConnectingFrom(null);
      setHoverTargetId(null);
      return;
    }

    if (isDragging && mouseDownElement) {
      const element = elements.find((el) => el.id === mouseDownElement.id);
      if (element) saveElement({ id: element.id, x: element.x, y: element.y });
    } else if (mouseDownElement && !isDragging) {
      setSelectedElement(mouseDownElement.id);
      setEditingElement(mouseDownElement.id);
    }

    if (isDrawing && drawPath) {
      saveElement({
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
    setIsDrawing(false);
    setMouseDownPos(null);
    setMouseDownElement(null);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedEl = elements.find((el) => el.id === selectedElement);

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden">
      <div className="glass-strong border-b border-white/5 p-2 flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 border-r border-white/10">
          <Button variant={activeTool === "select" ? "secondary" : "ghost"} size="icon" onClick={() => setActiveTool("select")} title="Select">
            <MousePointer2 className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === "panel" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => { setActiveTool("panel"); setSelectedElement(null); setEditingElement(null); }}
            title="Add Panel"
          >
            <Square className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === "text" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => { setActiveTool("text"); setSelectedElement(null); setEditingElement(null); }}
            title="Add Text"
          >
            <Type className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === "draw" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => { setActiveTool("draw"); setSelectedElement(null); setEditingElement(null); }}
            title="Draw"
          >
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
                  <button key={color} className="w-6 h-6 rounded border border-white/20 hover:scale-110" style={{ backgroundColor: color }} onClick={() => setDrawColor(color)} />
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
                    <button key={color} className="w-6 h-6 rounded border border-white/20 hover:scale-110" style={{ backgroundColor: color }} onClick={() => updateElementColor(selectedEl.id, "background_color", color)} />
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
                    <button key={color} className="w-6 h-6 rounded border border-white/20 hover:scale-110" style={{ backgroundColor: color }} onClick={() => updateElementColor(selectedEl.id, "border_color", color)} />
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
                    <button key={color} className="w-6 h-6 rounded border border-white/20 hover:scale-110" style={{ backgroundColor: color }} onClick={() => updateElementColor(selectedEl.id, "text_color", color)} />
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

        <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(z / 1.2, 0.3))} title="Zoom Out">
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

      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden"
        style={{
          background: "radial-gradient(circle at center, #1a1a2e 0%, #0f0f1a 100%)",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          cursor: connectingFrom 
            ? "crosshair" 
            : activeTool === "draw" 
              ? "crosshair" 
              : activeTool === "select" 
                ? "default" 
                : "crosshair",
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.min(Math.max(z * (e.deltaY > 0 ? 0.9 : 1.1), 0.3), 3)); }}
      >
        <div className="pointer-events-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
          <svg className="absolute inset-0 pointer-events-none" style={{ overflow: "visible" }}>
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#ffffff60" />
              </marker>
              <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
              </marker>
            </defs>
            {connections.map((c) => (
              <path key={c.id} d={getConnectionPath(c)} stroke={c.line_color} strokeWidth={c.line_width} fill="none" markerEnd="url(#arrowhead)" />
            ))}
            {connectingFrom && (
              <g>
                {/* Connection line from handle to cursor */}
                <line 
                  x1={connectingFrom.startX} 
                  y1={connectingFrom.startY} 
                  x2={mousePos.x} 
                  y2={mousePos.y} 
                  stroke={hoverTargetId ? "#22c55e" : "#60a5fa"} 
                  strokeWidth={2} 
                  strokeDasharray={hoverTargetId ? "none" : "6 3"}
                  markerEnd={hoverTargetId ? "url(#arrowhead-active)" : undefined}
                />
                {/* Animated circle at cursor when not over target */}
                {!hoverTargetId && (
                  <circle cx={mousePos.x} cy={mousePos.y} r={6} fill="#60a5fa" opacity={0.6}>
                    <animate attributeName="r" values="6;8;6" dur="1s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            )}
            {drawPath && <path d={drawPath} stroke={drawColor} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
          </svg>

          {elements.map((element) => {
            const isSelected = selectedElement === element.id;
            const isEditing = editingElement === element.id;
            const isHovered = hoveredElement === element.id;
            const isConnectSource = connectingFrom?.elementId === element.id;
            const isConnectTarget = connectingFrom && connectingFrom.elementId !== element.id;
            const isHoverTarget = hoverTargetId === element.id;
            const showHandles = (isSelected || isHovered) && activeTool === "select" && !isDragging && !connectingFrom;
            const handles = getHandlePositions(element);
            const size = getElementSize(element);

            return (
              <div
                key={element.id}
                data-element="true"
                data-element-id={element.id}
                className={`absolute pointer-events-auto transition-all duration-150 ${
                  isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-transparent" : ""
                } ${isConnectSource ? "ring-2 ring-blue-400 opacity-50" : ""} ${
                  isHoverTarget ? "ring-2 ring-green-500 scale-105" : ""
                } ${isConnectTarget && !isHoverTarget ? "opacity-70" : ""}`}
                style={{
                  left: element.x,
                  top: element.y,
                  width: element.element_type === "panel" ? size.w : "auto",
                  minHeight: element.element_type === "panel" ? size.h : "auto",
                  backgroundColor: element.background_color,
                  borderColor: isHoverTarget ? "#22c55e" : element.border_color,
                  borderWidth: element.element_type === "panel" ? (isHoverTarget ? 2 : 1) : 0,
                  borderRadius: element.element_type === "panel" ? 8 : 0,
                  cursor: connectingFrom 
                    ? (isConnectTarget ? "pointer" : "not-allowed")
                    : activeTool === "select" 
                      ? (isDragging ? "grabbing" : "grab") 
                      : "default",
                  zIndex: isHoverTarget ? 1000 : element.z_index,
                }}
                onMouseDown={(e) => handleElementMouseDown(e, element)}
                onMouseEnter={() => setHoveredElement(element.id)}
                onMouseLeave={() => setHoveredElement(null)}
              >
                {element.element_type === "panel" && (
                  <div className="p-2">
                    {isEditing ? (
                      <textarea
                        autoFocus
                        value={element.content || ""}
                        onChange={(e) => updateElementContent(element.id, e.target.value)}
                        onBlur={() => setEditingElement(null)}
                        className="w-full bg-transparent border-none outline-none resize-none text-sm"
                        style={{ color: element.text_color, fontSize: element.font_size, minHeight: 20 }}
                        placeholder="Type here..."
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="text-sm whitespace-pre-wrap" style={{ color: element.text_color, fontSize: element.font_size, minHeight: 20 }}>
                        {element.content || <span className="opacity-40">Click to edit</span>}
                      </div>
                    )}
                  </div>
                )}
                {element.element_type === "text" &&
                  (isEditing ? (
                    <textarea
                      autoFocus
                      value={element.content || ""}
                      onChange={(e) => updateElementContent(element.id, e.target.value)}
                      onBlur={() => setEditingElement(null)}
                      className="bg-transparent border-none outline-none resize-none"
                      style={{ color: element.text_color, fontSize: element.font_size, minWidth: 50 }}
                      onMouseDown={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap" style={{ color: element.text_color, fontSize: element.font_size }}>
                      {element.content || "Text"}
                    </div>
                  ))}
                {element.element_type === "drawing" && (
                  <svg className="pointer-events-none" style={{ overflow: "visible", position: "absolute", left: 0, top: 0 }}>
                    <path d={element.content || ""} stroke={element.border_color} strokeWidth={element.font_size} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}

                {showHandles && element.element_type !== "drawing" && (
                  <>
                    {(["top", "right", "bottom", "left"] as const).map((side) => {
                      const pos = handles[side];
                      const offset = HANDLE_SIZE / 2;
                      return (
                        <div
                          key={side}
                          data-handle="true"
                          className="absolute bg-blue-500 rounded-full border-2 border-white shadow-lg cursor-crosshair hover:bg-blue-400 hover:scale-125 transition-all z-50"
                          style={{ 
                            width: HANDLE_SIZE, 
                            height: HANDLE_SIZE,
                            left: pos.x - element.x - offset, 
                            top: pos.y - element.y - offset,
                          }}
                          onMouseDown={(e) => handleHandleMouseDown(e, element.id, side)}
                        />
                      );
                    })}
                  </>
                )}
              </div>
            );
          })}
        </div>

        {connectingFrom && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 glass rounded-lg text-sm flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${hoverTargetId ? "bg-green-500" : "bg-blue-400 animate-pulse"}`} />
            {hoverTargetId ? "Release to connect" : "Drag to another panel to connect"}
          </div>
        )}

        {elements.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start brainstorming</h3>
              <p className="text-muted-foreground text-sm max-w-xs">Click to add panels. Hover to see connection handles.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
