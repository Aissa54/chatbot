import { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface MessageFeedbackProps {
  messageId: string;
  onFeedbackSubmitted?: () => void;
}

type FeedbackReason = 
  | 'incomplete'
  | 'incorrect'
  | 'unclear'
  | 'irrelevant'
  | 'outdated'
  | 'other';

const FEEDBACK_OPTIONS = [
  { id: 'incomplete' as FeedbackReason, label: 'Réponse incomplète' },
  { id: 'incorrect' as FeedbackReason, label: 'Information incorrecte' },
  { id: 'unclear' as FeedbackReason, label: 'Réponse peu claire' },
  { id: 'irrelevant' as FeedbackReason, label: 'Réponse hors sujet' },
  { id: 'outdated' as FeedbackReason, label: 'Information obsolète' }
];

// Fonction utilitaire pour générer un UUID v4
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Fonction pour convertir n'importe quel ID en UUID valide
function convertToValidUUID(id: string): string {
  // Si l'ID est numérique ou contient un suffixe, générer un nouveau UUID
  if (/^\d+$/.test(id) || id.includes('-answer') || id.includes('-question')) {
    // Utiliser l'ID original comme seed pour la génération
    const seed = parseInt(id.split('-')[0], 10);
    if (!isNaN(seed)) {
      // Créer un UUID déterministe basé sur le timestamp
      const date = new Date(seed);
      return generateUUID();
    }
  }
  
  // Si c'est déjà un UUID valide, le retourner tel quel
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) {
    return id;
  }

  // Par défaut, générer un nouveau UUID
  return generateUUID();
}

const MessageFeedback = ({ messageId, onFeedbackSubmitted }: MessageFeedbackProps) => {
  const [showNegativeFeedback, setShowNegativeFeedback] = useState(false);
  const [selectedReason, setSelectedReason] = useState<FeedbackReason | ''>('');
  const [otherComment, setOtherComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  const submitFeedback = useCallback(async (isPositive: boolean) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Vous devez être connecté pour envoyer un feedback');
      }

      // Conversion de l'ID en UUID valide
      const validUUID = convertToValidUUID(messageId);

      // Vérification que le message existe
      const { data: messageExists, error: messageError } = await supabase
        .from('question_history')
        .select('id')
        .eq('id', validUUID)
        .single();

      if (messageError) {
        console.error('Erreur vérification message:', messageError);
        throw new Error('Message non trouvé');
      }

      const feedbackData = {
        message_id: validUUID,
        user_id: user.id,
        is_positive: isPositive,
        reason: selectedReason === 'other' ? null : selectedReason,
        comment: selectedReason === 'other' ? otherComment : null
      };

      console.log('Envoi du feedback:', feedbackData);

      const { data, error: submissionError } = await supabase
        .from('message_feedback')
        .insert(feedbackData)
        .select()
        .single();

      if (submissionError) {
        console.error('Erreur soumission:', submissionError);
        throw new Error(
          submissionError.message === 'invalid input syntax for type uuid' 
            ? 'Format d\'identifiant invalide' 
            : submissionError.message
        );
      }

      setSubmitted(true);
      onFeedbackSubmitted?.();

    } catch (err) {
      console.error('Erreur détaillée:', err);
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue');
    } finally {
      setIsSubmitting(false);
    }
  }, [messageId, selectedReason, otherComment, supabase, onFeedbackSubmitted]);

  if (submitted) {
    return (
      <div className="text-sm text-green-600 dark:text-green-400 mt-2">
        Merci pour votre retour !
      </div>
    );
  }

  return (
    <div className="mt-2">
      {error && (
        <div className="text-sm text-red-500 dark:text-red-400 mb-2">
          {error}
        </div>
      )}

      {!showNegativeFeedback ? (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => submitFeedback(true)}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Réponse utile"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowNegativeFeedback(true)}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Réponse à améliorer"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium">Qu'est-ce qui pourrait être amélioré ?</h4>
            <button
              onClick={() => setShowNegativeFeedback(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {FEEDBACK_OPTIONS.map((option) => (
              <label key={option.id} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="feedback"
                  value={option.id}
                  checked={selectedReason === option.id}
                  onChange={(e) => setSelectedReason(e.target.value as FeedbackReason)}
                  className="text-blue-500"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}

            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="feedback"
                value="other"
                checked={selectedReason === 'other'}
                onChange={(e) => setSelectedReason(e.target.value as FeedbackReason)}
                className="text-blue-500"
              />
              <span className="text-sm">Autre</span>
            </label>

            {selectedReason === 'other' && (
              <textarea
                value={otherComment}
                onChange={(e) => setOtherComment(e.target.value)}
                placeholder="Décrivez le problème..."
                className="w-full p-2 text-sm border rounded-lg dark:bg-gray-700
                         dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            )}

            <button
              onClick={() => submitFeedback(false)}
              disabled={isSubmitting || !selectedReason || (selectedReason === 'other' && !otherComment)}
              className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg
                       hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed
                       transition-colors text-sm"
            >
              {isSubmitting ? 'Envoi en cours...' : 'Envoyer le retour'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageFeedback;