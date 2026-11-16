import { useContext } from 'react'
import { LifeBuoy } from 'lucide-react'
import Layout from '../components/Layout'
import ContactForm from '../components/ContactForm'
import { UserContext } from '../context/UserContext'

// In-app help: same form as the landing page, with the user's name and email filled in
export default function Help() {
  const { user } = useContext(UserContext)
  return (
    <Layout>
      <div className='max-w-2xl mx-auto space-y-6'>
        <div>
          <h1 className='text-white text-2xl sm:text-3xl font-bold flex items-center gap-2'>
            <LifeBuoy size={26} className='text-emerald-300' /> Help & support
          </h1>
          <p className='text-gray-400 text-sm mt-1'>Stuck, found a bug, or have an idea? Send us a message and we will reply by email.</p>
        </div>
        <section className='glass-card rounded-2xl p-5 sm:p-6'>
          <ContactForm name={user?.name || ''} email={user?.email || ''} />
        </section>
      </div>
    </Layout>
  )
}
