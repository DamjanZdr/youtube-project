import { AuthButton } from "@/components/auth-button";
import { Button } from "@/components/ui/button";
import { hasEnvVars } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Suspense } from "react";
import { Play, Sparkles, Layout, Eye, FolderKanban, FileText, Users } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  return (
    <main className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center h-16 px-2">
            <img
              src="/bplogo.png"
              alt="Logo"
              className="max-h-12 object-contain bg-white/0"
              style={{ boxShadow: "0 2px 8px 0 rgba(8, 138, 250, 0.08)", width: 'auto', height: '100%' }}
            />
          </Link>
          <div className="flex items-center gap-4">
            {hasEnvVars && (
              <Suspense fallback={<div className="w-20 h-9" />}>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-20">
        {/* Background gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">The all-in-one creator OS</span>
          </div>
          
          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Plan, Script, and<br />
            <span className="text-gradient">Ship Videos Faster</span>
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            The operating system for YouTube creators. Manage projects with Kanban boards, 
            write scripts with storyboards, and preview how your videos will look before publishing.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {user ? (
              <Link href="/hub">
                <Button size="lg" className="glow-primary text-base px-8">
                  Go to Hub
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/sign-up">
                  <Button size="lg" className="glow-primary text-base px-8">
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="text-base px-8 glass">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Everything you need to create
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            {/* Feature Card 1 */}
            <div className="glass-card p-6 hover-lift">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
                <Layout className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Kanban Board</h3>
              <p className="text-muted-foreground">
                Track your videos from idea to published. Drag and drop projects between stages.
              </p>
            </div>
            
            {/* Feature Card 2 */}
            <div className="glass-card p-6 hover-lift">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Storyboard Editor</h3>
              <p className="text-muted-foreground">
                Write your script and plan visuals side-by-side. Know exactly what to film.
              </p>
            </div>
            
            {/* Feature Card 3 */}
            <div className="glass-card p-6 hover-lift">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Thumbnail Preview</h3>
              <p className="text-muted-foreground">
                See how your video will look in the YouTube feed before you publish.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature Card 4 */}
            <div className="glass-card p-6 hover-lift">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center mb-4">
                <FolderKanban className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Project Management</h3>
              <p className="text-muted-foreground">
                Organize multiple videos at once with custom workflows and task automation.
              </p>
            </div>
            
            {/* Feature Card 5 */}
            <div className="glass-card p-6 hover-lift">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-pink-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Wiki & Documentation</h3>
              <p className="text-muted-foreground">
                Store brand guidelines, templates, and SOPs in your team knowledge base.
              </p>
            </div>
            
            {/* Feature Card 6 */}
            <div className="glass-card p-6 hover-lift">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Team Collaboration</h3>
              <p className="text-muted-foreground">
                Invite team members, assign tasks, and collaborate in real-time on your content.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <p>© 2026 myBlueprint</p>
          <div className="flex items-center gap-6">
            <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
