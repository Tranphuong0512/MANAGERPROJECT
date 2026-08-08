import { redirect } from 'next/navigation'

export default function Page() {
  // Redirect to login by default
  // Users will be redirected to dashboard if already authenticated
  redirect('/login')
}
