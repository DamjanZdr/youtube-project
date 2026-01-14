import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { 
  Plus, 
  BookOpen,
  Folder,
  FileText,
  Search,
  MoreHorizontal,
  ChevronRight
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface WikiPageProps {
  params: Promise<{ studioSlug: string }>;
}

export default async function WikiPage({ params }: WikiPageProps) {
  const { studioSlug } = await params;
  const supabase = await createClient();

  // TODO: Fetch wiki folders and documents
  // For now, showing empty state
  const folders: any[] = [];
  const recentDocuments: any[] = [];

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
          <Button variant="outline">
            <Folder className="w-4 h-4 mr-2" />
            New Folder
          </Button>
          <Button className="glow-sm">
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
                  <Link
                    key={folder.id}
                    href={`/studio/${studioSlug}/wiki/folder/${folder.id}`}
                    className="glass-card p-4 hover-lift group flex items-center gap-4"
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
                ))}
              </div>
            </div>
          )}

          {/* Recent Documents */}
          {recentDocuments.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Recent Documents</h2>
              <div className="space-y-2">
                {recentDocuments.map((doc) => (
                  <Link
                    key={doc.id}
                    href={`/studio/${studioSlug}/wiki/doc/${doc.id}`}
                    className="glass-card p-4 hover-lift group flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                        {doc.title || "Untitled Document"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Updated {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : "recently"}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </Link>
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
            <Button variant="outline">
              <Folder className="w-4 h-4 mr-2" />
              Create Folder
            </Button>
            <Button className="glow-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Document
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}