import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import type { NextApiRequest, NextApiResponse } from 'next';
import { LRUCache } from 'lru-cache';

// Définition des types pour les requêtes et réponses
interface ChatRequest {
  message: string;
  conversationId?: string;
}

interface ChatResponse {
  text: string;
  conversationId: string;
  error?: string;
}

interface ChatErrorResponse {
  text: string;
  conversationId: string;
  error: string;
}

// Configuration du cache pour le rate limiting
const rateLimit = new LRUCache({
  max: 500, // Nombre maximum d'utilisateurs à suivre
  ttl: 60000, // Durée de vie d'une entrée (1 minute)
});

// Helper pour créer une réponse d'erreur standardisée
const createErrorResponse = (error: string, conversationId: string = ''): ChatErrorResponse => {
  return {
    text: '',
    conversationId,
    error,
  };
};

// Vérifie si un utilisateur a dépassé sa limite de requêtes
const checkRateLimit = (userId: string): boolean => {
  const limit = Number(process.env.NEXT_PUBLIC_RATE_LIMIT_REQUESTS) || 10;
  const current = (rateLimit.get(userId) as number) || 0;
  
  if (current >= limit) {
    return false;
  }
  
  rateLimit.set(userId, current + 1);
  return true;
};

// Gestionnaire principal des requêtes
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChatResponse | ChatErrorResponse>
) {
  // Vérification de la méthode HTTP
  if (req.method !== 'POST') {
    return res.status(405).json(createErrorResponse('Méthode non autorisée'));
  }

  try {
    // Initialisation de la connexion Supabase et vérification de la session
    const supabase = createPagesServerClient({ req, res });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return res.status(401).json(createErrorResponse('Non autorisé'));
    }

    // Vérification du rate limit
    if (!checkRateLimit(session.user.id)) {
      return res.status(429).json(
        createErrorResponse('Limite de requêtes atteinte. Veuillez réessayer plus tard.')
      );
    }

    // Récupération et validation du message
    const { message, conversationId } = req.body as ChatRequest;

    if (!message?.trim()) {
      return res.status(400).json(createErrorResponse('Le message est requis'));
    }

    // Gestion de la conversation
    let activeConversationId: string;

    if (!conversationId) {
      // Création d'une nouvelle conversation
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          user_id: session.user.id,
          title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (conversationError || !newConversation) {
        throw new Error('Erreur lors de la création de la conversation');
      }
      
      activeConversationId = newConversation.id;
    } else {
      activeConversationId = conversationId;
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
      console.error('Erreur mise à jour stats utilisateur:', userError);
    }

    // Appel à l'API Flowise pour obtenir la réponse du chatbot
    const flowiseResponse = await fetch(
      'https://flowiseai-railway-production-1649.up.railway.app/api/v1/prediction/5b404065-4045-448d-9bb9-40e0e492281f',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Basic ' + Buffer.from('COLDORG:Test_BOT007!').toString('base64'),
        },
        body: JSON.stringify({ question: message }),
      }
    );

    if (!flowiseResponse.ok) {
      throw new Error('Erreur API Flowise');
    }

    const botResponse = await flowiseResponse.json();

    // Sauvegarde de la conversation dans l'historique
    const { error: historyError } = await supabase
      .from('question_history')
      .insert({
        user_id: session.user.id,
        conversation_id: activeConversationId,
        question: message,
        answer: botResponse.text,
        created_at: new Date().toISOString()
      });

    if (historyError) {
      console.error('Erreur sauvegarde historique:', historyError);
    }

    // Mise à jour de la date de dernière modification de la conversation
    const { error: updateError } = await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activeConversationId);

    if (updateError) {
      console.error('Erreur mise à jour conversation:', updateError);
    }

    // Incrémentation du compteur de questions de l'utilisateur
    const { error: statsError } = await supabase.rpc('increment_user_questions', {
      user_id: session.user.id
    });

    if (statsError) {
      console.error('Erreur mise à jour compteur:', statsError);
    }

    // Envoi de la réponse au client
    return res.status(200).json({
      text: botResponse.text || "Je n'ai pas compris la question.",
      conversationId: activeConversationId
    });

  } catch (error) {
    console.error('Erreur chatbot:', error);
    
    // Gestion spécifique des erreurs
    if (error instanceof Error) {
      if (error.message.includes('Non autorisé')) {
        return res.status(401).json(
          createErrorResponse('Session expirée. Veuillez vous reconnecter.')
        );
      }
      
      if (error.message.includes('Erreur API Flowise')) {
        return res.status(503).json(
          createErrorResponse('Le service de chat est temporairement indisponible.')
        );
      }
    }

    // Erreur générique
    return res.status(500).json(
      createErrorResponse(
        error instanceof Error 
          ? error.message 
          : 'Une erreur inattendue est survenue'
      )
    );
  }
}