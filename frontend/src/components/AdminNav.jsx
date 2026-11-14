import { Link } from 'react-router-dom'
import UserNavIcons from './UserNavIcons'
import ReloadButton from './ReloadButton'
import BrandLogo from './BrandLogo'

const AdminNav = () => {
  return (
    <div className='shrink-0 px-4 sm:px-8 lg:px-12 h-16 flex justify-between items-center gap-3 border-b border-[#383838]'>
      <div className='flex gap-2 items-center min-w-0'>
        <Link to='/' title='Home' className='hover:opacity-90 transition-opacity'>
          <BrandLogo size={30} />
        </Link>
        <ReloadButton />
      </div>
      <UserNavIcons />
    </div>
  )
}

export default AdminNav
