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
  Link2,
  Palette,
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

type Tool = "select" | "panel" | "text" | "draw" | "connect";

const COLORS = [
  "#1a1a2e", "#2d2d44", "#3d3d5c", // Dark
  "#dc2626", "#ea580c", "#d97706", // Warm
  "#16a34a", "#0d9488", "#0891b2", // Cool
  "#2563eb", "#7c3aed", "#c026d3", // Vibrant
  "#ffffff", "#a3a3a3", "#525252", // Neutral
];

const TEXT_COLORS = [
  "#ffffff", "#f5f5f5", "#a3a3a3",
  "#fca5a5", "#fdba74", "#fcd34d",
  "#86efac", "#5eead4", "#7dd3fc",
  "#93c5fd", "#c4b5fd", "#f0abfc",
];

export default function IdeaPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const supabase = createClient();

  // Canvas state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [connections, setConnections] = useState<WhiteboardConnection[]>([]);
  const [loading, setLoading] = useState(true);

  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  // Viewport state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPath, setDrawPath] = useState<string>("");
  const [drawColor, setDrawColor] = useState("#ffffff");

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // History for undo/redo
  const [history, setHistory] = useState<WhiteboardElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Load whiteboard data
  useEffect(() => {
    loadWhiteboard();
  }, [projectId]);

  async function loadWhiteboard() {
    setLoading(true);

    try {
      const { data: elementsData, error: elementsError } = await supabase
        .from("project_whiteboard_elements")
        .select("*")
        .eq("project_id", projectId)
        .order("z_index", { ascending: true });

      if (elementsError) {
        console.error("Failed to load elements:", elementsError);
        // Table might not exist yet - that's ok, just start empty
      }

      const { data: connectionsData, error: connectionsError } = await supabase
        .from("project_whiteboard_connections")
        .select("*")
        .eq("project_id", projectId);

      if (connectionsError) {
        console.error("Failed to load connections:", connectionsError);
      }

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

  // Save element to database
  async function saveElement(element: Partial<WhiteboardElement> & { id?: string }) {
    if (element.id) {
      const { error } = await supabase
        .from("project_whiteboard_elements")
        .update(element)
        .eq("id", element.id);
      if (error) {
        console.error("Update error:", error);
        toast.error("Failed to save");
      }
    } else {
      // Create a temporary ID for immediate display
      const tempId = crypto.randomUUID();
      const tempElement = { ...element, id: tempId } as WhiteboardElement;
      
      // Immediately add to local state for instant feedback
      setElements((prev) => [...prev, tempElement]);
      
      // Then save to database
      const { data, error } = await supabase
        .from("project_whiteboard_elements")
        .insert({ ...element, project_id: projectId })
        .select()
        .single();
        
      if (error) {
        console.error("Insert error:", error);
        toast.error("Failed to create element: " + error.message);
        // Remove the temp element on failure
        setElements((prev) => prev.filter((el) => el.id !== tempId));
      } else if (data) {
        // Replace temp element with real one from DB
        setElements((prev) => prev.map((el) => el.id === tempId ? data : el));
        pushHistory([...elements, data]);
      }
    }
  }

  // Save connection to database
  async function saveConnection(sourceId: string, targetId: string) {
    const { data, error } = await supabase
      .from("project_whiteboard_connections")
      .insert({
        project_id: projectId,
        source_element_id: sourceId,
        target_element_id: targetId,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create connection");
    } else if (data) {
      setConnections((prev) => [...prev, data]);
    }
  }

  // Delete element
  async function deleteElement(id: string) {
    const { error } = await supabase
      .from("project_whiteboard_elements")
      .delete()
      .eq("id", id);

    if (!error) {
      setElements((prev) => prev.filter((el) => el.id !== id));
      setConnections((prev) =>
        prev.filter((c) => c.source_element_id !== id && c.target_element_id !== id)
      );
      setSelectedElement(null);
      pushHistory(elements.filter((el) => el.id !== id));
    }
  }

  // Delete connection
  async function deleteConnection(id: string) {
    await supabase
      .from("project_whiteboard_connections")
      .delete()
      .eq("id", id);
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }

  // History management
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

  // Get mouse position in canvas coordinates
  function getCanvasPosition(e: React.MouseEvent): { x: number; y: number } {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }

  // Canvas click handler
  function handleCanvasClick(e: React.MouseEvent) {
    // Only handle clicks on the canvas background, not on elements
    const target = e.target as HTMLElement;
    if (target.closest('[data-element]')) return;

    const pos = getCanvasPosition(e);
    console.log("Canvas clicked at:", pos, "with tool:", activeTool);

    if (activeTool === "panel") {
      saveElement({
        element_type: "panel",
        x: pos.x,
        y: pos.y,
        width: 200,
        height: 150,
        background_color: "#1a1a2e",
        border_color: "#ffffff20",
        text_color: "#ffffff",
        font_size: 14,
        title: "New Panel",
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
        content: "New text",
        z_index: elements.length,
      });
    } else if (activeTool === "select") {
      setSelectedElement(null);
      setConnectingFrom(null);
    }
  }

  // Handle element click
  function handleElementClick(e: React.MouseEvent, elementId: string) {
    e.stopPropagation();

    if (activeTool === "connect") {
      if (connectingFrom === null) {
        setConnectingFrom(elementId);
      } else if (connectingFrom !== elementId) {
        saveConnection(connectingFrom, elementId);
        setConnectingFrom(null);
      }
    } else {
      setSelectedElement(elementId);
    }
  }

  // Handle element drag
  function handleElementMouseDown(e: React.MouseEvent, element: WhiteboardElement) {
    if (activeTool !== "select") return;
    e.stopPropagation();

    setIsDragging(true);
    setSelectedElement(element.id);
    const pos = getCanvasPosition(e);
    setDragStart(pos);
    setDragOffset({ x: element.x - pos.x, y: element.y - pos.y });
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (isPanning) {
      setPan({
        x: pan.x + (e.clientX - panStart.x),
        y: pan.y + (e.clientY - panStart.y),
      });
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (isDragging && selectedElement) {
      const pos = getCanvasPosition(e);
      setElements((prev) =>
        prev.map((el) =>
          el.id === selectedElement
            ? { ...el, x: pos.x + dragOffset.x, y: pos.y + dragOffset.y }
            : el
        )
      );
    } else if (isDrawing && activeTool === "draw") {
      const pos = getCanvasPosition(e);
      setDrawPath((prev) => `${prev} L ${pos.x} ${pos.y}`);
    }
  }

  function handleMouseUp() {
    if (isDragging && selectedElement) {
      // Save position to database
      const element = elements.find((el) => el.id === selectedElement);
      if (element) {
        saveElement({ id: element.id, x: element.x, y: element.y });
      }
    }
    if (isDrawing && drawPath) {
      // Save drawing
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
    setIsDragging(false);
    setIsDrawing(false);
  }

  function handleCanvasMouseDown(e: React.MouseEvent) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or alt+click to pan
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    } else if (activeTool === "draw" && e.target === canvasRef.current) {
      const pos = getCanvasPosition(e);
      setIsDrawing(true);
      setDrawPath(`M ${pos.x} ${pos.y}`);
    }
  }

  function handleCanvasMouseUp() {
    setIsPanning(false);
    handleMouseUp();
  }

  // Update element content
  async function updateElementContent(id: string, content: string) {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, content } : el))
    );
    await supabase
      .from("project_whiteboard_elements")
      .update({ content })
      .eq("id", id);
  }

  // Update element title
  async function updateElementTitle(id: string, title: string) {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, title } : el))
    );
    await supabase
      .from("project_whiteboard_elements")
      .update({ title })
      .eq("id", id);
  }

  // Update element color
  async function updateElementColor(id: string, colorKey: string, color: string) {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, [colorKey]: color } : el))
    );
    await supabase
      .from("project_whiteboard_elements")
      .update({ [colorKey]: color })
      .eq("id", id);
  }

  // Get connection line path
  function getConnectionPath(connection: WhiteboardConnection): string {
    const source = elements.find((el) => el.id === connection.source_element_id);
    const target = elements.find((el) => el.id === connection.target_element_id);
    if (!source || !target) return "";

    const sourceX = source.x + (source.width || 100) / 2;
    const sourceY = source.y + (source.height || 50) / 2;
    const targetX = target.x + (target.width || 100) / 2;
    const targetY = target.y + (target.height || 50) / 2;

    // Bezier curve
    const midX = (sourceX + targetX) / 2;
    return `M ${sourceX} ${sourceY} Q ${midX} ${sourceY} ${midX} ${(sourceY + targetY) / 2} T ${targetX} ${targetY}`;
  }

  // Zoom controls
  function zoomIn() {
    setZoom((z) => Math.min(z * 1.2, 3));
  }

  function zoomOut() {
    setZoom((z) => Math.max(z / 1.2, 0.3));
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="glass-strong border-b border-white/5 p-2 flex items-center gap-2">
        {/* Tool Buttons */}
        <div className="flex items-center gap-1 px-2 border-r border-white/10">
          <Button
            variant={activeTool === "select" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => {
              console.log("Select tool clicked");
              setActiveTool("select");
            }}
            title="Select (V)"
          >
            <MousePointer2 className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === "panel" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setActiveTool("panel")}
            title="Add Panel (P)"
          >
            <Square className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === "text" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setActiveTool("text")}
            title="Add Text (T)"
          >
            <Type className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === "draw" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setActiveTool("draw")}
            title="Draw (D)"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant={activeTool === "connect" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => {
              setActiveTool("connect");
              setConnectingFrom(null);
            }}
            title="Connect (C)"
          >
            <Link2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Draw color picker */}
        {activeTool === "draw" && (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" title="Draw Color">
                <div
                  className="w-4 h-4 rounded-full border border-white/20"
                  style={{ backgroundColor: drawColor }}
                />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-5 gap-1">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                    onClick={() => setDrawColor(color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Element formatting (when selected) */}
        {selectedEl && (
          <>
            <div className="h-6 w-px bg-white/10" />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div
                    className="w-4 h-4 rounded border border-white/20"
                    style={{ backgroundColor: selectedEl.background_color }}
                  />
                  <span className="text-xs">Fill</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => updateElementColor(selectedEl.id, "background_color", color)}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div
                    className="w-4 h-4 rounded border-2"
                    style={{ borderColor: selectedEl.border_color }}
                  />
                  <span className="text-xs">Border</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2">
                <div className="grid grid-cols-5 gap-1">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => updateElementColor(selectedEl.id, "border_color", color)}
                    />
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
                    <button
                      key={color}
                      className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      onClick={() => updateElementColor(selectedEl.id, "text_color", color)}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-400 hover:text-red-300"
              onClick={() => deleteElement(selectedEl.id)}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="icon"
          onClick={undo}
          disabled={historyIndex <= 0}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="w-4 h-4" />
        </Button>

        <div className="h-6 w-px bg-white/10" />

        {/* Zoom controls */}
        <Button variant="ghost" size="icon" onClick={zoomOut} title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" onClick={zoomIn} title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={resetView} title="Reset View">
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden cursor-crosshair"
        style={{
          background: "radial-gradient(circle at center, #1a1a2e 0%, #0f0f1a 100%)",
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
        onMouseDown={(e) => {
          // Handle all mouse interactions here
          const target = e.target as HTMLElement;
          
          // If clicking on an element, don't do canvas actions
          if (target.closest('[data-element]')) {
            return;
          }
          
          // Middle click or alt+click to pan
          if (e.button === 1 || (e.button === 0 && e.altKey)) {
            setIsPanning(true);
            setPanStart({ x: e.clientX, y: e.clientY });
            return;
          }
          
          const pos = getCanvasPosition(e);
          console.log("Canvas mousedown at:", pos, "with tool:", activeTool);
          
          if (activeTool === "draw") {
            setIsDrawing(true);
            setDrawPath(`M ${pos.x} ${pos.y}`);
          } else if (activeTool === "panel") {
            saveElement({
              element_type: "panel",
              x: pos.x,
              y: pos.y,
              width: 200,
              height: 150,
              background_color: "#1a1a2e",
              border_color: "#ffffff20",
              text_color: "#ffffff",
              font_size: 14,
              title: "New Panel",
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
              content: "New text",
              z_index: elements.length,
            });
          } else if (activeTool === "select") {
            setSelectedElement(null);
            setConnectingFrom(null);
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
      >
        {/* Transform container */}
        <div
          className="pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {/* Connection Lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ overflow: "visible" }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
              </marker>
            </defs>
            {connections.map((connection) => (
              <path
                key={connection.id}
                d={getConnectionPath(connection)}
                stroke={connection.line_color}
                strokeWidth={connection.line_width}
                fill="none"
                markerEnd={connection.target_arrow ? "url(#arrowhead)" : undefined}
                style={{
                  strokeDasharray:
                    connection.line_style === "dashed"
                      ? "8 4"
                      : connection.line_style === "dotted"
                      ? "2 2"
                      : undefined,
                }}
              />
            ))}
            {/* Current drawing path */}
            {drawPath && (
              <path
                d={drawPath}
                stroke={drawColor}
                strokeWidth={2}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          {/* Elements */}
          {elements.map((element) => (
            <div
              key={element.id}
              data-element="true"
              className={`absolute transition-shadow pointer-events-auto ${
                selectedElement === element.id
                  ? "ring-2 ring-primary ring-offset-2 ring-offset-transparent"
                  : ""
              } ${connectingFrom === element.id ? "ring-2 ring-green-500" : ""}`}
              style={{
                left: element.x,
                top: element.y,
                width: element.width || "auto",
                height: element.height || "auto",
                backgroundColor: element.background_color,
                borderColor: element.border_color,
                borderWidth: element.element_type === "panel" ? 1 : 0,
                borderRadius: element.element_type === "panel" ? 8 : 0,
                cursor: activeTool === "select" ? "move" : "pointer",
                zIndex: element.z_index,
              }}
              onClick={(e) => handleElementClick(e, element.id)}
              onMouseDown={(e) => handleElementMouseDown(e, element)}
            >
              {element.element_type === "panel" && (
                <div className="p-3 h-full flex flex-col">
                  {/* Panel Title */}
                  <input
                    type="text"
                    value={element.title || ""}
                    onChange={(e) => updateElementTitle(element.id, e.target.value)}
                    className="bg-transparent border-none outline-none font-semibold text-sm mb-2"
                    style={{ color: element.text_color }}
                    placeholder="Panel title..."
                    onClick={(e) => e.stopPropagation()}
                  />
                  {/* Panel Content */}
                  <textarea
                    value={element.content || ""}
                    onChange={(e) => updateElementContent(element.id, e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none resize-none text-sm"
                    style={{ color: element.text_color, fontSize: element.font_size }}
                    placeholder="Add notes..."
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              {element.element_type === "text" && (
                <textarea
                  value={element.content || ""}
                  onChange={(e) => updateElementContent(element.id, e.target.value)}
                  className="bg-transparent border-none outline-none resize-none min-w-[100px]"
                  style={{
                    color: element.text_color,
                    fontSize: element.font_size,
                  }}
                  placeholder="Type here..."
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              {element.element_type === "drawing" && (
                <svg
                  className="pointer-events-none"
                  style={{ overflow: "visible", position: "absolute", left: 0, top: 0 }}
                >
                  <path
                    d={element.content || ""}
                    stroke={element.border_color}
                    strokeWidth={element.font_size}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>

        {/* Connection mode hint */}
        {activeTool === "connect" && connectingFrom && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 glass rounded-lg text-sm">
            Click another panel to connect, or click canvas to cancel
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
                Click on the canvas to add panels and text, or use the draw tool to sketch ideas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
