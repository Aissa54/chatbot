import { useEffect, useState } from 'react';
import Link from 'next/link';

const AdminLink = () => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch('/api/check-admin');
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      } catch (error) {
        console.error('Error:', error);
        setIsAdmin(false);
      }
    };
    
    checkAdmin();
  }, []);

  if (!isAdmin) return null;

  return (
    <Link 
      href="/admin" 
      className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
    >
      Administration
    </Link>
  );
};

export default AdminLink;