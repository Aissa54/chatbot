// pages/api/chatbot.ts
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';
import { LRUCache } from 'lru-cache';

// Types
interface ChatResponse {
  text: string;
  error?: string;
}

interface User {
  id: string;
  email: string;
  questions_used: number;
  last_question_date: string;
  created_at: string;
  updated_at: string;
}

// Configuration du cache pour le rate limiting
const rateLimit = new LRUCache({
  max: 500,
  ttl: 60 * 1000, // 1 minute
});

// Vérification du rate limit par utilisateur
const checkRateLimit = (userId: string): boolean => {
  const userRequests = rateLimit.get(userId) as number || 0;
  if (userRequests >= 10) return false; // 10 requêtes par minute maximum
  rateLimit.set(userId, userRequests + 1);
  return true;
};

// Validation des variables d'environnement
const validateEnv = () => {
  const required = ['FLOWISE_API_KEY', 'FLOWISE_URL'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
};

// Fonction principale de l'API
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse>
) {
  // Vérification de la méthode HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      text: '',
      error: 'Method not allowed' 
    });
  }

  try {
    // Validation des variables d'environnement
    validateEnv();

    // Initialisation de Supabase
    const supabase = createPagesServerClient({ req, res });

    // Vérification de la session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Unauthorized');
    }

    // Vérification du rate limit
    if (!checkRateLimit(session.user.id)) {
      return res.status(429).json({
        text: '',
        error: 'Too many requests. Please try again later.'
      });
    }

    // Validation du message
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({
        text: '',
        error: 'Message is required'
      });
    }

    // Mise à jour ou création de l'utilisateur
    const { data: user, error: userError } = await supabase
      .from('users')
      .upsert({
        id: session.user.id,
        email: session.user.email,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })
      .select('questions_used')
      .single();

    if (userError) {
      console.error('User upsert error:', userError);
      throw new Error('Error updating user data');
    }

    // Appel à l'API Flowise
    const flowiseResponse = await fetch(process.env.FLOWISE_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FLOWISE_API_KEY}`,
      },
      body: JSON.stringify({ question: message }),
    });

    if (!flowiseResponse.ok) {
      throw new Error('Flowise API error');
    }

    const botResponse = await flowiseResponse.json();

    // Enregistrement de l'interaction dans la base de données
    const { error: historyError } = await supabase.rpc('handle_chat_interaction', {
      p_user_id: session.user.id,
      p_question: message,
      p_answer: botResponse.text
    });

    if (historyError) {
      console.error('History error:', historyError);
      // On continue malgré l'erreur d'historique pour ne pas bloquer la réponse
    }

    // Mise à jour des statistiques utilisateur
    const { error: statsError } = await supabase
      .from('users')
      .update({
        questions_used: (user?.questions_used || 0) + 1,
        last_question_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user.id);

    if (statsError) {
      console.error('Stats update error:', statsError);
      // On continue malgré l'erreur de stats pour ne pas bloquer la réponse
    }

    // Envoi de la réponse
    return res.status(200).json({
      text: botResponse.text
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    
    // Gestion des erreurs spécifiques
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return res.status(401).json({
          text: '',
          error: 'Please log in to continue'
        });
      }
      
      if (error.message.includes('Missing environment')) {
        return res.status(500).json({
          text: '',
          error: 'Server configuration error'
        });
      }
    }

    // Erreur générique
    return res.status(500).json({
      text: '',
      error: 'An unexpected error occurred. Please try again later.'
    });
  }
}