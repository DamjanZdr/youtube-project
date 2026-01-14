"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, FileText, Trash2, Edit2, FolderOpen } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface FolderPageProps {
  params: Promise<{ studioSlug: string; folderId: string }>;
}

interface WikiDocument {
  id: string;
  title: string;
  content: string;
  updated_at: string;
}

export default function WikiFolderPage({ params }: FolderPageProps) {
  const { studioSlug, folderId } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [folderName, setFolderName] = useState("");
  const [documents, setDocuments] = useState<WikiDocument[]>([]);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadFolderData();
  }, [folderId]);

  const loadFolderData = async () => {
    setLoading(true);

    // Load folder info
    const { data: folder } = await supabase
      .from("wiki_folders")
      .select("name")
      .eq("id", folderId)
      .single();

    if (folder) {
      setFolderName(folder.name);
    }

    // Load documents in this folder
    const { data: docs } = await supabase
      .from("wiki_documents")
      .select("*")
      .eq("folder_id", folderId)
      .order("position");

    if (docs) {
      setDocuments(docs);
    }

    setLoading(false);
  };

  const createDocument = async () => {
    if (!newDocTitle.trim()) return;

    setCreating(true);
    const { data: userData } = await supabase.auth.getUser();
    const { data: folder } = await supabase
      .from("wiki_folders")
      .select("organization_id")
      .eq("id", folderId)
      .single();

    if (folder) {
      const { data } = await supabase
        .from("wiki_documents")
        .insert({
          folder_id: folderId,
          organization_id: folder.organization_id,
          title: newDocTitle,
          content: "",
          created_by: userData.user?.id,
          position: documents.length,
        })
        .select()
        .single();

      if (data) {
        router.push(\/studio/\/wiki/doc/\\);
      }
    }
    setCreating(false);
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm("Delete this document?")) return;

    await supabase
      .from("wiki_documents")
      .delete()
      .eq("id", docId);

    setDocuments(documents.filter(d => d.id !== docId));
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link
            href={\/studio/\/wiki\}
            className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Wiki
          </Link>
          <div className="flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold">{folderName}</h1>
          </div>
        </div>
        <Button onClick={() => setShowCreateDoc(true)} className="glow-sm">
          <Plus className="w-4 h-4 mr-2" />
          New Document
        </Button>
      </div>

      {/* Documents */}
      {documents.length > 0 ? (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="glass-card p-4 hover-lift group flex items-center gap-4">
              <Link
                href={\/studio/\/wiki/doc/\\}
                className="flex items-center gap-4 flex-1 min-w-0"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                    {doc.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Updated {new Date(doc.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => deleteDocument(doc.id)}
              >
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No documents yet</h3>
          <p className="text-muted-foreground mb-4">Create your first document in this folder</p>
          <Button onClick={() => setShowCreateDoc(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Document
          </Button>
        </div>
      )}

      {/* Create Document Dialog */}
      <Dialog open={showCreateDoc} onOpenChange={setShowCreateDoc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Document title"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createDocument()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDoc(false)}>
              Cancel
            </Button>
            <Button onClick={createDocument} disabled={!newDocTitle.trim() || creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
