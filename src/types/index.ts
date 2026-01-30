// 학교
export interface School {
  id: number;
  name: string;
  full_name: string | null;
  display_order: number;
  quota: number;
  current_count: number;
}

// 결원/충원
export interface VacancyItem {
  id: number;
  seq: number | null;
  type_code: string | null;
  type_name: string | null;
  school_id: number | null;
  school_name: string | null;
  teacher_name: string;
  note: string | null;
}

// 관외전출
export interface ExternalOut {
  id: number;
  seq: number | null;
  transfer_type: string;
  school_id: number;
  school_name: string | null;
  teacher_name: string;
  gender: string | null;
  destination: string | null;
  separate_quota: string | null;
  note: string | null;
}

// 관외전입
export interface ExternalIn {
  id: number;
  seq: number | null;
  transfer_type: string;
  origin_school: string | null;
  teacher_name: string;
  gender: string | null;
  assigned_school_id: number | null;
  assigned_school_name: string | null;
  separate_quota: string | null;
  note: string | null;
}

// 관내전출입
export interface InternalTransfer {
  id: number;
  seq: number | null;
  exclusion_reason: string | null;
  preference_round: string;
  preferred_school: string | null;
  assigned_school_id: number | null;
  assigned_school_name: string | null;
  current_school_id: number | null;
  current_school_name: string | null;
  teacher_name: string;
  gender: string | null;
  birth_date: string | null;
  is_expired: boolean;
  is_priority: boolean;
  wish_school_1_id: number | null;
  wish_school_1_name: string | null;
  wish_school_2_id: number | null;
  wish_school_2_name: string | null;
  wish_school_3_id: number | null;
  wish_school_3_name: string | null;
  note: string | null;
  separate_quota: string | null;
  total_score: number;
  tiebreaker_1: number;
  tiebreaker_2: number;
  tiebreaker_3: number;
  tiebreaker_4: number;
  tiebreaker_5: number;
  tiebreaker_6: number;
  tiebreaker_7: number;
  special_bonus: number;
}

// 학교별 과부족
export interface SchoolShortage {
  id: number;
  name: string;
  quota: number;
  current_count: number;
  shortage: number;
}

// 배치 통계
export interface AssignmentStats {
  total: number;
  assigned: number;
  excluded: number;
  unassigned: number;
  assignment_rate: number;
}

// 배치 결과
export interface AssignmentResult {
  message: string;
  results: {
    "1희망": number;
    "2희망": number;
    "3희망": number;
  };
  total_assigned: number;
  unassigned: number;
}
