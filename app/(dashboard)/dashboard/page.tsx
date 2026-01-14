/**
 * Dashboard Home Page
 */

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to YouTuber Studio. Manage your content from here.
        </p>
      </div>
      
      {/* TODO: Add dashboard widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Stats cards will go here */}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent projects and activity will go here */}
      </div>
    </div>
  );
}
