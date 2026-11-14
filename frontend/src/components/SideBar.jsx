import { NavLink } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FolderIcon from '@mui/icons-material/Folder';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';

// Profile is reached from the avatar in the top bar, so it isn't listed here
const links = [
  { to: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, end: true },
  { to: '/tasks', label: 'All Tasks', icon: <FolderIcon />, end: true },
  { to: '/tasks/add', label: 'Add Task', icon: <CreateNewFolderIcon /> },
];

const linkClass = ({ isActive }) =>
  `transition-colors group relative flex flex-col items-center ${
    isActive ? 'text-white' : 'text-gray-400 hover:text-white'
  }`;

// Vertical rail on tablet/desktop, fixed bottom bar on phones
const SideBar = () => {
  return (
    <>
      {/* Desktop / tablet */}
      <nav className='hidden sm:flex shrink-0 w-[60px] self-center flex-col items-center gap-6 py-12 rounded-r-full bg-white/5 border border-l-0 border-white/10'>
        <div className="flex flex-col items-center gap-6">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={linkClass} title={l.label}>
              {l.icon}
              <span className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                {l.label}
              </span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Phone bottom nav */}
      <nav className='sm:hidden fixed bottom-0 inset-x-0 z-40 bg-[#1f1f1f]/95 backdrop-blur border-t border-[#383838] flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]'>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
            {l.icon}
            <span className="text-[10px] mt-0.5">{l.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
export default SideBar
