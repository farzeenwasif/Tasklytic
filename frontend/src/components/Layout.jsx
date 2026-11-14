import '../App.css'
import AdminNav from './AdminNav'
import SideBar from './SideBar'

// Shared page shell: full-screen on phones, framed card on larger screens.
export default function Layout({ title, children }) {
  return (
    <div className='bg-img w-full h-dvh overflow-hidden text-white flex justify-center items-center sm:p-5'>
      <div className='relative z-10 w-full h-full max-w-[1400px] bg-[#1f1f22]/70 sm:rounded-3xl sm:border sm:border-white/10 shadow-2xl shadow-black/40 flex flex-col overflow-hidden'>
        <AdminNav />
        <div className='flex flex-1 min-h-0'>
          <SideBar />
          {/* pb-24 leaves room for the mobile bottom nav */}
          <main className='flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 pt-4 pb-24 sm:px-8 sm:pb-8'>
            {/* each page fades up when it opens (CSS, so no transform is left behind to trap fixed modals) */}
            <div className='page-enter'>
              {title && <h1 className='text-white text-2xl sm:text-3xl font-bold mb-6'>{title}</h1>}
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
