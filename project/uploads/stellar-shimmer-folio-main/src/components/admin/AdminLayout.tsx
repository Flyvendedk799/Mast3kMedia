import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, FolderKanban, User, Briefcase, Link2, LogOut, Home, Menu, X, FileText } from 'lucide-react';
import FloatingOrbs from '@/components/FloatingOrbs';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/admin/blog', icon: FileText, label: 'Insights' },
  { to: '/admin/about', icon: User, label: 'About' },
  { to: '/admin/experience', icon: Briefcase, label: 'Experience' },
  { to: '/admin/contact', icon: Link2, label: 'Contact' },
];

const AdminLayout = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const sidebar = (
    <>
      <div className="p-6 border-b border-border flex items-center justify-between">
        <div>
          <span className="text-xl font-bold gradient-text font-mono">T</span>
          <span className="text-sm text-muted-foreground ml-2">Admin</span>
        </div>
        <button onClick={() => setMobileOpen(false)} className="md:hidden text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-primary/15 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-1">
        <button
          onClick={() => { navigate('/'); setMobileOpen(false); }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all w-full"
        >
          <Home size={18} /> View Portfolio
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all w-full"
        >
          <LogOut size={18} /> Sign Out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex relative overflow-hidden">
      <FloatingOrbs />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar - desktop */}
      <aside className="hidden md:flex relative z-10 w-64 glass-strong border-r border-border flex-col shrink-0">
        {sidebar}
      </aside>

      {/* Sidebar - mobile */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 glass-strong border-r border-border flex flex-col transition-transform duration-300 md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebar}
      </aside>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 p-4 border-b border-border glass-strong">
          <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu size={22} />
          </button>
          <span className="text-sm font-semibold gradient-text font-mono">Admin</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
