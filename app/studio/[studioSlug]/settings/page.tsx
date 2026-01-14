import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Settings as SettingsIcon, 
  Users,
  CreditCard,
  Trash2,
  Upload,
  UserPlus
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

interface SettingsPageProps {
  params: Promise<{ studioSlug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { studioSlug } = await params;
  const supabase = await createClient();

  // TODO: Fetch studio settings and members
  // For now, using placeholder data
  const studio = {
    id: "1",
    name: "My Studio",
    slug: studioSlug,
    description: "",
  };

  const members: any[] = [];

  return (
    <div className="p-8 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your studio settings and team members
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" />
            Members
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <div className="glass-card p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Studio Profile</h3>
              
              {/* Logo Upload */}
              <div className="flex items-start gap-6 mb-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center border border-white/10">
                  <span className="text-3xl font-bold">{studio.name[0]}</span>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" className="gap-2">
                    <Upload className="w-4 h-4" />
                    Upload Logo
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Recommended: 256x256px, PNG or JPG
                  </p>
                </div>
              </div>

              {/* Studio Name */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium">Studio Name</label>
                <Input 
                  defaultValue={studio.name}
                  className="glass max-w-md"
                />
              </div>

              {/* Studio Slug */}
              <div className="space-y-2 mb-4">
                <label className="text-sm font-medium">Studio URL</label>
                <div className="flex items-center gap-2 max-w-md">
                  <span className="text-sm text-muted-foreground">/studio/</span>
                  <Input 
                    defaultValue={studio.slug}
                    className="glass"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea 
                  defaultValue={studio.description}
                  placeholder="Describe your studio..."
                  className="glass max-w-md min-h-[100px]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button className="glow-sm">Save Changes</Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="glass-card p-6 border-red-500/20">
            <h3 className="text-lg font-semibold text-red-500 mb-4">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting your studio is permanent and cannot be undone. All projects,
              documents, and data will be lost.
            </p>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="w-4 h-4" />
              Delete Studio
            </Button>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold">Team Members</h3>
                <p className="text-sm text-muted-foreground">
                  Manage who has access to this studio
                </p>
              </div>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Invite Member
              </Button>
            </div>

            {members.length > 0 ? (
              <div className="space-y-3">
                {members.map((member) => (
                  <div 
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-sm font-medium">
                          {member.email?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{member.name || member.email}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground capitalize px-3 py-1 rounded-full bg-white/5">
                        {member.role}
                      </span>
                      <Button variant="ghost" size="sm">Remove</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No team members yet</p>
                <p className="text-sm text-muted-foreground/70">
                  Invite collaborators to work together
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
            <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20">
              <div>
                <p className="font-semibold text-lg">Free Plan</p>
                <p className="text-sm text-muted-foreground">
                  Basic features for getting started
                </p>
              </div>
              <Button className="glow-primary">Upgrade</Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}