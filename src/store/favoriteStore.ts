import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/hooks/use-toast';

export interface FavoriteSubcategory {
  id: string;
  userId: string;
  subcategoryId: string;
  createdAt: string;
  // Joined data
  parentCategoryId?: string;
  departmentId?: string;
  subcategoryName?: string;
  parentCategoryName?: string;
  departmentName?: string;
}

export interface RecentVisit {
  id: string;
  userId: string;
  subcategoryId: string;
  parentCategoryId: string;
  departmentId: string;
  visitedAt: string;
  visitCount: number;
  // Joined data
  subcategoryName?: string;
  parentCategoryName?: string;
  departmentName?: string;
}

export interface DepartmentUsageStats {
  departmentId: string;
  departmentName: string;
  visitCount: number;
  lastVisitedAt: string;
}

interface FavoriteState {
  favorites: FavoriteSubcategory[];
  recentVisits: RecentVisit[];
  departmentStats: DepartmentUsageStats[];
  isLoading: boolean;

  // 즐겨찾기
  fetchFavorites: () => Promise<void>;
  addFavorite: (subcategoryId: string) => Promise<void>;
  removeFavorite: (subcategoryId: string) => Promise<void>;
  isFavorite: (subcategoryId: string) => boolean;

  // 최근 방문
  fetchRecentVisits: (limit?: number) => Promise<void>;
  recordVisit: (
    subcategoryId: string,
    parentCategoryId: string,
    departmentId: string,
  ) => Promise<void>;

  // 부서 통계
  fetchDepartmentStats: () => Promise<void>;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  recentVisits: [],
  departmentStats: [],
  isLoading: false,

  // 즐겨찾기 조회
  fetchFavorites: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select(
          `
          id,
          user_id,
          subcategory_id,
          created_at,
          subcategories (
            name,
            parent_category_id,
            department_id,
            categories (name),
            departments (name)
          )
        `,
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const favorites: FavoriteSubcategory[] =
        data?.map((fav: any) => ({
          id: fav.id,
          userId: fav.user_id,
          subcategoryId: fav.subcategory_id,
          createdAt: fav.created_at,
          parentCategoryId: fav.subcategories?.parent_category_id,
          departmentId: fav.subcategories?.department_id,
          subcategoryName: fav.subcategories?.name,
          parentCategoryName: fav.subcategories?.categories?.name,
          departmentName: fav.subcategories?.departments?.name,
        })) || [];

      set({ favorites });
    } catch (error) {
      console.error('즐겨찾기 조회 실패:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // 즐겨찾기 추가
  addFavorite: async (subcategoryId: string) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const { error } = await supabase.from('user_favorites').insert({
        user_id: user.id,
        subcategory_id: subcategoryId,
        company_id: user.companyId,
      });

      if (error) throw error;

      toast({
        title: '즐겨찾기 추가',
        description: '세부 카테고리를 즐겨찾기에 추가했습니다.',
      });

      // 목록 새로고침
      await get().fetchFavorites();
    } catch (error: any) {
      if (error.code === '23505') {
        toast({
          title: '이미 즐겨찾기에 추가됨',
          description: '이미 즐겨찾기에 추가된 카테고리입니다.',
          variant: 'destructive',
        });
      } else {
        console.error('즐겨찾기 추가 실패:', error);
        toast({
          title: '오류',
          description: '즐겨찾기 추가에 실패했습니다.',
          variant: 'destructive',
        });
      }
    }
  },

  // 즐겨찾기 제거
  removeFavorite: async (subcategoryId: string) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('subcategory_id', subcategoryId);

      if (error) throw error;

      toast({
        title: '즐겨찾기 제거',
        description: '즐겨찾기에서 제거되었습니다.',
      });

