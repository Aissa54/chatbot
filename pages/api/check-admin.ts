import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Créer le client Supabase avec les variables d'environnement
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Récupérer le token d'authentification de l'en-tête
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Token d\'authentification manquant',
        isAdmin: false
      });
    }

    // Vérifier la session avec le token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Non autorisé',
        isAdmin: false
      });
    }

    // Vérifier si l'utilisateur est admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    const isAdmin = adminEmails.includes(user.email || '');

    return res.status(200).json({
      isAdmin,
      email: user.email
    });

  } catch (error) {
    console.error('Error in check-admin:', error);
    return res.status(500).json({
      error: 'Erreur interne du serveur',
      isAdmin: false
    });
  }
}