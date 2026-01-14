"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { 
  Plus, 
  BookOpen,
  Folder,
  FileText,
  Search,
  MoreHorizontal,
  ChevronRight,
  Edit,
  Trash2,
  FolderOpen
} from "lucide-react";

interface WikiPageProps {
  params: Promise<{ studioSlug: string }>;
}

interface WikiFolder {
  id: string;
  name: string;
  position: number;
  document_count?: number;
}

interface WikiDocument {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  updated_at: string;
  folder?: {
    name: string;
  };
}

export default function WikiPage({ params }: WikiPageProps) {
  const { studioSlug } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [folders, setFolders] = useState<WikiFolder[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<WikiDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Dialog states
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showCreateDocument, setShowCreateDocument] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadWikiData();
  }, [studioSlug]);

  const loadWikiData = async () => {
    setLoading(true);

    // Get organization from slug
    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", studioSlug)
      .single();

    if (!org) {
      setLoading(false);
      return;
    }

    setOrganizationId(org.id);

    // Load folders with document counts
    const { data: foldersData } = await supabase
      .from("wiki_folders")
      .select(`
        id,
        name,
        position
      `)
      .eq("organization_id", org.id)
      .is("parent_folder_id", null)
      .order("position");

    if (foldersData) {
      // Count documents in each folder
      const foldersWithCounts = await Promise.all(
        foldersData.map(async (folder) => {
          const { count } = await supabase
            .from("wiki_documents")
            .select("*", { count: "exact", head: true })
            .eq("folder_id", folder.id);
          
          return {
            ...folder,
            document_count: count || 0,
          };
        })
      );
      setFolders(foldersWithCounts);
    }

    // Load recent documents
    const { data: docsData } = await supabase
      .from("wiki_documents")
      .select(`
        id,
        title,
        content,
        folder_id,
        updated_at,
        folder:wiki_folders(name)
      `)
      .eq("organization_id", org.id)
      .order("updated_at", { ascending: false })
      .limit(10);

    if (docsData) {
      setRecentDocuments(docsData as any);
    }

    setLoading(false);
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !organizationId) return;

    setCreating(true);
    const { data, error } = await supabase
      .from("wiki_folders")
      .insert({
        organization_id: organizationId,
        name: newFolderName,
        position: folders.length,
      })
      .select()
      .single();

    if (data) {
      setFolders([...folders, { ...data, document_count: 0 }]);
      setShowCreateFolder(false);
      setNewFolderName("");
    }
    setCreating(false);
  };

  const createDocument = async () => {
    if (!newDocTitle.trim() || !organizationId) return;

    setCreating(true);
    const { data: userData } = await supabase.auth.getUser();
    
    const { data, error } = await supabase
      .from("wiki_documents")
      .insert({
        organization_id: organizationId,
        title: newDocTitle,
        content: "",
        created_by: userData.user?.id,
      })
      .select()
      .single();

    if (data) {
      // Navigate to the document editor
      router.push(`/studio/${studioSlug}/wiki/doc/${data.id}`);
    }
    setCreating(false);
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm("Delete this folder and all its documents?")) return;

    await supabase
      .from("wiki_folders")
      .delete()
      .eq("id", folderId);

    setFolders(folders.filter(f => f.id !== folderId));
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm("Delete this document?")) return;

    await supabase
      .from("wiki_documents")
      .delete()
      .eq("id", docId);

    setRecentDocuments(recentDocuments.filter(d => d.id !== docId));
  };

  // Filter documents by search
  const filteredDocuments = searchQuery
    ? recentDocuments.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : recentDocuments;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Wiki</h1>
          <p className="text-muted-foreground mt-1">
            Your team knowledge base and documentation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowCreateFolder(true)}>
            <Folder className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button className="glow-sm" onClick={() => setShowCreateDocument(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Document
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input 
          placeholder="Search documents..." 
          className="pl-12 h-12 glass border-white/10 text-base"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {folders.length > 0 || recentDocuments.length > 0 ? (
        <div className="space-y-8">
          {/* Folders */}
          {folders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Folders</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folders.map((folder) => (
                  <div key={folder.id} className="glass-card p-4 hover-lift group flex items-center gap-4">
                    <Link
                      href={`/studio/${studioSlug}/wiki/folder/${folder.id}`}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                        <Folder className="w-6 h-6 text-yellow-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                          {folder.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {folder.document_count || 0} documents
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deleteFolder(folder.id)}
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Documents */}
          {filteredDocuments.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">
                {searchQuery ? "Search Results" : "Recent Documents"}
              </h2>
              <div className="space-y-2">
                {filteredDocuments.map((doc) => (
                  <div key={doc.id} className="glass-card p-4 hover-lift group flex items-center gap-4">
                    <Link
                      href={`/studio/${studioSlug}/wiki/doc/${doc.id}`}
                      className="flex items-center gap-4 flex-1 min-w-0"
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                          {doc.title || "Untitled Document"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {doc.folder_id && (doc.folder as any)?.name && (
                            <span className="inline-flex items-center gap-1 mr-2">
                              <FolderOpen className="w-3 h-3" />
                              {(doc.folder as any).name} •
                            </span>
                          )}
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
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-24 h-24 rounded-3xl glass flex items-center justify-center mb-6">
            <BookOpen className="w-12 h-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Start Your Wiki</h2>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Create documents to store your brand guidelines, content templates,
            research notes, and team knowledge.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowCreateFolder(true)}>
              <Folder className="w-4 h-4 mr-2" />
              Create Folder
            </Button>
            <Button className="glow-primary" onClick={() => setShowCreateDocument(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Document
            </Button>
          </div>
        </div>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createFolder()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
              Cancel
            </Button>
            <Button onClick={createFolder} disabled={!newFolderName.trim() || creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Document Dialog */}
      <Dialog open={showCreateDocument} onOpenChange={setShowCreateDocument}>
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
            <Button variant="outline" onClick={() => setShowCreateDocument(false)}>
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