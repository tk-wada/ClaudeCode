import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user) {
    redirect('/')
  }

  return <AdminClient />
}
