import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { ArrowLeft, Users, MessageSquare, ThumbsUp } from 'lucide-react';

// Types pour les statistiques d'administration
interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  totalQuestions: number;
  feedbackStats: {
    positive: number;
    negative: number;
    reasons: Record<string, number>;
  };
  userActivity: {
    date: string;
    count: number;
  }[];
}

// Configuration des couleurs pour les différents types de données
const CHART_COLORS = {
  positif: '#22c55e',    // Vert pour les feedbacks positifs
  negatif: '#ef4444',    // Rouge pour les feedbacks négatifs
  activity: '#8884d8',   // Violet pour le graphique d'activité
  users: '#3b82f6',      // Bleu pour les statistiques utilisateurs
  conversations: '#a855f7' // Violet pour les conversations
};

const Dashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const supabase = createClientComponentClient();

  // Effet pour charger les statistiques au montage du composant
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        
        // Vérification des droits administrateur
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email || 
            session.user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',')[0]) {
          router.push('/');
          return;
        }

        // Chargement des données depuis Supabase
        const [
          { data: users },
          { data: conversations },
          { data: feedbacks }
        ] = await Promise.all([
          supabase.from('users_profiles').select('*'),
          supabase.from('conversations').select('*').order('created_at', { ascending: false }),
          supabase.from('message_feedback').select('*')
        ]);

        // Calcul des utilisateurs actifs
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const activeUsers = users?.filter(u => {
          if (!u.last_seen) return false;
          const lastSeen = new Date(u.last_seen);
          return lastSeen > weekAgo;
        }).length || 0;

        // Calcul des statistiques de feedback
        const feedbackStats = {
          positive: feedbacks?.filter(f => f.is_positive).length || 0,
          negative: feedbacks?.filter(f => !f.is_positive).length || 0,
          reasons: feedbacks?.reduce((acc, f) => {
            if (f.reason) {
              acc[f.reason] = (acc[f.reason] || 0) + 1;
            }
            return acc;
          }, {} as Record<string, number>) || {}
        };

        // Calcul de l'activité des 7 derniers jours
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          return {
            date: dateStr,
            count: conversations?.filter(c => 
              c.created_at.startsWith(dateStr)
            ).length || 0
          };
        }).reverse();

        setStats({
          totalUsers: users?.length || 0,
          activeUsers,
          totalConversations: conversations?.length || 0,
          totalQuestions: conversations?.length || 0,
          feedbackStats,
          userActivity: last7Days
        });

      } catch (error) {
        console.error('Erreur chargement statistiques:', error);
        setError('Erreur lors du chargement des statistiques');
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [router, supabase]); // Dépendances nécessaires uniquement

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">{error || 'Aucune donnée disponible'}</p>
        <button
          onClick={() => router.push('/')}
          className="flex items-center space-x-2 text-blue-500 hover:text-blue-600"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour à l'accueil</span>
        </button>
      </div>
    );
  }

  // Préparation des données pour le graphique en camembert
  const feedbackData = [
    { name: 'Positifs', value: stats.feedbackStats.positive },
    { name: 'Négatifs', value: stats.feedbackStats.negative }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* En-tête avec bouton retour */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Tableau de bord administrateur
          </h1>
          <button
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-300"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>
        </div>

        {/* Cartes statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Utilisateurs totaux */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Utilisateurs totaux
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.totalUsers}
                </p>
              </div>
              <Users className="w-8 h-8" style={{ color: CHART_COLORS.users }} />
            </div>
          </div>

          {/* Utilisateurs actifs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Utilisateurs actifs (7j)
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.activeUsers}
                </p>
              </div>
              <Users className="w-8 h-8" style={{ color: CHART_COLORS.users }} />
            </div>
          </div>

          {/* Conversations totales */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Conversations totales
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.totalConversations}
                </p>
              </div>
              <MessageSquare className="w-8 h-8" style={{ color: CHART_COLORS.conversations }} />
            </div>
          </div>

          {/* Retours positifs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Retours positifs
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {stats.feedbackStats.positive}
                </p>
              </div>
              <ThumbsUp className="w-8 h-8" style={{ color: CHART_COLORS.positif }} />
            </div>
          </div>
        </div>

        {/* Graphiques */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Distribution des retours */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">
              Distribution des retours
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feedbackData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => (
                      <text
                        x={0}
                        y={0}
                        fill={name === 'Positifs' ? CHART_COLORS.positif : CHART_COLORS.negatif}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        {`${name} (${(percent * 100).toFixed(0)}%)`}
                      </text>
                    )}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {feedbackData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.name === 'Positifs' ? CHART_COLORS.positif : CHART_COLORS.negatif}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ payload, label }) => {
                      if (payload && payload.length > 0) {
                        const data = payload[0];
                        return (
                          <div className="bg-white p-2 border rounded shadow">
                            <p style={{ color: data.color }}>{`${data.name}: ${data.value}`}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    formatter={(value, entry) => (
                      <span
                        key={`legend-${value}`}
                        style={{
                          color: value === 'Positifs' ? CHART_COLORS.positif : CHART_COLORS.negatif,
                          fontWeight: 'bold'
                        }}
                      >
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activité des utilisateurs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-6 text-gray-900 dark:text-white">
              Activité des utilisateurs (7 derniers jours)
            </h2>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.userActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => new Date(date).toLocaleDateString('fr-FR', {
                      month: 'numeric',
                      day: 'numeric'
                    })}
                  />
                  <YAxis />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      padding: '8px'
                    }}
                    formatter={(value) => [`${value} questions`, 'Nombre de questions']}
                  />
                  <Legend />
                  <Bar
                    dataKey="count"
                    name="Questions"
                    fill={CHART_COLORS.activity}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;