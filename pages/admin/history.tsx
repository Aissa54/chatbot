// pages/admin/history.tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ArrowLeft, Download, Search, Calendar, Users, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useHistoryManager } from '../../hooks/useHistoryManager';
import { Dashboard } from '../../components/admin/Dashboard';

// Types
interface User {
  id: string;
  email: string;
}

interface HistoryEntry {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  created_at: string;
  user?: User;
}

const History = () => {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showDashboard, setShowDashboard] = useState(true);

  const router = useRouter();
  const supabase = createClientComponentClient();
  const { getHistory } = useHistoryManager();

  useEffect(() => {
    handleSearch();
  }, [showAllUsers]); // Recharge quand on change le filtre utilisateurs

  const handleSearch = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      const filters = {
        startDate: startDate || undefined,
        endDate: endDate ? `${endDate}T23:59:59` : undefined,
        searchQuery: searchQuery || undefined,
        userId: showAllUsers ? undefined : session?.user?.id
      };
      
      const historyData = await getHistory(filters);
      setEntries(historyData || []);
    } catch (error) {
      console.error('Error searching history:', error);
      alert('Erreur lors de la recherche dans l\'historique');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  const handleDeleteEntries = async () => {
    if (!selectedEntries.length) return;
    
    if (window.confirm('Êtes-vous sûr de vouloir supprimer les entrées sélectionnées ?')) {
      try {
        const { error } = await supabase
          .from('question_history')
          .delete()
          .in('id', selectedEntries);

        if (error) throw error;
        
        setSelectedEntries([]);
        handleSearch(); // Recharger l'historique après suppression
      } catch (error) {
        console.error('Error deleting entries:', error);
        alert('Erreur lors de la suppression des entrées');
      }
    }
  };

  const exportToCsv = () => {
    try {
      const csv = [
        ['Date', 'Email', 'Question', 'Réponse'], // En-têtes
        ...entries.map(entry => [
          formatDate(entry.created_at),
          entry.user?.email || '',
          entry.question.replace(/"/g, '""'), // Échapper les guillemets
          entry.answer.replace(/"/g, '""')
        ])
      ]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `historique-conversations-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Erreur lors de l\'export CSV');
    }
  };

  const handleSelectEntry = (id: string) => {
    setSelectedEntries(prev =>
      prev.includes(id)
        ? prev.filter(entryId => entryId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedEntries.length === entries.length) {
      setSelectedEntries([]);
    } else {
      setSelectedEntries(entries.map(entry => entry.id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm py-4 px-6 fixed w-full top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link 
              href="/"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Historique des conversations
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowDashboard(!showDashboard)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showDashboard 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              {showDashboard ? 'Masquer statistiques' : 'Afficher statistiques'}
            </button>
            <button
              onClick={exportToCsv}
              className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-24 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Dashboard */}
          {showDashboard && <Dashboard />}

          {/* Filtres */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Recherche */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Date début */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Date fin */}
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Tous les utilisateurs */}
              <div className="flex items-center">
                <button
                  onClick={() => setShowAllUsers(!showAllUsers)}
                  className={`flex items-center px-4 py-2 rounded-lg border dark:border-gray-600 w-full ${
                    showAllUsers 
                      ? 'bg-blue-500 text-white border-blue-500' 
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <Users className="w-5 h-5 mr-2" />
                  {showAllUsers ? 'Tous les utilisateurs' : 'Mes conversations'}
                </button>
              </div>
            </div>

            {/* Bouton de recherche */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Rechercher
              </button>
            </div>
          </div>

          {/* Actions en masse */}
          {selectedEntries.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6 flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {selectedEntries.length} élément(s) sélectionné(s)
              </span>
              <button
                onClick={handleDeleteEntries}
                className="inline-flex items-center px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </button>
            </div>
          )}

          {/* Liste des conversations */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Aucune conversation trouvée</p>
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div 
                  key={entry.id}
                  className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 transition-all ${
                    selectedEntries.includes(entry.id)
                      ? 'ring-2 ring-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedEntries.includes(entry.id)}
                        onChange={() => handleSelectEntry(entry.id)}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(entry.created_at)}
                        </p>
                        <p className="text-sm text-blue-500">
                          {entry.user?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="ml-8">
                    <div className="mb-3">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                        Question:
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 pl-4">
                        {entry.question}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
                        Réponse:
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 pl-4">
                        {entry.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default History;