      // 목록 새로고침
      await get().fetchFavorites();
    } catch (error) {
      console.error('즐겨찾기 제거 실패:', error);
      toast({
        title: '오류',
        description: '즐겨찾기 제거에 실패했습니다.',
        variant: 'destructive',
      });
    }
  },

  // 즐겨찾기 여부 확인
  isFavorite: (subcategoryId: string) => {
    return get().favorites.some((fav) => fav.subcategoryId === subcategoryId);
  },

  // 최근 방문 조회
  fetchRecentVisits: async (limit = 10) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('user_recent_visits')
        .select(
          `
          id,
          user_id,
          subcategory_id,
          parent_category_id,
          department_id,
          visited_at,
          visit_count,
          subcategories (name),
          categories (name),
          departments (name)
        `,
        )
        .eq('user_id', user.id)
        .order('visited_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const mapped: RecentVisit[] =
        data?.map((visit: any) => ({
          id: visit.id,
          userId: visit.user_id,
          subcategoryId: visit.subcategory_id,
          parentCategoryId: visit.parent_category_id,
          departmentId: visit.department_id,
          visitedAt: visit.visited_at,
          visitCount: visit.visit_count,
          subcategoryName: visit.subcategories?.name,
          parentCategoryName: visit.categories?.name,
          departmentName: visit.departments?.name,
        })) || [];

      // 같은 세부 카테고리(같은 장소)는 가장 최근 방문 기록만 남기기
      const seen = new Set<string>();
      const recentVisits: RecentVisit[] = [];
      for (const visit of mapped) {
        if (seen.has(visit.subcategoryId)) continue;
        seen.add(visit.subcategoryId);
        recentVisits.push(visit);
      }

      set({ recentVisits });
    } catch (error) {
      console.error('최근 방문 조회 실패:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // 방문 기록 저장/업데이트
  recordVisit: async (
    subcategoryId: string,
    parentCategoryId: string,
    departmentId: string,
  ) => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      // 기존 방문 기록 확인
      const { data: existing } = await supabase
        .from('user_recent_visits')
        .select('id, visit_count')
        .eq('user_id', user.id)
        .eq('subcategory_id', subcategoryId)
        .maybeSingle();

      if (existing) {
        // 기존 기록 업데이트
        await supabase
          .from('user_recent_visits')
          .update({
            visited_at: new Date().toISOString(),
            visit_count: (existing as any).visit_count + 1,
          })
          .eq('id', (existing as any).id);
      } else {
        // 새 기록 추가
        await supabase.from('user_recent_visits').insert({
          user_id: user.id,
          subcategory_id: subcategoryId,
          parent_category_id: parentCategoryId,
          department_id: departmentId,
          company_id: user.companyId,
        });
      }

      // 최근 방문 목록 새로고침
      await get().fetchRecentVisits();

      // 부서 통계 새로고침
      await get().fetchDepartmentStats();
    } catch (error) {
      console.error('방문 기록 저장 실패:', error);
    }
  },

  // 부서별 사용 통계
  fetchDepartmentStats: async () => {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_recent_visits')
        .select('department_id, visited_at, departments(name)')
        .eq('user_id', user.id);

      if (error) throw error;

      // 부서별로 그룹화하여 통계 계산
      const statsMap = new Map<string, DepartmentUsageStats>();

      data?.forEach((visit: any) => {
        const deptId = visit.department_id as string;
        const existing = statsMap.get(deptId);

        if (existing) {
          existing.visitCount += 1;
          if (new Date(visit.visited_at) > new Date(existing.lastVisitedAt)) {
            existing.lastVisitedAt = visit.visited_at;
          }
        } else {
          statsMap.set(deptId, {
            departmentId: deptId,
            departmentName: visit.departments?.name || '알 수 없음',
            visitCount: 1,
            lastVisitedAt: visit.visited_at,
          });
        }
      });

      const departmentStats = Array.from(statsMap.values()).sort(
        (a, b) => b.visitCount - a.visitCount,
      );

      set({ departmentStats });
    } catch (error) {
      console.error('부서 통계 조회 실패:', error);
    }
  },
}));
