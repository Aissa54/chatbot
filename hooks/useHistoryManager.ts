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
          user:users (
            id,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', `${filters.endDate}T23:59:59`);
      }
      if (filters.searchQuery) {
        query = query.or(`question.ilike.%${filters.searchQuery}%,answer.ilike.%${filters.searchQuery}%`);
      }
      // Ne filtrer par utilisateur que si un ID est spécifié
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching history:', error);
      throw error;
    }
  };

  const calculateStats = async (userId?: string) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('question_history')
        .select('*', { count: 'exact' });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { count: totalQuestions } = await query;

      const { data: dailyStats } = await supabase
        .from('question_history')
        .select('created_at')
        .order('created_at', { ascending: false });

      let questionCounts: Record<string, number> = {};
      if (dailyStats) {
        dailyStats.forEach(entry => {
          const date = new Date(entry.created_at).toLocaleDateString();
          questionCounts[date] = (questionCounts[date] || 0) + 1;
        });
      }

      const stats: HistoryStats = {
        totalQuestions: totalQuestions || 0,
        averageQuestionsPerDay: totalQuestions 
          ? totalQuestions / Object.keys(questionCounts).length 
          : 0,
        mostActiveDay: Object.entries(questionCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || '',
        topQuestions: []  // À implémenter si nécessaire
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