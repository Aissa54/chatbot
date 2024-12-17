import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Vérification de la méthode HTTP
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    // Création du client Supabase avec les variables d'environnement
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Récupération du token depuis l'en-tête Authorization
    const token = req.headers.authorization?.split('Bearer ')[1] || '';

    // Vérification de la session utilisateur avec le token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Non autorisé',
        isAdmin: false
      });
    }

    // Vérification si l'utilisateur est administrateur
    const isAdmin = user.email === process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',')[0];

    // Réponse avec le statut d'admin
    return res.status(200).json({ isAdmin });
  } catch (error) {
    console.error('Erreur check-admin:', error);
    return res.status(500).json({
      error: 'Erreur serveur',
      isAdmin: false
    });
  }
}
