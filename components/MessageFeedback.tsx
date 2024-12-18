import { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// Définition des types pour les propriétés du composant
interface MessageFeedbackProps {
  messageId: string;
  onFeedbackSubmitted?: () => void;
}

// Types pour les raisons de feedback négatif
type FeedbackReason = 
  | 'incomplete'
  | 'incorrect'
  | 'unclear'
  | 'irrelevant'
  | 'outdated'
  | 'unknown'    // Ajout du nouveau type
  | 'other';

// Options prédéfinies pour les feedbacks négatifs
const FEEDBACK_OPTIONS = [
  { id: 'incomplete' as FeedbackReason, label: 'Réponse incomplète' },
  { id: 'incorrect' as FeedbackReason, label: 'Information incorrecte' },
  { id: 'unclear' as FeedbackReason, label: 'Réponse peu claire' },
  { id: 'irrelevant' as FeedbackReason, label: 'Réponse hors sujet' },
  { id: 'outdated' as FeedbackReason, label: 'Information obsolète' },
  { id: 'unknown' as FeedbackReason, label: 'Il ne connaît pas la réponse' }  // Nouvelle option
];

const MessageFeedback = ({ messageId, onFeedbackSubmitted }: MessageFeedbackProps) => {
  // États du composant
  const [showNegativeFeedback, setShowNegativeFeedback] = useState(false);
  const [selectedReason, setSelectedReason] = useState<FeedbackReason | ''>('');
  const [otherComment, setOtherComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<'positive' | 'negative' | null>(null);

  // Initialisation du client Supabase
  const supabase = createClientComponentClient();

  // Fonction pour extraire l'ID correct du message
  const extractMessageId = useCallback(async (rawId: string): Promise<string> => {
    console.log('Traitement de l\'ID brut:', rawId);

    // Pour un ID avec suffixe "-answer"
    if (rawId.endsWith('-answer')) {
      const baseId = rawId.slice(0, -7);
      console.log('ID sans suffixe -answer:', baseId);

      try {
        const { data } = await supabase
          .from('question_history')
          .select('id')
          .eq('id', baseId)
          .single();

        if (data) {
          console.log('ID trouvé dans la base:', data.id);
          return data.id;
        }
      } catch (e) {
        console.error('Erreur lors de la vérification de l\'ID:', e);
      }
    }

    // Pour les nouveaux messages, récupérer le dernier message
    try {
      const { data } = await supabase
        .from('question_history')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data) {
        console.log('Dernier ID trouvé:', data.id);
        return data.id;
      }
    } catch (e) {
      console.error('Erreur lors de la récupération du dernier message:', e);
    }

    return rawId;
  }, [supabase]);

  // Fonction de soumission du feedback
  const submitFeedback = useCallback(async (isPositive: boolean) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Vérification de l'authentification
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('Vous devez être connecté pour envoyer un feedback');
      }

      // Récupération de l'ID correct
      const validMessageId = await extractMessageId(messageId);
      console.log('ID final utilisé:', validMessageId);

      // Préparation des données
      const feedbackData = {
        user_id: user.id,
        message_id: validMessageId,
        is_positive: isPositive,
        reason: selectedReason === 'other' ? null : selectedReason,
        comment: selectedReason === 'other' ? otherComment : null
      };

      console.log('Données à envoyer:', feedbackData);

      // Envoi du feedback
      const { error: submissionError } = await supabase
        .from('message_feedback')
        .insert(feedbackData);

      if (submissionError) {
        console.error('Erreur de soumission:', submissionError);
        throw new Error('Erreur lors de l\'envoi du feedback');
      }

      // Succès
      setSubmitted(true);
      setFeedbackType(isPositive ? 'positive' : 'negative');
      onFeedbackSubmitted?.();

    } catch (err) {
      console.error('Erreur complète:', err);
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue');
    } finally {
      setIsSubmitting(false);
    }
  }, [messageId, selectedReason, otherComment, supabase, extractMessageId, onFeedbackSubmitted]);

  // Affichage du message de succès
  if (submitted) {
    return (
      <div className={`text-sm mt-2 ${
        feedbackType === 'positive' 
          ? 'text-green-600 dark:text-green-400' 
          : 'text-red-600 dark:text-red-400'
      }`}>
        Merci pour votre retour !
      </div>
    );
  }

  // Interface principale
  return (
    <div className="mt-2">
      {error && (
        <div className="text-sm text-red-500 dark:text-red-400 mb-2">
          {error}
        </div>
      )}

      {!showNegativeFeedback ? (
        // Boutons de feedback rapide
        <div className="flex items-center space-x-2">
          <button
            onClick={() => submitFeedback(true)}
            disabled={isSubmitting}
            className="p-2 hover:bg-green-100 dark:hover:bg-green-900 rounded-full
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     text-green-600 dark:text-green-500"
            title="Réponse utile"
          >
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowNegativeFeedback(true)}
            disabled={isSubmitting}
            className="p-2 hover:bg-red-100 dark:hover:bg-red-900 rounded-full
                     transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                     text-red-600 dark:text-red-500"
            title="Réponse à améliorer"
          >
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // Formulaire de feedback négatif
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border
                      border-red-200 dark:border-red-800">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-medium text-red-600 dark:text-red-400">
              Qu'est-ce qui pourrait être amélioré ?
            </h4>
            <button
              onClick={() => setShowNegativeFeedback(false)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Options de feedback */}
            {FEEDBACK_OPTIONS.map((option) => (
              <label key={option.id} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="feedback"
                  value={option.id}
                  checked={selectedReason === option.id}
                  onChange={(e) => setSelectedReason(e.target.value as FeedbackReason)}
                  className="text-red-500"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}

            {/* Option "Autre" */}
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="feedback"
                value="other"
                checked={selectedReason === 'other'}
                onChange={(e) => setSelectedReason(e.target.value as FeedbackReason)}
                className="text-red-500"
              />
              <span className="text-sm">Autre</span>
            </label>

            {/* Champ de commentaire pour l'option "Autre" */}
            {selectedReason === 'other' && (
              <textarea
                value={otherComment}
                onChange={(e) => setOtherComment(e.target.value)}
                placeholder="Décrivez le problème..."
                className="w-full p-2 text-sm border rounded-lg dark:bg-gray-700
                         dark:border-gray-600 focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            )}

            {/* Bouton de soumission */}
            <button
              onClick={() => submitFeedback(false)}
              disabled={isSubmitting || !selectedReason || (selectedReason === 'other' && !otherComment)}
              className="w-full mt-4 px-4 py-2 bg-red-500 text-white rounded-lg
                       hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed
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
