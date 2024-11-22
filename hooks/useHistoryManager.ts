// hooks/useHistoryManager.ts
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/router';

interface HistoryStats {
  totalQuestions: number;
  averageQuestionsPerDay: number;
  mostActiveDay: string;
  topQuestions: Array<{
    question: string;
    count: number;
  }>;
}

export const useHistoryManager = () => {
  const supabase = createClientComponentClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<HistoryStats | null>(null);

  // Récupérer l'historique avec filtres
  const getHistory = async (filters: {
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
    userId?: string;
  }) => {
    try {
      let query = supabase
        .from('question_history')
        .select(`
          *,
          user:users(email)
        `)
        .order('created_at', { ascending: false });

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters.searchQuery) {
        query = query.or(`question.ilike.%${filters.searchQuery}%,answer.ilike.%${filters.searchQuery}%`);
      }
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error fetching history:', error);
      throw error;
    }
  };

  // Calculer les statistiques
  const calculateStats = async (userId?: string) => {
    try {
      setLoading(true);
      
      // Total des questions
      const { count: totalQuestions } = await supabase
        .from('question_history')
        .select('*', { count: 'exact' })
        .eq(userId ? 'user_id' : 'id', userId || 'id');

      // Questions par jour
      const { data: dailyStats } = await supabase
        .from('question_history')
        .select('created_at')
        .eq(userId ? 'user_id' : 'id', userId || 'id')
        .order('created_at', { ascending: false });

      // Questions fréquentes
      const { data: topQuestions } = await supabase
        .from('question_history')
        .select('question')
        .eq(userId ? 'user_id' : 'id', userId || 'id')
        .order('created_at', { ascending: false });

      // Calculer les statistiques
      const questionCounts = topQuestions?.reduce((acc: Record<string, number>, curr) => {
        acc[curr.question] = (acc[curr.question] || 0) + 1;
        return acc;
      }, {});

      const sortedQuestions = Object.entries(questionCounts || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([question, count]) => ({ question, count }));

      const stats: HistoryStats = {
        totalQuestions: totalQuestions || 0,
        averageQuestionsPerDay: totalQuestions 
          ? totalQuestions / (dailyStats?.length || 1) 
          : 0,
        mostActiveDay: dailyStats?.[0]?.created_at || '',
        topQuestions: sortedQuestions
      };

      setStats(stats);
      return stats;
    } catch (error) {
      console.error('Error calculating stats:', error);
      setError('Erreur lors du calcul des statistiques');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    getHistory,
    calculateStats,
    stats,
    loading,
    error
  };
};