import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Loader2 } from 'lucide-react';

interface ChatInterfaceProps {
  onSubmit: (message: string) => void;
  loading: boolean;
  isListening: boolean;
  toggleVoiceRecognition: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSubmit,
  loading,
  isListening,
  toggleVoiceRecognition
}) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;
    onSubmit(message);
    setMessage('');
  };

  // Ajuster automatiquement la hauteur du textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Gérer la touche Entrée pour envoyer le message
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 py-4">
      <div className="max-w-3xl mx-auto px-4">
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end gap-2 bg-white dark:bg-gray-700 rounded-lg border 
                        border-gray-200 dark:border-gray-600 shadow-lg">
            <button
              type="button"
              onClick={toggleVoiceRecognition}
              className={`p-3 rounded-l-lg transition-colors ${
                isListening
                  ? 'bg-red-500 text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <textarea
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez votre question..."
              className="flex-1 max-h-32 p-3 bg-transparent border-none resize-none 
                       focus:ring-0 focus:outline-none dark:text-white"
              rows={1}
            />
            
            <button
              type="submit"
              disabled={!message.trim() || loading}
              className="p-3 rounded-r-lg text-white bg-blue-500 hover:bg-blue-600 
                       disabled:bg-gray-300 dark:disabled:bg-gray-600 
                       disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;