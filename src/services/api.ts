import { supabase } from '../lib/supabase';
import type {
  School,
  VacancyItem,
  ExternalOut,
  ExternalIn,
  InternalTransfer,
  SchoolShortage,
  AssignmentStats,
  AssignmentResult,
} from '../types';

// 학교 API
export const schoolApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .order('display_order');
    if (error) throw error;
    return { data: data as School[] };
  },
  get: async (id: number) => {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return { data: data as School };
  },
  create: async (school: Partial<School>) => {
    const { data, error } = await supabase
      .from('schools')
      .insert(school)
      .select()
      .single();
    if (error) throw error;
    return { data: data as School };
  },
  update: async (id: number, school: Partial<School>) => {
    const { data, error } = await supabase
      .from('schools')
      .update(school)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return { data: data as School };
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('schools').delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  },
  createBulk: async (schools: Partial<School>[]) => {
    const { data, error } = await supabase.from('schools').insert(schools).select();
    if (error) throw error;
    return { data };
  },
};

// 결원 API
export const vacancyApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('vacancies')
      .select(`
        *,
        schools:school_id (name)
      `)
      .order('id');
    if (error) throw error;
    const transformed = (data || []).map((item: any) => ({
      ...item,
      school_name: item.schools?.name || null,
    }));
    return { data: transformed as VacancyItem[] };
  },
  create: async (vacancy: { type_code: string; school_id: number; teacher_name: string; note?: string }) => {
    const { data, error } = await supabase.from('vacancies').insert(vacancy).select().single();
    if (error) throw error;
    return { data };
  },
  update: async (id: number, vacancy: Partial<VacancyItem>) => {
    const { data, error } = await supabase.from('vacancies').update(vacancy).eq('id', id).select().single();
    if (error) throw error;
    return { data };
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('vacancies').delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  },
};

// 충원 API
export const supplementApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('supplements')
      .select(`
        *,
        schools:school_id (name)
      `)
      .order('id');
    if (error) throw error;
    const transformed = (data || []).map((item: any) => ({
      ...item,
      school_name: item.schools?.name || null,
    }));
    return { data: transformed as VacancyItem[] };
  },
  create: async (supplement: { type_code: string; school_id: number; teacher_name: string; note?: string }) => {
    const { data, error } = await supabase.from('supplements').insert(supplement).select().single();
    if (error) throw error;
    return { data };
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('supplements').delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  },
};

// 관외전출 API
export const externalOutApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('external_transfers_out')
      .select(`
        *,
        schools:school_id (name)
      `)
      .order('id');
    if (error) throw error;
    const transformed = (data || []).map((item: any) => ({
      ...item,
      school_name: item.schools?.name || null,
    }));
    return { data: transformed as ExternalOut[] };
  },
  create: async (data: Partial<ExternalOut>) => {
    const { data: result, error } = await supabase.from('external_transfers_out').insert(data).select().single();
    if (error) throw error;
    return { data: result };
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('external_transfers_out').delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  },
};

// 관외전입 API
export const externalInApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('external_transfers_in')
      .select(`
        *,
        assigned_school:assigned_school_id (name)
      `)
      .order('id');
    if (error) throw error;
    const transformed = (data || []).map((item: any) => ({
      ...item,
      assigned_school_name: item.assigned_school?.name || null,
    }));
    return { data: transformed as ExternalIn[] };
  },
  create: async (data: Partial<ExternalIn>) => {
    const { data: result, error } = await supabase.from('external_transfers_in').insert(data).select().single();
    if (error) throw error;
    return { data: result };
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('external_transfers_in').delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  },
};

