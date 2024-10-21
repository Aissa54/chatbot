// Forced change to trigger a deployment
import { useState } from 'react';

export default function Home() {
  const [messages, setMessages] = useState<{ user: string, text: string }[]>([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { user: 'Vous', text: input }];
    setMessages(newMessages);
    setInput('');

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });
      const data = await response.json();
      setMessages([...newMessages, { user: 'Bot', text: data.reply }]);
    } catch {
      setMessages([...newMessages, { user: 'Bot', text: 'Erreur de communication' }]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Chatbot pour Frigoristes</h1>
        <div className="border border-gray-300 rounded-lg p-4 mb-4 h-64 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`mb-2 ${msg.user === 'Vous' ? 'text-right' : 'text-left'}`}>
              <strong>{msg.user} :</strong> <span>{msg.text}</span>
            </div>
          ))}
        </div>

        <div className="flex">
          <input
            type="text"
            className="border border-gray-300 rounded-lg p-2 flex-grow"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Posez une question..."
          />
          <button className="bg-blue-500 text-white rounded-lg px-4 ml-2" onClick={sendMessage}>
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
