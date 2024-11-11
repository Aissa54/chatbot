// pages/api/auth/callback.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createServerSupabaseClient({ req, res });
    const code = req.query.code as string;

    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
      res.redirect('/');
    } else {
      throw new Error('No code provided');
    }
  } catch (error) {
    console.error('Callback error:', error);
    res.redirect('/login?error=callback_failed');
  }
}