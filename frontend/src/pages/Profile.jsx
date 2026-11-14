import { useContext, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Pencil, Sparkles } from 'lucide-react'
import { UserContext } from '../context/UserContext'
import { TaskContext } from '../context/BillContext'
import { getErrorMessage } from '../utils/apiClient'
import Layout from '../components/Layout'

const inputClass = 'glass-input w-full px-4 py-2.5 rounded-lg'

function Status({ msg }) {
  if (!msg.text) return null
  return (
    <p className={`text-sm ${msg.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>{msg.text}</p>
  )
}

export default function Profile() {
  const { user, updateProfile, uploadAvatar, removeAvatar } = useContext(UserContext)
  const { tasks, getTaskStats } = useContext(TaskContext)
  const stats = getTaskStats()

  const [profile, setProfile] = useState({ name: '', email: '', gender: 'male', bio: '' })

  const fileInputRef = useRef(null)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState({ type: '', text: '' })
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' })
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        gender: user.gender || 'male',
        bio: user.bio || '',
      })
    }
  }, [user])

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setAvatarMsg({ type: 'error', text: 'Please choose an image file' })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarMsg({ type: 'error', text: 'Image is too large (max 2 MB)' })
      return
    }
    setAvatarBusy(true)
    setAvatarMsg({ type: '', text: '' })
    try {
      await uploadAvatar(file)
      setAvatarMsg({ type: 'success', text: 'Profile photo updated' })
    } catch (err) {
      setAvatarMsg({ type: 'error', text: getErrorMessage(err, 'Upload failed') })
    } finally {
      setAvatarBusy(false)
    }
  }

  const handleAvatarRemove = async () => {
    setAvatarBusy(true)
    setAvatarMsg({ type: '', text: '' })
    try {
      await removeAvatar()
      setAvatarMsg({ type: 'success', text: 'Profile photo removed' })
    } catch (err) {
      setAvatarMsg({ type: 'error', text: getErrorMessage(err, 'Could not remove photo') })
    } finally {
      setAvatarBusy(false)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg({ type: '', text: '' })
    try {
      await updateProfile(profile)
      setProfileMsg({ type: 'success', text: 'Profile updated' })
    } catch (err) {
      setProfileMsg({ type: 'error', text: getErrorMessage(err, 'Update failed') })
    } finally {
      setSavingProfile(false)
    }
  }

  if (!user) return null

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : ''

  const profileStats = [
    { label: 'Tasks', value: tasks.length },
    { label: 'Completed', value: stats.completed },
    { label: 'Logged', value: `${stats.totalHoursLogged}h` },
  ]

  return (
    <Layout>
      <div className='max-w-5xl mx-auto space-y-6'>
        {/* Header card: avatar, details and stats stacked and centered */}
        <div className='glass-card rounded-2xl p-5 sm:p-6 flex flex-col items-center text-center gap-5'>
          {/* Avatar with pencil button to change the photo */}
          <div className='flex flex-col items-center gap-2 shrink-0'>
            <div className='relative w-24 h-24'>
              <img src={user.avatar} alt={user.name} className='w-24 h-24 rounded-full object-cover border-2 border-white/15 bg-[#3f3f46]' />
              {avatarBusy && (
                <div className='absolute inset-0 rounded-full bg-black/60 flex items-center justify-center'>
                  <Loader2 size={22} className='animate-spin' />
                </div>
              )}
              <button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarBusy}
                title='Change profile photo'
                aria-label='Change profile photo'
                className='absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white hover:bg-zinc-200 text-[#0B0B0C] border-2 border-[#2A2A2A] flex items-center justify-center shadow-lg transition-colors disabled:opacity-60'
              >
                <Pencil size={14} />
              </button>
              <input
                ref={fileInputRef}
                type='file'
                accept='image/png,image/jpeg,image/webp,image/gif'
                onChange={handleAvatarChange}
                className='hidden'
              />
            </div>
            {user.hasCustomAvatar && !avatarBusy && (
              <button type='button' onClick={handleAvatarRemove} className='text-xs text-gray-400 hover:text-red-400 transition-colors'>
                Remove photo
              </button>
            )}
            <Status msg={avatarMsg} />
          </div>

          <div className='min-w-0 max-w-xl'>
            <p className='font-bold text-2xl break-words'>{user.name}</p>
            <p className='text-sm text-gray-300 break-all'>{user.email}</p>
            {user.bio && <p className='text-sm text-gray-300 mt-2'>{user.bio}</p>}
            {memberSince && <p className='text-xs text-gray-400 mt-2'>Member since {memberSince}</p>}
            <Link
              to='/billing'
              className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                user.isPremium
                  ? 'bg-emerald-400/15 text-emerald-300 border-emerald-400/40 hover:bg-emerald-400/25'
                  : 'bg-white/5 text-gray-200 border-white/15 hover:bg-white/10'
              }`}
            >
              <Sparkles size={12} />
              {user.complimentary
                ? 'Premium (complimentary)'
                : user.isPremium ? 'Premium plan · Manage' : 'Free plan · Upgrade to Premium'}
            </Link>
          </div>

          <div className='grid grid-cols-3 gap-3 text-center w-full max-w-md'>
            {profileStats.map((s) => (
              <div key={s.label} className='rounded-xl bg-white/5 border border-white/10 px-4 py-3'>
                <p className='text-xl font-bold'>{s.value}</p>
                <p className='text-xs text-gray-400'>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Edit profile */}
        <form onSubmit={handleProfileSubmit} className='glass-card rounded-2xl p-5 sm:p-6 space-y-4'>
          <h3 className='text-xl font-bold text-center'>Edit Profile</h3>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm text-gray-300 mb-1'>Name</label>
              <input className={inputClass} value={profile.name} required
                onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
            </div>
            <div>
              <label className='block text-sm text-gray-300 mb-1'>Gender</label>
              <select className={inputClass} value={profile.gender}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}>
                <option value='male'>Male</option>
                <option value='female'>Female</option>
                <option value='other'>Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className='block text-sm text-gray-300 mb-1'>Email</label>
            <input type='email' className={inputClass} value={profile.email} required
              onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </div>
          <div>
            <label className='block text-sm text-gray-300 mb-1'>Bio</label>
            <textarea rows='3' maxLength={300} className={`${inputClass} resize-none`} value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })} />
          </div>
          <div className='flex flex-col items-center gap-2 text-center'>
            <Status msg={profileMsg} />
            <button type='submit' disabled={savingProfile} className='btn-primary'>
              {savingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
