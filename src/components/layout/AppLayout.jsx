import { useSelector } from 'react-redux';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { BottomNav } from './BottomNav';

export const AppLayout = () => {
  const { sidebarOpen } = useSelector((s) => s.ui);

  return (
    <div className="flex h-dvh overflow-hidden bg-bg-primary">
      <Sidebar isOpen={sidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 pb-28 md:p-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
};
