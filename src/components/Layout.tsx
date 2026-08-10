import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col scanlines">
      {/* Top bar */}
      <header className="border-b border-cyan-500/30 bg-black/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="font-orbitron text-lg neon-text-cyan tracking-widest">
              NEON<span className="text-purple-400">//</span>TRACKER
            </h1>
            <nav className="flex gap-1">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `px-4 py-1.5 text-xs tracking-wider uppercase transition-all ${
                    isActive
                      ? 'neon-text-cyan border-b-2 border-cyan-400'
                      : 'text-gray-400 hover:text-cyan-300'
                  }`
                }
              >
                Tasks
              </NavLink>
              <NavLink
                to="/timesheet"
                className={({ isActive }) =>
                  `px-4 py-1.5 text-xs tracking-wider uppercase transition-all ${
                    isActive
                      ? 'neon-text-purple border-b-2 border-purple-400'
                      : 'text-gray-400 hover:text-purple-300'
                  }`
                }
              >
                Timesheet
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-cyan-600/80 hidden sm:inline">
              {user?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="text-xs text-red-400/80 hover:text-red-300 tracking-wider uppercase"
            >
              Disconnect
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-cyan-900/40 py-3 text-center text-[10px] text-cyan-800 tracking-widest">
        NEON TASK SYSTEM • PRIVATE ACCESS ONLY • NO MUTE PROTOCOL ACTIVE
      </footer>
    </div>
  );
}
