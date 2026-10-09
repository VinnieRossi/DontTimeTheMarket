import { redirect } from 'next/navigation'

/** The example feature is the only screen, so the root goes straight to it. */
export default function HomePage() {
  redirect('/notes')
}
