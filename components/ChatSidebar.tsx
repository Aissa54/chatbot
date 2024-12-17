import React, { useState, useEffect, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Search, X, MessageSquare, Calendar } from 'lucide-react';

interface ConversationWithMessages {
  conversation: Conversation;
  messages: QuestionHistory[];
}

const ChatSidebar = ({
  isOpen,
  onClose,
  onMessageSelect,
  darkMode
}: {
  isOpen: boolean;
  onClose: () => void;
  onMessageSelect: (messages: Message[]) => void;
  darkMode: boolean;
}) => {
  const [conversations, setConversations] = useState<ConversationWithMessages[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  
  const supabase = createClientComponentClient();

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      
      // Charger d'abord les conversations
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .order('created_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Pour chaque conversation, charger les messages
      const conversationsWithMessages = await Promise.all(
        conversationsData.map(async (conv) => {
          let query = supabase
            .from('question_history')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true });

          if (searchQuery) {
            query = query.or(
              `question.ilike.%${searchQuery}%,answer.ilike.%${searchQuery}%`
            );
          }

          const { data: messages, error: messagesError } = await query;
          if (messagesError) throw messagesError;

          return {
            conversation: conv,
            messages: messages || []
          };
        })
      );

      setConversations(conversationsWithMessages.filter(conv => conv.messages.length > 0));
    } catch (error) {
      console.error('Erreur de chargement des conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, supabase]);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen, loadConversations]);

  const handleConversationSelect = (conversation: ConversationWithMessages) => {
    // Convertir les messages au format attendu
    const formattedMessages: Message[] = conversation.messages.flatMap((msg): Message[] => [
      {
        id: `${msg.id}-question`,
        type: 'user',
        content: msg.question,
        timestamp: new Date(msg.created_at)
      },
      {
        id: `${msg.id}-answer`,
        type: 'bot',
        content: msg.answer,
        timestamp: new Date(msg.created_at)
      }
    ]);
    
    onMessageSelect(formattedMessages);
    onClose();
  };

  return (
    <div 
      className={`fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-800 shadow-xl 
                transform transition-transform duration-300 ease-in-out z-50
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="flex flex-col h-full">
        {/* En-tête */}
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-500" />
              <h2 className="text-lg font-semibold dark:text-white">Historique</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher dans l'historique..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 
                       border border-gray-200 dark:border-gray-600 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-blue-500
                       dark:text-white"
            />
          </div>
        </div>

        {/* Liste des conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : conversations.length > 0 ? (
            conversations.map((conv) => (
              <button
                key={conv.conversation.id}
                onClick={() => handleConversationSelect(conv)}
                className="w-full p-3 border-b dark:border-gray-700 text-left 
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {conv.messages[0].question}
                </p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-xs text-gray-500">
                    {conv.messages.length} message{conv.messages.length > 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(conv.conversation.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center p-4 text-gray-500 dark:text-gray-400">
              Aucune conversation trouvée
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;