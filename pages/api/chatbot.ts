// pages/api/chatbot.ts
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';
import { LRUCache } from 'lru-cache';

// Types
interface ChatResponse {
  text: string;
  error?: string;
}

interface ChatRequest {
  message: string;
}

// Configuration du rate limiting
const rateLimit = new LRUCache({
  max: 500,
  ttl: 60000, // 1 minute
});

// Vérification des variables d'environnement
const validateEnv = () => {
  const required = [
    'NEXT_PUBLIC_FLOWISE_API_KEY',
    'NEXT_PUBLIC_FLOWISE_URL'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
};

// Vérification du rate limit
const checkRateLimit = (userId: string): boolean => {
  const limit = Number(process.env.NEXT_PUBLIC_RATE_LIMIT_REQUESTS) || 10;
  const current = (rateLimit.get(userId) as number) || 0;
  
  if (current >= limit) {
    return false;
  }
  
  rateLimit.set(userId, current + 1);
  return true;
};

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
    const { data: { session } } = await supabase.auth.getSession();

    // Vérification de l'authentification
    if (!session) {
      return res.status(401).json({ 
        text: '', 
        error: 'Unauthorized' 
      });
    }

    // Vérification du rate limit
    if (!checkRateLimit(session.user.id)) {
      return res.status(429).json({
        text: '',
        error: 'Rate limit exceeded. Please try again later.'
      });
    }

    // Validation du message
    const { message } = req.body as ChatRequest;
    if (!message?.trim()) {
      return res.status(400).json({ 
        text: '', 
        error: 'Message is required' 
      });
    }

    // Mise à jour des statistiques utilisateur
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: session.user.id,
        email: session.user.email,
        questions_used: 0,
        last_question_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (userError) {
      console.error('User stats update error:', userError);
    }

    // Appel à l'API Flowise
    const flowiseResponse = await fetch(process.env.NEXT_PUBLIC_FLOWISE_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_FLOWISE_API_KEY}`,
      },
      body: JSON.stringify({ question: message }),
    });

    if (!flowiseResponse.ok) {
      throw new Error('Flowise API error');
    }

    const flowiseData = await flowiseResponse.json();

    // Enregistrement dans l'historique
    const { error: historyError } = await supabase
      .from('question_history')
      .insert({
        user_id: session.user.id,
        question: message,
        answer: flowiseData.text,
        created_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('History save error:', historyError);
    }

    // Mise à jour du compteur de questions
    const { error: statsError } = await supabase.rpc('increment_user_questions', {
      user_id: session.user.id
    });

    if (statsError) {
      console.error('Stats update error:', statsError);
    }

    // Envoi de la réponse
    return res.status(200).json({
      text: flowiseData.text || "Je n'ai pas compris la question."
    });

  } catch (error) {
    console.error('Chatbot error:', error);
    
    // Gestion des différents types d'erreurs
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized')) {
        return res.status(401).json({
          text: '',
          error: 'Session expirée. Veuillez vous reconnecter.'
        });
      }
      
      if (error.message.includes('Missing environment')) {
        return res.status(500).json({
          text: '',
          error: 'Erreur de configuration du serveur'
        });
      }
    }

    // Erreur générique
    return res.status(500).json({
      text: '',
      error: 'Une erreur inattendue est survenue. Veuillez réessayer.'
    });
  }
}