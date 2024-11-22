// pages/admin/history.tsx
import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Search, Calendar, Users, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useHistoryManager } from '../../hooks/useHistoryManager';
import { useAuth } from '../../hooks/useAuth';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

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
  // États
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showStats, setShowStats] = useState(true);

  // Hooks
  const { isAdmin, loading: authLoading } = useAuth();
  const supabase = createClientComponentClient();
  const { getHistory, calculateStats, stats } = useHistoryManager();

  useEffect(() => {
    if (!authLoading) {
      handleSearch();
    }
  }, [authLoading, showAllUsers]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Session non trouvée');
      }

      const filters = {
        startDate: startDate || undefined,
        endDate: endDate ? `${endDate}T23:59:59` : undefined,
        searchQuery: searchQuery || undefined,
        userId: showAllUsers ? undefined : session.user.id
      };

      const historyData = await getHistory(filters);
      setEntries(historyData || []);

      // Actualiser les statistiques
      await calculateStats(showAllUsers ? undefined : session.user.id);
    } catch (error) {
      console.error('Erreur de recherche:', error);
      alert('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntries = async () => {
    if (!selectedEntries.length || !window.confirm('Êtes-vous sûr de vouloir supprimer ces conversations ?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('question_history')
        .delete()
        .in('id', selectedEntries);

      if (error) throw error;

      setSelectedEntries([]);
      handleSearch();
    } catch (error) {
      console.error('Erreur de suppression:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const exportToCsv = () => {
    try {
      const csv = [
        ['Date', 'Email', 'Question', 'Réponse'],
        ...entries.map(entry => [
          formatDate(entry.created_at),
          entry.user?.email || '',
          entry.question.replace(/"/g, '""'),
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
      console.error('Erreur export CSV:', error);
      alert('Erreur lors de l\'export CSV');
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

  const handleSelectEntry = (id: string) => {
    setSelectedEntries(prev =>
      prev.includes(id)
        ? prev.filter(entryId => entryId !== id)
        : [...prev, id]
    );
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Accès non autorisé</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold">Historique des conversations</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowStats(!showStats)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                showStats
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {showStats ? 'Masquer statistiques' : 'Afficher statistiques'}
            </button>
            <button
              onClick={exportToCsv}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Download className="w-4 h-4 mr-2" />
              Exporter CSV
            </button>
          </div>
        </div>
      </header>

      {/* Statistiques */}
      {showStats && stats && (
        <div className="max-w-7xl mx-auto p-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">Total des questions</h2>
              <p className="text-3xl font-bold">{stats.totalQuestions}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">Moyenne quotidienne</h2>
              <p className="text-3xl font-bold">
                {stats.averageQuestionsPerDay.toFixed(1)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
              <h2 className="text-lg font-semibold mb-2">Jour le plus actif</h2>
              <p className="text-3xl font-bold">
                {formatDate(stats.mostActiveDay)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
            <button
              onClick={() => setShowAllUsers(!showAllUsers)}
              className={`px-4 py-2 rounded-lg flex items-center justify-center ${
                showAllUsers
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              {showAllUsers ? 'Tous les utilisateurs' : 'Mes conversations'}
            </button>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSearch}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Rechercher
            </button>
          </div>
        </div>
      </div>

      {/* Liste des conversations */}
      <div className="max-w-7xl mx-auto p-4">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune conversation trouvée
          </div>
        ) : (
          <div className="space-y-4">
            {selectedEntries.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex justify-between items-center">
                <span>{selectedEntries.length} élément(s) sélectionné(s)</span>
                <button
                  onClick={handleDeleteEntries}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 ${
                  selectedEntries.includes(entry.id) ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedEntries.includes(entry.id)}
                      onChange={() => handleSelectEntry(entry.id)}
                      className="h-4 w-4"
                    />
                    <div>
                      <p className="text-sm text-gray-500">
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
                    <h3 className="text-sm font-semibold mb-1">Question:</h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {entry.question}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-1">Réponse:</h3>
                    <p className="text-gray-700 dark:text-gray-300">
                      {entry.answer}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;