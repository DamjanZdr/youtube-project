"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Type,
  Pencil,
  Trash2,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Play,
  Pause,
  MousePointer2,
  Square,
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

type Tool = "select" | "draw";
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
  const [selectedElements, setSelectedElements] = useState<Set<string>>(new Set());
  const [editingElement, setEditingElement] = useState<string | null>(null);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragElementOffsets, setDragElementOffsets] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Selection box state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });

  // Resize state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0, ex: 0, ey: 0 });
  const [resizeElementId, setResizeElementId] = useState<string | null>(null);

  // Connection state
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectFrom, setConnectFrom] = useState<string | null>(null);
  const [connectMousePos, setConnectMousePos] = useState({ x: 0, y: 0 });
  const [connectTarget, setConnectTarget] = useState<string | null>(null);
  const [hoveredConnection, setHoveredConnection] = useState<string | null>(null);

  // Viewport state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPath, setDrawPath] = useState<string>("");
  const [drawColor, setDrawColor] = useState("#ffffff");

  // Flow animation
  const [flowEnabled, setFlowEnabled] = useState(true);

  // History
  const [history, setHistory] = useState<WhiteboardElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load whiteboard
  useEffect(() => {
    loadWhiteboard();
  }, [projectId]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (editingElement) return;
      
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedElements.size > 0) {
          selectedElements.forEach((id) => deleteElement(id));
          setSelectedElements(new Set());
        }
      }
      if (e.key === "Escape") {
        setSelectedElements(new Set());
        setEditingElement(null);
        setIsConnecting(false);
        setConnectFrom(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElements, editingElement, historyIndex]);

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

  async function createElement(element: Partial<WhiteboardElement>, connectToId?: string): Promise<string | null> {
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
      return null;
    } else if (data) {
      setElements((prev) => prev.map((el) => (el.id === tempId ? data : el)));
      pushHistory([...elements.filter(el => el.id !== tempId), data]);
      
      if (connectToId) {
        await saveConnection(connectToId, data.id);
      }
      
      return data.id;
    }
    return null;
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

  async function deleteConnection(id: string) {
    await supabase.from("project_whiteboard_connections").delete().eq("id", id);
    setConnections((prev) => prev.filter((c) => c.id !== id));
    setHoveredConnection(null);
  }

  async function deleteElement(id: string) {
    await supabase.from("project_whiteboard_elements").delete().eq("id", id);
    setElements((prev) => prev.filter((el) => el.id !== id));
    setConnections((prev) => prev.filter((c) => c.source_element_id !== id && c.target_element_id !== id));
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

  function getViewCenter(): { x: number; y: number } {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (rect.width / 2 - pan.x) / zoom,
      y: (rect.height / 2 - pan.y) / zoom,
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

    const dx = tx - sx;
    const dy = ty - sy;
    const ctrl = Math.min(Math.abs(dx), Math.abs(dy), 80);

    if (Math.abs(dx) > Math.abs(dy)) {
      return `M ${sx} ${sy} C ${sx + ctrl * Math.sign(dx)} ${sy}, ${tx - ctrl * Math.sign(dx)} ${ty}, ${tx} ${ty}`;
    } else {
      return `M ${sx} ${sy} C ${sx} ${sy + ctrl * Math.sign(dy)}, ${tx} ${ty - ctrl * Math.sign(dy)}, ${tx} ${ty}`;
    }
  }

  function getConnectionLength(conn: WhiteboardConnection): number {
    const source = elements.find((el) => el.id === conn.source_element_id);
    const target = elements.find((el) => el.id === conn.target_element_id);
    if (!source || !target) return 100;

    const s = getElementBounds(source);
    const t = getElementBounds(target);
    const dx = (t.x + t.w / 2) - (s.x + s.w / 2);
    const dy = (t.y + t.h / 2) - (s.y + s.h / 2);
    return Math.sqrt(dx * dx + dy * dy) * 1.2;
  }

  function addPanelAtCenter() {
    const center = getViewCenter();
    createElement({
      element_type: "panel",
      x: center.x - DEFAULT_WIDTH / 2,
      y: center.y - DEFAULT_HEIGHT / 2,
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
  }

  function addTextAtCenter() {
    const center = getViewCenter();
    createElement({
      element_type: "text",
      x: center.x - 50,
      y: center.y - 12,
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
  }

  function handleCanvasMouseDown(e: React.MouseEvent) {
    // Middle mouse button - ONLY panning, nothing else
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }
    
    // Alt+click also pans
    if (e.button === 0 && e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    const target = e.target as HTMLElement;
    if (target.closest("[data-element]") || target.closest("[data-resize]") || target.closest("[data-connector]") || target.closest("[data-connection]")) {
      return;
    }

    const pos = getCanvasPos(e);

    if (activeTool === "draw") {
      setIsDrawing(true);
      setDrawPath(`M ${pos.x} ${pos.y}`);
    } else if (activeTool === "select") {
      if (isConnecting && connectFrom) {
        const newPanel = {
          element_type: "panel" as const,
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
        };
        createElement(newPanel, connectFrom);
        setIsConnecting(false);
        setConnectFrom(null);
        setConnectTarget(null);
        return;
      }

      setIsSelecting(true);
      setSelectionStart(pos);
      setSelectionEnd(pos);
      setSelectedElements(new Set());
      setEditingElement(null);
    }
  }

  function handleElementMouseDown(e: React.MouseEvent, el: WhiteboardElement) {
    // Middle mouse should only pan, not interact with elements
    if (e.button === 1) return;
    if (activeTool !== "select") return;
    e.stopPropagation();

    if (isConnecting && connectFrom && connectFrom !== el.id) {
      saveConnection(connectFrom, el.id);
      setIsConnecting(false);
      setConnectFrom(null);
      setConnectTarget(null);
      return;
    }

    const pos = getCanvasPos(e);
    
    if (e.shiftKey) {
      const newSelected = new Set(selectedElements);
      if (newSelected.has(el.id)) {
        newSelected.delete(el.id);
      } else {
        newSelected.add(el.id);
      }
      setSelectedElements(newSelected);
      return;
    }

    if (!selectedElements.has(el.id)) {
      setSelectedElements(new Set([el.id]));
    }

    setIsDragging(true);
    
    const offsets = new Map<string, { x: number; y: number }>();
    selectedElements.forEach((id) => {
      const elem = elements.find((e) => e.id === id);
      if (elem) {
        offsets.set(id, { x: elem.x - pos.x, y: elem.y - pos.y });
      }
    });
    offsets.set(el.id, { x: el.x - pos.x, y: el.y - pos.y });
    setDragElementOffsets(offsets);
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
    setSelectedElements(new Set([el.id]));
    setIsResizing(true);
    setResizeHandle(handle);
    setResizeElementId(el.id);
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

    if (isSelecting) {
      setSelectionEnd(pos);
      const minX = Math.min(selectionStart.x, pos.x);
      const maxX = Math.max(selectionStart.x, pos.x);
      const minY = Math.min(selectionStart.y, pos.y);
      const maxY = Math.max(selectionStart.y, pos.y);
      
      const inBox = new Set<string>();
      elements.forEach((el) => {
        const bounds = getElementBounds(el);
        const elCenterX = bounds.x + bounds.w / 2;
        const elCenterY = bounds.y + bounds.h / 2;
        if (elCenterX >= minX && elCenterX <= maxX && elCenterY >= minY && elCenterY <= maxY) {
          inBox.add(el.id);
        }
      });
      setSelectedElements(inBox);
      return;
    }

    if (isConnecting) {
      setConnectMousePos(pos);
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

    if (isResizing && resizeElementId && resizeHandle) {
      const el = elements.find((e) => e.id === resizeElementId);
      if (!el) return;

      const dx = pos.x - resizeStart.ex;
      const dy = pos.y - resizeStart.ey;
      let newX = resizeStart.x;
      let newY = resizeStart.y;
      let newW = resizeStart.w;
      let newH = resizeStart.h;

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
          item.id === resizeElementId
            ? { ...item, x: newX, y: newY, width: newW, height: newH }
            : item
        )
      );
      return;
    }

    if (isDragging && dragElementOffsets.size > 0) {
      setElements((prev) =>
        prev.map((item) => {
          const offset = dragElementOffsets.get(item.id);
          if (offset) {
            return { ...item, x: pos.x + offset.x, y: pos.y + offset.y };
          }
          return item;
        })
      );
    }
  }

  async function handleMouseUp() {
    if (isConnecting && connectFrom && connectTarget) {
      saveConnection(connectFrom, connectTarget);
      setIsConnecting(false);
      setConnectFrom(null);
      setConnectTarget(null);
    }

    if (isDragging && dragElementOffsets.size > 0) {
      dragElementOffsets.forEach((_, id) => {
        const el = elements.find((e) => e.id === id);
        if (el) debouncedSave({ id: el.id, x: el.x, y: el.y });
      });
    }

    if (isResizing && resizeElementId) {
      const el = elements.find((e) => e.id === resizeElementId);
      if (el) debouncedSave({ id: el.id, x: el.x, y: el.y, width: el.width, height: el.height });
    }

    if (isDrawing && drawPath) {
      // Extract the starting point from the path
      const pathMatch = drawPath.match(/^M\s*([\d.]+)\s+([\d.]+)/);
      const startX = pathMatch ? parseFloat(pathMatch[1]) : 0;
      const startY = pathMatch ? parseFloat(pathMatch[2]) : 0;
      
      // Normalize the path to start at 0,0 (make all coords relative to start)
      // This allows x/y to be used as the actual position for dragging
      const normalizedPath = drawPath.replace(
        /([ML])\s*([\d.]+)\s+([\d.]+)/g,
        (_, cmd, x, y) => `${cmd} ${parseFloat(x) - startX} ${parseFloat(y) - startY}`
      );
      
      createElement({
        element_type: "drawing",
        x: startX,  // Position of the stroke
        y: startY,
        width: null,
        height: null,
        content: normalizedPath,  // Path is now relative to 0,0
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
    setDragElementOffsets(new Map());
    setIsResizing(false);
    setResizeHandle(null);
    setResizeElementId(null);
    setIsDrawing(false);
    setIsSelecting(false);
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

  const selectedEl = selectedElements.size === 1 ? elements.find((el) => selectedElements.has(el.id)) : null;

  const cursorMap: Record<ResizeHandle, string> = {
    n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
    ne: "nesw-resize", sw: "nesw-resize", nw: "nwse-resize", se: "nwse-resize",
  };

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="absolute inset-0 select-none"
        style={{
          background: "radial-gradient(circle at center, #1a1a2e 0%, #0f0f1a 100%)",
          backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          cursor: isConnecting ? "crosshair" : activeTool === "draw" ? "crosshair" : "default",
        }}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={(e) => {
          e.preventDefault();
          const rect = canvasRef.current?.getBoundingClientRect();
          if (!rect) return;
          
          // Mouse position relative to canvas
          const mouseX = e.clientX - rect.left;
          const mouseY = e.clientY - rect.top;
          
          // Calculate new zoom
          const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
          const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 3);
          
          // Adjust pan so that the point under the mouse stays in place
          // Formula: mouseX = worldX * newZoom + newPanX  AND  mouseX = worldX * oldZoom + oldPanX
          // So: newPanX = mouseX - (mouseX - oldPanX) * (newZoom / oldZoom)
          const newPanX = mouseX - (mouseX - pan.x) * (newZoom / zoom);
          const newPanY = mouseY - (mouseY - pan.y) * (newZoom / zoom);
          
          setZoom(newZoom);
          setPan({ x: newPanX, y: newPanY });
        }}
      >
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0" }}>
          {/* SVG Connections */}
          <svg className="absolute inset-0" style={{ overflow: "visible", pointerEvents: "none" }}>
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#ffffff80" />
              </marker>
              <marker id="arrow-hover" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
              </marker>
              <marker id="arrow-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
              </marker>
            </defs>
            
            {/* Existing connections */}
            {connections.map((c) => {
              const path = getConnectionPath(c);
              const length = getConnectionLength(c);
              const isHovered = hoveredConnection === c.id;
              
              return (
                <g key={c.id} style={{ pointerEvents: "stroke" }}>
                  {/* Invisible wider path for hover detection */}
                  <path
                    d={path}
                    stroke="transparent"
                    strokeWidth={16}
                    fill="none"
                    data-connection={c.id}
                    style={{ cursor: "pointer", pointerEvents: "stroke" }}
                    onMouseEnter={() => setHoveredConnection(c.id)}
                    onMouseLeave={() => setHoveredConnection(null)}
                    onClick={() => deleteConnection(c.id)}
                  />
                  {/* Visible path */}
                  <path
                    d={path}
                    stroke={isHovered ? "#ef4444" : "#ffffff80"}
                    strokeWidth={2}
                    fill="none"
                    strokeDasharray="8 4"
                    markerEnd={isHovered ? "url(#arrow-hover)" : "url(#arrow)"}
                    style={{ pointerEvents: "none" }}
                  >
                    {flowEnabled && !isHovered && (
                      <animate
                        attributeName="stroke-dashoffset"
                        values={`${length};0`}
                        dur="20s"
                        repeatCount="indefinite"
                      />
                    )}
                  </path>
                </g>
              );
            })}
            
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
                        stroke={connectTarget ? "#22c55e" : "#ffffff80"}
                        strokeWidth={2}
                        strokeDasharray={connectTarget ? undefined : "6 4"}
                        markerEnd={connectTarget ? "url(#arrow-active)" : undefined}
                      />
                      {!connectTarget && (
                        <circle cx={connectMousePos.x} cy={connectMousePos.y} r={5} fill="#ffffff80">
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

            {/* Selection box */}
            {isSelecting && (
              <rect
                x={Math.min(selectionStart.x, selectionEnd.x)}
                y={Math.min(selectionStart.y, selectionEnd.y)}
                width={Math.abs(selectionEnd.x - selectionStart.x)}
                height={Math.abs(selectionEnd.y - selectionStart.y)}
                fill="rgba(96, 165, 250, 0.1)"
                stroke="#60a5fa"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            )}
          </svg>

          {/* Elements */}
          {elements.map((el) => {
            const isSelected = selectedElements.has(el.id);
            const isEditing = editingElement === el.id;
            const isConnectSrc = connectFrom === el.id;
            const isConnectTgt = isConnecting && connectFrom !== el.id;
            const isHoverTgt = connectTarget === el.id;
            const bounds = getElementBounds(el);

            if (el.element_type === "drawing") {
              // Path is normalized (relative to 0,0), so just position using x/y
              return (
                <svg
                  key={el.id}
                  data-element="true"
                  data-element-id={el.id}
                  className="absolute pointer-events-auto"
                  style={{ 
                    overflow: "visible", 
                    left: el.x, 
                    top: el.y,
                    cursor: activeTool === "select" ? (isDragging ? "grabbing" : "grab") : "default" 
                  }}
                  onMouseDown={(e) => {
                    // Middle mouse should only pan, not interact
                    if (e.button === 1) return;
                    if (activeTool === "select") {
                      e.stopPropagation();
                      const pos = getCanvasPos(e);
                      
                      if (e.shiftKey) {
                        const newSel = new Set(selectedElements);
                        if (newSel.has(el.id)) newSel.delete(el.id);
                        else newSel.add(el.id);
                        setSelectedElements(newSel);
                        return;
                      }
                      
                      if (!selectedElements.has(el.id)) {
                        setSelectedElements(new Set([el.id]));
                      }
                      
                      setIsDragging(true);
                      const offsets = new Map<string, { x: number; y: number }>();
                      selectedElements.forEach((id) => {
                        const elem = elements.find((e) => e.id === id);
                        if (elem) {
                          offsets.set(id, { x: elem.x - pos.x, y: elem.y - pos.y });
                        }
                      });
                      offsets.set(el.id, { x: el.x - pos.x, y: el.y - pos.y });
                      setDragElementOffsets(offsets);
                    }
                  }}
                >
                  {/* Invisible wider path for easier clicking/dragging */}
                  <path
                    d={el.content || ""}
                    stroke="transparent"
                    strokeWidth={Math.max(el.font_size * 6, 16)}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: "stroke" }}
                  />
                  {/* Visible path */}
                  <path
                    d={el.content || ""}
                    stroke={isSelected ? "#60a5fa" : el.border_color}
                    strokeWidth={el.font_size}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ pointerEvents: "none" }}
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

                {/* Resize handles - only when selected */}
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

                    {/* Connector button - only for panels */}
                    {el.element_type === "panel" && (
                      <div
                        data-connector="true"
                        className="absolute w-5 h-5 bg-primary rounded-full border-2 border-white shadow-md cursor-crosshair hover:scale-110 transition-transform flex items-center justify-center"
                        style={{ right: -10, top: "50%", marginTop: -10, zIndex: 20 }}
                        onMouseDown={(e) => handleConnectorMouseDown(e, el.id)}
                      >
                        <Plus className="w-3 h-3 text-white" />
                      </div>
                    )}
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
            {connectTarget ? "Release to connect" : "Drop on empty space to create connected box"}
          </div>
        )}

        {/* Onboarding hints - only show when canvas is empty */}
        {elements.length === 0 && (
          <>
            {/* Left toolbar labels */}
            <div className="absolute top-14 left-4 pointer-events-none flex items-start gap-1 text-[10px] text-muted-foreground/60">
              <span className="w-[76px] text-center">Mode</span>
              <span className="w-9 text-center">Panel</span>
              <span className="w-9 text-center">Text</span>
            </div>

            {/* Right toolbar labels */}
            <div className="absolute top-14 right-4 pointer-events-none flex items-start gap-1 text-[10px] text-muted-foreground/60">
              <span className="w-[72px] text-center">History</span>
              <span className="w-[120px] text-center">Zoom</span>
              <span className="w-9 text-center">Flow</span>
            </div>

            {/* Center hint */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="text-center">
                <p className="text-muted-foreground/40 text-sm">Click a button above to add elements</p>
                <p className="text-muted-foreground/25 text-xs mt-1">Double-click to edit · Drag to move · Shift+click to multi-select</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating Toolbar - Left */}
      <div className="absolute top-4 left-4 flex items-center gap-2 px-2 py-1.5 glass rounded-xl border border-white/10">
        {/* Mode Toggle - Segmented control */}
        <div className="flex items-center rounded-lg bg-white/5 p-0.5">
          <button
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
              activeTool === "select" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTool("select")}
            title="Select Mode"
          >
            <MousePointer2 className="w-4 h-4" />
          </button>
          <button
            className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors ${
              activeTool === "draw" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTool("draw")}
            title="Draw Mode"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
        
        <div className="h-6 w-px bg-white/10" />
        
        {/* Add Panel Button */}
        <Button 
          variant="ghost"
          size="icon" 
          onClick={addPanelAtCenter}
          title="Add Panel"
        >
          <Square className="w-4 h-4" />
        </Button>
        
        {/* Add Text */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={addTextAtCenter}
          title="Add Text"
        >
          <Type className="w-4 h-4" />
        </Button>

        {activeTool === "draw" && (
          <>
            <div className="h-6 w-px bg-white/10" />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" title="Stroke Color">
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
          </>
        )}
      </div>

      {/* Selection Toolbar - appears when element selected */}
      {selectedEl && !editingElement && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 glass rounded-xl border border-white/10">
          {/* Drawing: only show Color */}
          {selectedEl.element_type === "drawing" ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2 h-8">
                  <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: selectedEl.border_color }} />
                  <span className="text-xs">Color</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {TEXT_COLORS.map((color) => (
                    <button 
                      key={color} 
                      className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform" 
                      style={{ backgroundColor: color }} 
                      onClick={() => {
                        updateColor(selectedEl.id, "border_color", color);
                        updateColor(selectedEl.id, "text_color", color);
                      }} 
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            /* Panel/Text: show Fill, Border, Text */
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 h-8">
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
                  <Button variant="ghost" size="sm" className="gap-2 h-8">
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
                  <Button variant="ghost" size="sm" className="gap-2 h-8">
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
            </>
          )}
          <div className="h-6 w-px bg-white/10" />
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-red-400 hover:text-red-300 h-8 w-8" 
            onClick={() => { deleteElement(selectedEl.id); setSelectedElements(new Set()); }}
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Multi-select delete */}
      {selectedElements.size > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 glass rounded-xl border border-white/10">
          <span className="text-xs text-muted-foreground">{selectedElements.size} selected</span>
          <div className="h-6 w-px bg-white/10" />
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-red-400 hover:text-red-300 h-8 w-8" 
            onClick={() => { 
              selectedElements.forEach((id) => deleteElement(id)); 
              setSelectedElements(new Set()); 
            }}
            title="Delete All"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Floating Toolbar - Right */}
      <div className="absolute top-4 right-4 flex items-center gap-2 px-2 py-1.5 glass rounded-xl border border-white/10">
        <Button variant="ghost" size="icon" onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
          <Undo className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Y)">
          <Redo className="w-4 h-4" />
        </Button>
        
        <div className="h-6 w-px bg-white/10" />
        
        <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(z / 1.2, 0.25))} title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(z * 1.2, 3))} title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Reset View">
          <Maximize2 className="w-4 h-4" />
        </Button>
        
        <div className="h-6 w-px bg-white/10" />
        
        <Button 
          variant={flowEnabled ? "secondary" : "ghost"} 
          size="icon" 
          onClick={() => setFlowEnabled(!flowEnabled)}
          title={flowEnabled ? "Disable Flow Animation" : "Enable Flow Animation"}
        >
          {flowEnabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
