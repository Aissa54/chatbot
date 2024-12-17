// components/admin/AdminLink.tsx
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';

const AdminLink = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/check-admin', {
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      if (!res.ok) throw new Error('Erreur de vérification admin');
      
      const data = await res.json();
      setIsAdmin(data.isAdmin);
    } catch (error) {
      console.error('Erreur de vérification admin:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  if (isLoading || !isAdmin) return null;

  return (
    <Link
      href="/admin"
      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium 
                 text-white bg-blue-600 rounded-md hover:bg-blue-700 
                 transition-colors duration-200"
    >
      <Settings className="w-4 h-4" />
      <span>Administration</span>
    </Link>
  );
};

export default AdminLink;