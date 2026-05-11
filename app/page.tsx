import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect user to Dashboard immediately
  redirect('/dashboard');
}