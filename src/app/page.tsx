import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  // If no auth token exists, send user directly to the login portal
  if (!token) {
    redirect('/login');
  }

  // Parse user role directly from JWT payload to route to the correct screen
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      if (payload.role === 'SUPERVISOR' || payload.role === 'ADMIN') {
        redirect('/supervisor');
      }
    }
  } catch (err) {
    // If token parsing fails, fallback to login
    redirect('/login');
  }

  // Default authenticated student destination
  redirect('/dashboard');
}