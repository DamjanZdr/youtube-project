"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { WaitlistForm } from "@/components/waitlist-form";

export function WaitlistModal() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="glow-primary px-3 md:px-4">
          Early Access
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl bg-background/95 backdrop-blur-xl border-white/10">
        <WaitlistForm />
      </DialogContent>
    </Dialog>
  );
}
