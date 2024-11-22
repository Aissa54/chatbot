// components/admin/Dashboard.tsx
import { useEffect } from 'react';
import { useHistoryManager } from '../../hooks/useHistoryManager';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export const Dashboard = () => {
  const { stats, loading, error, calculateStats } = useHistoryManager();

  useEffect(() => {
    calculateStats();
  }, []);

  if (loading) return <div>Chargement des statistiques...</div>;
  if (error) return <div>Erreur: {error}</div>;
  if (!stats) return <div>Aucune donnée disponible</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {/* Carte des statistiques générales */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Statistiques globales</h2>
        <div className="space-y-4">
          <div>
            <p className="text-gray-600 dark:text-gray-400">Total des questions</p>
            <p className="text-2xl font-bold">{stats.totalQuestions}</p>
          </div>
          <div>
            <p className="text-gray-600 dark:text-gray-400">Moyenne quotidienne</p>
            <p className="text-2xl font-bold">
              {stats.averageQuestionsPerDay.toFixed(1)}
            </p>
          </div>
        </div>
      </div>

      {/* Questions les plus fréquentes */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Top 5 des questions</h2>
        <div className="space-y-2">
          {stats.topQuestions.map((q, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm truncate flex-1">{q.question}</span>
              <span className="text-sm font-bold ml-2">{q.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Graphique des tendances */}
      <div className="col-span-1 md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Tendances d'utilisation</h2>
        <div className="h-64">
          <BarChart
            width={800}
            height={300}
            data={stats.topQuestions}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="question" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#3B82F6" />
          </BarChart>
        </div>
      </div>
    </div>
  );
};