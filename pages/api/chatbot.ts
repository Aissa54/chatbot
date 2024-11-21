import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

interface User {
  id: string;
  email: string;
  name?: string | null;
  stripe_customer_id?: string | null;
  questions_used: number;
  last_question_date: string;
  created_at: string;
  updated_at: string;
}

interface QuestionHistory {
  id?: string;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createPagesServerClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    const { message } = req.body;

    // Vérifier/Créer l'utilisateur
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (userError && userError.code === 'PGRST116') {
      // L'utilisateur n'existe pas, le créer
      const newUser: Partial<User> = {
        id: session.user.id,
        email: session.user.email || '',
        questions_used: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: createError } = await supabase
        .from('users')
        .insert(newUser);

      if (createError) throw createError;
    } else if (userError) {
      throw userError;
    }

    // Appel à Flowise
    const flowiseResponse = await fetch(
      'https://flowiseai-railway-production-1649.up.railway.app/api/v1/prediction/62b0c11f-cd5f-497a-af9a-c28fa99fc9ba',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from('COLDORG:Test_BOT*007!').toString('base64'),
        },
        body: JSON.stringify({ question: message }),
      }
    );

    const botResponse = await flowiseResponse.json();

    // Sauvegarder dans l'historique
    const historyEntry: QuestionHistory = {
      user_id: session.user.id,
      question: message,
      answer: botResponse.text,
      created_at: new Date().toISOString()
    };

    const { error: historyError } = await supabase
      .from('question_history')
      .insert(historyEntry);

    if (historyError) throw historyError;

    // Mettre à jour les statistiques de l'utilisateur
    const { error: updateError } = await supabase
      .from('users')
      .update({
        questions_used: (user?.questions_used || 0) + 1,
        last_question_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (updateError) throw updateError;

    return res.status(200).json(botResponse);

  } catch (error) {
    console.error('Erreur:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    });
  }
}