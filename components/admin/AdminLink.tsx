// components/admin/AdminLink.tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Settings } from 'lucide-react';

const ADMIN_EMAILS = ['aissa.moustaine@gmail.com'];

export function AdminLink() {
  const [isAdmin, setIsAdmin] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAdmin(session && ADMIN_EMAILS.includes(session.user.email || ''));
    };

    checkAdmin();
  }, [supabase.auth]);

  if (!isAdmin) return null;

  return (
    <button
      onClick={() => window.location.href = '/admin/history'}
      className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 
                dark:hover:bg-gray-700 rounded-full transition-colors"
      title="Administration"
    >
      <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
    </button>
  );
}

export default AdminLink;