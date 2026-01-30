import { useEffect, useState } from 'react';
import { internalApi, schoolApi } from '../services/api';
import type { InternalTransfer, School } from '../types';

export default function Internal() {
  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<InternalTransfer>>({});

  // 필터
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned' | 'excluded'>('all');

  // 새 전출입 추가 폼
  const [newTransfer, setNewTransfer] = useState({
    preference_round: '1희망',
    current_school_id: null as number | null,
    teacher_name: '',
    gender: '',
    birth_date: '',
    is_expired: false,
    is_priority: false,
    wish_school_1_id: null as number | null,
    wish_school_2_id: null as number | null,
    wish_school_3_id: null as number | null,
    total_score: 0,
    tiebreaker_1: 0,
    tiebreaker_2: 0,
    tiebreaker_3: 0,
    tiebreaker_4: 0,
    tiebreaker_5: 0,
    tiebreaker_6: 0,
    tiebreaker_7: 0,
    special_bonus: 0,
    note: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [transferRes, schoolRes] = await Promise.all([
        internalApi.getAll(),
        schoolApi.getAll(),
      ]);
      setTransfers(transferRes.data);
      setSchools(schoolRes.data);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newTransfer.teacher_name || !newTransfer.current_school_id) {
      alert('교사명과 현소속학교를 입력해주세요.');
      return;
    }
    try {
      await internalApi.create(newTransfer);
      setNewTransfer({
        preference_round: '1희망',
        current_school_id: null,
        teacher_name: '',
        gender: '',
        birth_date: '',
        is_expired: false,
        is_priority: false,
        wish_school_1_id: null,
        wish_school_2_id: null,
        wish_school_3_id: null,
        total_score: 0,
        tiebreaker_1: 0,
        tiebreaker_2: 0,
        tiebreaker_3: 0,
        tiebreaker_4: 0,
        tiebreaker_5: 0,
        tiebreaker_6: 0,
        tiebreaker_7: 0,
        special_bonus: 0,
        note: '',
      });
      setShowAddForm(false);
      loadData();
    } catch (error) {
      console.error('추가 실패:', error);
    }
  };

  const handleEdit = (transfer: InternalTransfer) => {
    setEditingId(transfer.id);
    setEditForm({ ...transfer });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await internalApi.update(editingId, editForm);
      setEditingId(null);
      setEditForm({});
      loadData();
    } catch (error) {
      console.error('수정 실패:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await internalApi.delete(id);
      loadData();
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('모든 관내전출입 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    try {
      await internalApi.deleteAll();
      loadData();
    } catch (error) {
      console.error('전체 삭제 실패:', error);
    }
  };

  // 필터링된 목록
  const filteredTransfers = transfers.filter((t) => {
    if (filterStatus === 'assigned') return t.assigned_school_id !== null;
    if (filterStatus === 'unassigned') return t.assigned_school_id === null && !t.exclusion_reason;
    if (filterStatus === 'excluded') return t.exclusion_reason !== null;
    return true;
  });

  // 통계
  const stats = {
    total: transfers.length,
    assigned: transfers.filter((t) => t.assigned_school_id !== null).length,
    unassigned: transfers.filter((t) => t.assigned_school_id === null && !t.exclusion_reason).length,
    excluded: transfers.filter((t) => t.exclusion_reason !== null).length,
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">관내 전출입 관리</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowAddForm(true)} className="btn btn-primary">
            + 전출입 추가
          </button>
          <button onClick={handleDeleteAll} className="btn btn-danger">
            전체 삭제
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card cursor-pointer" onClick={() => setFilterStatus('all')}>
          <div className="text-sm text-gray-500">전체</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="card cursor-pointer" onClick={() => setFilterStatus('assigned')}>
          <div className="text-sm text-gray-500">배치완료</div>
          <div className="text-2xl font-bold text-green-600">{stats.assigned}</div>
        </div>
        <div className="card cursor-pointer" onClick={() => setFilterStatus('unassigned')}>
          <div className="text-sm text-gray-500">미배치</div>
          <div className="text-2xl font-bold text-orange-600">{stats.unassigned}</div>
        </div>
        <div className="card cursor-pointer" onClick={() => setFilterStatus('excluded')}>
          <div className="text-sm text-gray-500">제외</div>
          <div className="text-2xl font-bold text-gray-400">{stats.excluded}</div>
        </div>
      </div>

      {/* 추가 폼 */}
      {showAddForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">새 관내전출입 추가</h3>

          {/* 기본 정보 */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            <select
              className="select"
              value={newTransfer.current_school_id ?? ''}
              onChange={(e) => setNewTransfer({ ...newTransfer, current_school_id: e.target.value ? parseInt(e.target.value) : null })}
            >
              <option value="">현소속학교</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input
              type="text"
              placeholder="교사명"
              className="input"
              value={newTransfer.teacher_name}
              onChange={(e) => setNewTransfer({ ...newTransfer, teacher_name: e.target.value })}
            />
            <select
              className="select"
              value={newTransfer.gender}
              onChange={(e) => setNewTransfer({ ...newTransfer, gender: e.target.value })}
            >
              <option value="">성별</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
            <input
              type="date"
              className="input"
              value={newTransfer.birth_date}
              onChange={(e) => setNewTransfer({ ...newTransfer, birth_date: e.target.value })}
            />
            <select
              className="select"
              value={newTransfer.preference_round}
              onChange={(e) => setNewTransfer({ ...newTransfer, preference_round: e.target.value })}
            >
              <option value="1희망">1희망</option>
              <option value="2희망">2희망</option>
              <option value="3희망">3희망</option>
            </select>
          </div>

          {/* 희망학교 */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <select
              className="select"
              value={newTransfer.wish_school_1_id ?? ''}
              onChange={(e) => setNewTransfer({ ...newTransfer, wish_school_1_id: e.target.value ? parseInt(e.target.value) : null })}
            >
              <option value="">1지망</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              className="select"
              value={newTransfer.wish_school_2_id ?? ''}
              onChange={(e) => setNewTransfer({ ...newTransfer, wish_school_2_id: e.target.value ? parseInt(e.target.value) : null })}
            >
              <option value="">2지망</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select
              className="select"
              value={newTransfer.wish_school_3_id ?? ''}
              onChange={(e) => setNewTransfer({ ...newTransfer, wish_school_3_id: e.target.value ? parseInt(e.target.value) : null })}
            >
              <option value="">3지망</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* 점수 */}
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500">총점</label>
              <input
                type="number"
                className="input"
                value={newTransfer.total_score}
                onChange={(e) => setNewTransfer({ ...newTransfer, total_score: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">동점처리1</label>
              <input
                type="number"
                className="input"
                value={newTransfer.tiebreaker_1}
                onChange={(e) => setNewTransfer({ ...newTransfer, tiebreaker_1: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">동점처리2</label>
              <input
                type="number"
                className="input"
                value={newTransfer.tiebreaker_2}
                onChange={(e) => setNewTransfer({ ...newTransfer, tiebreaker_2: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">동점처리3</label>
              <input
                type="number"
                className="input"
                value={newTransfer.tiebreaker_3}
                onChange={(e) => setNewTransfer({ ...newTransfer, tiebreaker_3: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">특별가산</label>
              <input
                type="number"
                className="input"
                value={newTransfer.special_bonus}
                onChange={(e) => setNewTransfer({ ...newTransfer, special_bonus: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* 옵션 */}
          <div className="flex gap-6 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newTransfer.is_expired}
                onChange={(e) => setNewTransfer({ ...newTransfer, is_expired: e.target.checked })}
              />
              <span>만기자</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newTransfer.is_priority}
                onChange={(e) => setNewTransfer({ ...newTransfer, is_priority: e.target.checked })}
              />
              <span>우선배치</span>
            </label>
            <input
              type="text"
              placeholder="비고"
              className="input flex-1"
              value={newTransfer.note}
              onChange={(e) => setNewTransfer({ ...newTransfer, note: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <button onClick={handleAdd} className="btn btn-success">저장</button>
            <button onClick={() => setShowAddForm(false)} className="btn btn-secondary">취소</button>
          </div>
        </div>
      )}

      {/* 필터 */}
      <div className="flex gap-2 mb-4">
        {(['all', 'assigned', 'unassigned', 'excluded'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1 rounded text-sm ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {status === 'all' ? '전체' :
             status === 'assigned' ? '배치완료' :
             status === 'unassigned' ? '미배치' : '제외'}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <div className="card">
        <div className="table-container max-h-[600px]">
          <table className="data-table">
            <thead>
              <tr>
                <th>순번</th>
                <th>현소속</th>
                <th>교사명</th>
                <th>성별</th>
                <th>희망순위</th>
                <th>1지망</th>
                <th>2지망</th>
                <th>3지망</th>
                <th>총점</th>
                <th>배치학교</th>
                <th>상태</th>
                <th className="text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center text-gray-500 py-8">
                    데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                filteredTransfers.map((t, index) => (
                  <tr key={t.id} className={t.exclusion_reason ? 'bg-gray-100' : ''}>
                    <td>{index + 1}</td>
                    <td>{t.current_school_name}</td>
                    <td className="font-medium">
                      {t.teacher_name}
                      {t.is_expired && <span className="ml-1 text-xs text-red-600">[만기]</span>}
                      {t.is_priority && <span className="ml-1 text-xs text-blue-600">[우선]</span>}
                    </td>
                    <td>{t.gender}</td>
                    <td>{t.preference_round}</td>
                    <td>{t.wish_school_1_name}</td>
                    <td>{t.wish_school_2_name}</td>
                    <td>{t.wish_school_3_name}</td>
                    <td className="text-right">{t.total_score}</td>
                    <td className={t.assigned_school_name ? 'font-medium text-green-600' : ''}>
                      {t.assigned_school_name || '-'}
                    </td>
                    <td>
                      {t.exclusion_reason ? (
                        <span className="text-gray-500 text-xs">{t.exclusion_reason}</span>
                      ) : t.assigned_school_id ? (
                        <span className="text-green-600 text-xs">배치완료</span>
                      ) : (
                        <span className="text-orange-600 text-xs">미배치</span>
                      )}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleEdit(t)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 수정 모달 */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[800px] max-h-[90vh] overflow-auto">
            <h3 className="text-lg font-semibold mb-4">전출입 정보 수정</h3>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <select
                className="select"
                value={editForm.assigned_school_id ?? ''}
                onChange={(e) => setEditForm({ ...editForm, assigned_school_id: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">배치학교 선택</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input
                type="text"
                placeholder="제외사유"
                className="input"
                value={editForm.exclusion_reason ?? ''}
                onChange={(e) => setEditForm({ ...editForm, exclusion_reason: e.target.value || null })}
              />
              <input
                type="text"
                placeholder="비고"
                className="input"
                value={editForm.note ?? ''}
                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={handleSave} className="btn btn-success">저장</button>
              <button onClick={() => { setEditingId(null); setEditForm({}); }} className="btn btn-secondary">취소</button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        총 {filteredTransfers.length}건 표시 중 (전체 {transfers.length}건)
      </div>
    </div>
  );
}
