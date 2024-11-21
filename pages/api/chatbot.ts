import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Créer le client Supabase
    const supabase = createPagesServerClient({ req, res });

    // Vérifier l'authentification
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Récupérer le message du body
    const { message } = req.body;

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
    const { error: historyError } = await supabase
      .from('question_history')
      .insert({
        user_id: session.user.id,
        question: message,
        answer: botResponse.text, // Changé de 'repondre' à 'answer'
        created_at: new Date().toISOString(),
      });

    if (historyError) throw historyError;

    // Mettre à jour les stats utilisateur
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('questions_used')
      .eq('id', session.user.id)
      .single();

    if (fetchError) throw fetchError;

    const newQuestionCount = (userData?.questions_used || 0) + 1;

    const { error: updateError } = await supabase
      .from('users')
      .update({
        questions_used: newQuestionCount,
        last_question_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id);

    if (updateError) throw updateError;

    return res.status(200).json({
      ...botResponse,
      questionsUsed: newQuestionCount,
    });

  } catch (error) {
    console.error('Erreur:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Une erreur est survenue',
    });
  }
}