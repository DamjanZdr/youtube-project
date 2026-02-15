import { AuthButton } from "@/components/auth-button";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";
import { Eye, FolderKanban, FileText, Users, LayoutGrid, Shield, Image, PenTool, Lightbulb } from "lucide-react";
import { WaitlistForm } from "@/components/waitlist-form";
import { WaitlistModal } from "@/components/waitlist-modal";

// Force dynamic rendering to check auth state
export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  }

  return (
    <main className="min-h-screen flex flex-col relative">
      {/* Background gradient - scrolls with content */}
      <div className="absolute top-0 left-0 w-full h-[200vh] overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[12%] left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-[12%] right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        {/* Lower section subtle blobs */}
        <div className="absolute top-[50%] right-[15%] w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-[60%] left-[10%] w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      {/* Navigation - Top on all devices */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center h-14 md:h-16 px-1 md:px-2">
            <img
              src="/bplogo.png"
              alt="Logo"
              className="max-h-9 md:max-h-12 object-contain"
              style={{ width: 'auto', height: '100%' }}
            />
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            {user ? (
              <>
                <Link href="/hub">
                  <Button variant="ghost" size="sm" className="gap-1 md:gap-2 px-2 md:px-3">
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline">Hub</span>
                  </Button>
                </Link>
                {isAdmin && (
                  <Link href="/admin">
                    <Button variant="ghost" size="sm" className="text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 px-2 md:px-3">
                      <Shield className="w-4 h-4 md:mr-2" />
                      <span className="hidden md:inline">Admin</span>
                    </Button>
                  </Link>
                )}
                <Suspense fallback={<div className="w-9 h-9" />}>
                  <AuthButton />
                </Suspense>
              </>
            ) : (
              <WaitlistModal />
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex flex-col items-center px-4 md:px-6 pt-20 md:pt-28 pb-6 md:pb-8 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Trust line */}
          <p className="text-xs md:text-sm text-muted-foreground mb-6 md:mb-8">
            The only tool a YouTuber will ever need
          </p>
          
          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 md:mb-6">
            Stop Creating Videos<br />
            <span className="text-gradient">Without a Plan</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 md:mb-8 px-2">
            Brainstorm ideas, test thumbnails and titles, write scripts, and keep editing notes. Blueprint — a step by step YouTuber Workflow.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 md:px-6 pb-12 md:pb-16 relative z-10">
        <div className="max-w-2xl mx-auto">
          {user ? (
            <div className="flex justify-center">
              <Link href="/hub">
                <Button size="lg" className="glow-primary text-sm md:text-base px-6 md:px-8">
                  Go to Hub
                </Button>
              </Link>
            </div>
          ) : (
            <div className="glass-card p-6 md:p-8">
              <WaitlistForm />
            </div>
          )}
        </div>
      </section>

      {/* Product Demo */}
      <section className="px-4 md:px-6 pb-12 md:pb-16 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl">
            <video 
              src="/demo.mp4" 
              autoPlay
              loop
              muted
              playsInline
              disablePictureInPicture
              controlsList="nodownload noplaybackrate nofullscreen"
              className="w-full no-controls"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="pt-12 md:pt-16 pb-12 md:pb-20 px-4 md:px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12">
            Everything you need to create
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
            {/* Feature Card 1 */}
            <div className="glass-card p-4 md:p-6 hover-lift text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center mb-3 md:mb-4 mx-auto md:mx-0">
                <Lightbulb className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-2">Brainstorming Ideas</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Capture and organize your video ideas. Never lose a good concept again.
              </p>
            </div>
            
            {/* Feature Card 2 */}
            <div className="glass-card p-4 md:p-6 hover-lift text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-3 md:mb-4 mx-auto md:mx-0">
                <Image className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-2">Thumbnail & Title Testing</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Preview how your thumbnails and titles will look in the YouTube feed before publishing.
              </p>
            </div>
            
            {/* Feature Card 3 */}
            <div className="glass-card p-4 md:p-6 hover-lift text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-3 md:mb-4 mx-auto md:mx-0">
                <PenTool className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-2">Storyboard Script Writing</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Write your script and plan visuals side-by-side. Know exactly what to film.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {/* Feature Card 4 */}
            <div className="glass-card p-4 md:p-6 hover-lift text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-3 md:mb-4 mx-auto md:mx-0">
                <FolderKanban className="w-5 h-5 md:w-6 md:h-6 text-green-400" />
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-2">Project Management</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Kanban board with customizable statuses and tasks. Track your videos from idea to published.
              </p>
            </div>
            
            {/* Feature Card 5 */}
            <div className="glass-card p-4 md:p-6 hover-lift text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-3 md:mb-4 mx-auto md:mx-0">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-pink-400" />
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-2">Wiki & Documentation</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Store brand guidelines, templates, and SOPs in your team knowledge base.
              </p>
            </div>
            
            {/* Feature Card 6 */}
            <div className="glass-card p-4 md:p-6 hover-lift text-center md:text-left">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-3 md:mb-4 mx-auto md:mx-0">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-2">Team Collaboration</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                Invite team members, assign tasks, and collaborate in real-time on your content.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Video Demo Section */}
      <section className="py-12 md:py-20 px-4 md:px-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-6 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4">See it in action</h2>
            <p className="text-muted-foreground text-base md:text-lg px-2">
              Watch a quick walkthrough of how Blueprint helps you plan, create, and ship videos faster.
            </p>
          </div>
          
          {/* Video Embed */}
          <div className="relative rounded-2xl overflow-hidden glass-card p-2">
            <div className="relative pt-[56.25%] rounded-xl overflow-hidden">
              <iframe
                className="absolute inset-0 w-full h-full"
                src="https://www.youtube.com/embed/JnSN3s4Ogr4"
                title="Blueprint Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 md:py-8 px-4 md:px-6 border-t border-white/5 relative z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2026 Blueprint</p>
          <div className="flex items-center gap-4 md:gap-6">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
