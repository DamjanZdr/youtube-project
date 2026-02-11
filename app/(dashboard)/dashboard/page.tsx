/**
 * Dashboard Home Page
 */

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4 md:gap-6 p-4 md:p-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Welcome to Blueprint. Manage your content from here.
        </p>
      </div>
      
      {/* TODO: Add dashboard widgets */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Stats cards will go here */}
      </div>
      
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        {/* Recent projects and activity will go here */}
      </div>
    </div>
  );
}
