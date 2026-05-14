import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function AppShell({ sidebarGroups, title, topbarProps, children }) {
  return (
    <div className="min-h-screen bg-page text-main">
      <div className="min-h-screen lg:flex">
        <Sidebar items={sidebarGroups} subtitle="Menu" />
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-8 lg:py-6">
          <Topbar title={title} {...topbarProps} />
          <div className="mt-7">{children}</div>
        </main>
      </div>
    </div>
  );
}

export default AppShell;