// 관내전출입 API
export const internalApi = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('internal_transfers')
      .select(`
        *,
        current_school:current_school_id (name),
        assigned_school:assigned_school_id (name),
        wish_school_1:wish_school_1_id (name),
        wish_school_2:wish_school_2_id (name),
        wish_school_3:wish_school_3_id (name)
      `)
      .order('total_score', { ascending: false });
    if (error) throw error;
    const transformed = (data || []).map((item: any) => ({
      ...item,
      current_school_name: item.current_school?.name || null,
      assigned_school_name: item.assigned_school?.name || null,
      wish_school_1_name: item.wish_school_1?.name || null,
      wish_school_2_name: item.wish_school_2?.name || null,
      wish_school_3_name: item.wish_school_3?.name || null,
    }));
    return { data: transformed as InternalTransfer[] };
  },
  create: async (transfer: Partial<InternalTransfer>) => {
    const { data, error } = await supabase.from('internal_transfers').insert(transfer).select().single();
    if (error) throw error;
    return { data };
  },
  update: async (id: number, transfer: Partial<InternalTransfer>) => {
    const { data, error } = await supabase.from('internal_transfers').update(transfer).eq('id', id).select().single();
    if (error) throw error;
    return { data };
  },
  delete: async (id: number) => {
    const { error } = await supabase.from('internal_transfers').delete().eq('id', id);
    if (error) throw error;
    return { data: null };
  },
  deleteAll: async () => {
    const { error } = await supabase.from('internal_transfers').delete().neq('id', 0);
    if (error) throw error;
    return { data: null };
  },
};

// 학교별 과부족 계산 함수
async function calculateSchoolShortage(): Promise<SchoolShortage[]> {
  const { data: schools } = await schoolApi.getAll();
  const { data: vacancies } = await vacancyApi.getAll();
  const { data: supplements } = await supplementApi.getAll();
  const { data: externalOut } = await externalOutApi.getAll();
  const { data: externalIn } = await externalInApi.getAll();
  const { data: internal } = await internalApi.getAll();

  return schools.map((school) => {
    const vacancyCount = vacancies.filter((v) => v.school_id === school.id).length;
    const supplementCount = supplements.filter((s) => s.school_id === school.id).length;
    const extOutCount = externalOut.filter((e) => e.school_id === school.id && e.transfer_type !== '정원외').length;
    const extInCount = externalIn.filter((e) => e.assigned_school_id === school.id && e.transfer_type !== '정원외').length;
    const intOutCount = internal.filter((t) => t.current_school_id === school.id && t.assigned_school_id && t.assigned_school_id !== school.id).length;
    const intInCount = internal.filter((t) => t.assigned_school_id === school.id && t.current_school_id !== school.id).length;

    const currentCount = school.current_count - vacancyCount + supplementCount - extOutCount + extInCount - intOutCount + intInCount;
    const shortage = currentCount - school.quota;

    return {
      id: school.id,
      name: school.name,
      quota: school.quota,
      current_count: currentCount,
      shortage,
    };
  });
}

// 배치 통계 계산
async function calculateStats(): Promise<AssignmentStats> {
  const { data: internal } = await internalApi.getAll();
  const total = internal.length;
  const assigned = internal.filter((t) => t.assigned_school_id !== null).length;
  const excluded = internal.filter((t) => t.exclusion_reason !== null).length;
  const unassigned = total - assigned - excluded;
  const assignment_rate = total > 0 ? Math.round((assigned / (total - excluded)) * 100) : 0;

  return { total, assigned, excluded, unassigned, assignment_rate };
}

