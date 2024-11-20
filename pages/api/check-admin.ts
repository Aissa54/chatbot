import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { NextApiRequest, NextApiResponse } from 'next';

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || ['aissa.moustaine@gmail.com'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ 
        isAdmin: false,
        message: 'Not authenticated'
      });
    }

    const isAdmin = ADMIN_EMAILS.includes(session.user.email || '');
    
    return res.status(200).json({ 
      isAdmin,
      email: session.user.email 
    });
  } catch (error) {
    console.error('Error in check-admin:', error);
    return res.status(500).json({ 
      isAdmin: false,
      error: 'Internal server error'
    });
  }
}