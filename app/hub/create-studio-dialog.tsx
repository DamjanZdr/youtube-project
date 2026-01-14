"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { createStudio } from "@/lib/actions/studio";

interface CreateStudioDialogProps {
  trigger?: React.ReactNode;
}

export function CreateStudioDialog({ trigger }: CreateStudioDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("name", name);

    const result = await createStudio(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else if (result.slug) {
      setOpen(false);
      setName("");
      router.push(`/studio/${result.slug}/projects`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="glow-sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Studio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-strong border-white/10 sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a new studio</DialogTitle>
            <DialogDescription>
              A studio is a workspace for your YouTube channel. You can invite
              team members and manage multiple projects.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <label htmlFor="name" className="text-sm font-medium mb-2 block">
              Studio name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Awesome Channel"
              className="glass border-white/10"
              autoFocus
              required
            />
            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Studio"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}