// 배치 API
export const assignmentApi = {
  auto: async (): Promise<{ data: AssignmentResult }> => {
    const results = { '1희망': 0, '2희망': 0, '3희망': 0 };

    for (const round of [1, 2, 3]) {
      const { data } = await assignmentApi.round(round);
      const key = `${round}희망` as keyof typeof results;
      results[key] = data.assigned;
    }

    const total_assigned = results['1희망'] + results['2희망'] + results['3희망'];
    const { data: internal } = await internalApi.getAll();
    const unassigned = internal.filter((t) => !t.assigned_school_id && !t.exclusion_reason).length;

    return {
      data: {
        message: '자동 배치가 완료되었습니다.',
        results,
        total_assigned,
        unassigned,
      },
    };
  },

  round: async (round: number): Promise<{ data: { assigned: number } }> => {
    const { data: internal } = await internalApi.getAll();
    const shortages = await calculateSchoolShortage();

    const wishField = `wish_school_${round}_id` as keyof InternalTransfer;
    const roundName = `${round}희망`;

    // 해당 희망에 미배치된 교사들 (서열순 정렬)
    const candidates = internal
      .filter((t) =>
        !t.assigned_school_id &&
        !t.exclusion_reason &&
        t.preference_round === roundName &&
        t[wishField]
      )
      .sort((a, b) => {
        if (b.total_score !== a.total_score) return b.total_score - a.total_score;
        if (b.tiebreaker_1 !== a.tiebreaker_1) return b.tiebreaker_1 - a.tiebreaker_1;
        if (b.tiebreaker_2 !== a.tiebreaker_2) return b.tiebreaker_2 - a.tiebreaker_2;
        if (b.tiebreaker_3 !== a.tiebreaker_3) return b.tiebreaker_3 - a.tiebreaker_3;
        return 0;
      });

    let assigned = 0;
    const shortageMap = new Map(shortages.map((s) => [s.id, s.shortage]));

    for (const teacher of candidates) {
      const wishSchoolId = teacher[wishField] as number;
      const currentShortage = shortageMap.get(wishSchoolId) ?? 0;

      // 결원이 있는 경우만 배치 (shortage < 0)
      if (currentShortage < 0) {
        await internalApi.update(teacher.id, { assigned_school_id: wishSchoolId });
        shortageMap.set(wishSchoolId, currentShortage + 1);
        assigned++;
      }
    }

    return { data: { assigned } };
  },

  reset: async () => {
    const { data: internal } = await internalApi.getAll();
    for (const teacher of internal) {
      if (teacher.assigned_school_id) {
        await internalApi.update(teacher.id, { assigned_school_id: null });
      }
    }
    return { data: null };
  },

  checkExclusion: async () => {
    // 제외 대상 확인 로직 (현소속과 희망학교가 같은 경우 등)
    const { data: internal } = await internalApi.getAll();
    for (const teacher of internal) {
      if (teacher.current_school_id === teacher.wish_school_1_id) {
        await internalApi.update(teacher.id, { exclusion_reason: '현소속 지원' });
      }
    }
    return { data: null };
  },

  getUnassigned: async () => {
    const { data: internal } = await internalApi.getAll();
    const unassigned = internal.filter((t) => !t.assigned_school_id && !t.exclusion_reason);
    return { data: unassigned };
  },

  getStatistics: async () => {
    const stats = await calculateStats();
    return { data: stats };
  },

  getSchoolShortage: async () => {
    const shortages = await calculateSchoolShortage();
    return { data: shortages };
  },
};

// 설정 API
export const settingsApi = {
  getAll: async () => {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    const settings: Record<string, string> = {};
    (data || []).forEach((item: any) => {
      settings[item.key] = item.value || '';
    });
    return { data: settings };
  },
  update: async (settings: Record<string, string>) => {
    for (const [key, value] of Object.entries(settings)) {
      await supabase
        .from('settings')
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    }
    return { data: null };
  },
  init: async () => {
    const defaults = {
      office_name: '양산교육지원청',
      transfer_year: '2025',
      school_level: '초등학교',
      appointment_date: '2025-03-01',
      remote_schools: '',
    };
    await settingsApi.update(defaults);
    return { data: null };
  },
  resetAll: async () => {
    await supabase.from('internal_transfers').delete().neq('id', 0);
    await supabase.from('external_transfers_in').delete().neq('id', 0);
    await supabase.from('external_transfers_out').delete().neq('id', 0);
    await supabase.from('supplements').delete().neq('id', 0);
    await supabase.from('vacancies').delete().neq('id', 0);
    await supabase.from('schools').delete().neq('id', 0);
    return { data: null };
  },
  getVacancyTypes: async () => {
    const { data, error } = await supabase.from('vacancy_types').select('code, name');
    if (error) throw error;
    return { data: data || [] };
  },
};

export default supabase;
