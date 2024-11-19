// pages/api/chatbot.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { message } = await req.json();

    // Vérifier l'authentification
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { 
        status: 401 
      });
    }

    // Appel à Flowise
    const flowiseResponse = await fetch('https://flowiseai-railway-production-1649.up.railway.app/api/v1/prediction/62b0c11f-cd5f-497a-af9a-c28fa99fc9ba', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + Buffer.from('COLDORG:Test_BOT*007!').toString('base64'),
      },
      body: JSON.stringify({ question: message }),
    });

    const botResponse = await flowiseResponse.json();

    // Sauvegarder la question et la réponse
    const { error: dbError } = await supabase
      .from('question_history')
      .insert({
        user_id: session.user.id,
        question: message,
        repondre: botResponse.text,
        created_at: new Date().toISOString()
      });

    if (dbError) throw dbError;

    // Mettre à jour les statistiques utilisateur
    const { error: userUpdateError } = await supabase
      .from('Utilisateurs')
      .update({ 
        questions_used: supabase.sql`questions_used + 1`,
        last_question_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (userUpdateError) throw userUpdateError;

    return new Response(JSON.stringify(botResponse), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Erreur:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500 
    });
  }
}