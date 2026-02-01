import { useEffect, useState, useMemo } from 'react';
import { priorityApi, schoolApi } from '../services/api';
import type { PriorityTransfer, School } from '../types';

interface BulkRow {
  type_code: string;
  school_id: number | '';
  teacher_name: string;
  total_score: string;
  gender: string;
  birth_date: string;
  note: string;
}

const emptyRow = (): BulkRow => ({
  type_code: '우선',
  school_id: '',
  teacher_name: '',
  total_score: '',
  gender: '',
  birth_date: '',
  note: '',
});

export default function Priority() {
  const [priorities, setPriorities] = useState<PriorityTransfer[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<PriorityTransfer>>({});
  const [sortType, setSortType] = useState<'order' | 'name'>('order');

  // 대량 입력 폼
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [priorityRes, schoolRes] = await Promise.all([
        priorityApi.getAll(),
        schoolApi.getAll(),
      ]);
      setPriorities(priorityRes.data);
      setSchools(schoolRes.data);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 학교 가나다순 정렬
  const sortedSchools = useMemo(() => {
    return [...schools].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [schools]);

  // 목록 정렬
  const sortedData = useMemo(() => {
    const list = [...priorities];
    if (sortType === 'order') {
      const schoolOrderMap = new Map(schools.map(s => [s.id, s.display_order ?? 999]));
      return list.sort((a, b) => {
        const orderA = schoolOrderMap.get(a.school_id ?? 0) ?? 999;
        const orderB = schoolOrderMap.get(b.school_id ?? 0) ?? 999;
        return orderA - orderB;
      });
    } else {
      return list.sort((a, b) => (a.school_name || '').localeCompare(b.school_name || '', 'ko'));
    }
  }, [priorities, schools, sortType]);

  // 대량 입력 행 업데이트
  const updateBulkRow = (index: number, field: keyof BulkRow, value: string | number) => {
    const newRows = [...bulkRows];
    if (field === 'school_id') {
      newRows[index][field] = value === '' ? '' : Number(value);
    } else {
      newRows[index][field] = value as string;
    }
    setBulkRows(newRows);
    if (index === bulkRows.length - 1 && value !== '') {
      setBulkRows([...newRows, emptyRow()]);
    }
  };

  // 대량 입력 저장
  const handleBulkSave = async () => {
    const validRows = bulkRows.filter(row => row.teacher_name.trim() && row.school_id);
    if (validRows.length === 0) {
      alert('입력할 데이터가 없습니다.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const row of validRows) {
      try {
        const data: { type_code: string; school_id: number; teacher_name: string; total_score?: number; gender?: string; birth_date?: string; note?: string } = {
          type_code: row.type_code || '우선',
          school_id: row.school_id as number,
          teacher_name: row.teacher_name,
          note: row.note || '',
        };
        if (row.total_score) data.total_score = parseFloat(row.total_score);
        if (row.gender) data.gender = row.gender;
        if (row.birth_date) data.birth_date = row.birth_date;
        await priorityApi.create(data);
        successCount++;
      } catch {
        failCount++;
      }
    }

    alert(`${successCount}건 추가 완료${failCount > 0 ? `, ${failCount}건 실패` : ''}`);
    setBulkRows([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]);
    setShowBulkForm(false);
    loadData();
  };

  const handleEdit = (item: PriorityTransfer) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSave = async () => {
    if (!editingId) return;
    try {
      await priorityApi.update(editingId, editForm);
      setEditingId(null);
      setEditForm({});
      loadData();
    } catch (error) {
      console.error('수정 실패:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await priorityApi.delete(id);
      loadData();
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  // 우선전보/전보유예 건수
  const priorityCount = priorities.filter(p => p.type_code === '우선').length;
  const deferCount = priorities.filter(p => p.type_code === '전보유예').length;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">우선/유예 관리</h2>
        <button
          onClick={() => setShowBulkForm(!showBulkForm)}
          className={`px-4 py-2 rounded-lg ${showBulkForm ? 'bg-gray-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
        >
          {showBulkForm ? '입력 닫기' : '+ 우선/유예 추가'}
        </button>
      </div>

      {/* 탭 및 정렬 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <span className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium">
            우선전보 ({priorityCount})
          </span>
          <span className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium">
            전보유예 ({deferCount})
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSortType('order')}
            className={`px-3 py-1.5 rounded text-sm ${sortType === 'order' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            학교순
          </button>
          <button
            onClick={() => setSortType('name')}
            className={`px-3 py-1.5 rounded text-sm ${sortType === 'name' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            가나다순
          </button>
        </div>
      </div>

      {/* 대량 입력 폼 */}
      {showBulkForm && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-3">우선/유예 추가</h3>
          <p className="text-sm text-gray-500 mb-3">엑셀처럼 직접 입력하세요. Tab키로 다음 칸 이동</p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-2 py-1 text-center w-12">순</th>
                  <th className="border px-2 py-1 text-center w-16">구분</th>
                  <th className="border px-2 py-1 text-center w-32">현임교</th>
                  <th className="border px-2 py-1 text-center w-20">성명</th>
                  <th className="border px-2 py-1 text-center w-14">성별</th>
                  <th className="border px-2 py-1 text-center w-28">생년월일</th>
                  <th className="border px-2 py-1 text-center w-16">총점</th>
                  <th className="border px-2 py-1 text-center">비고</th>
                </tr>
              </thead>
              <tbody>
                {bulkRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border px-2 py-1 text-center text-gray-400 text-sm">{idx + 1}</td>
                    <td className="border p-0">
                      <select
                        className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent"
                        value={row.type_code}
                        onChange={(e) => updateBulkRow(idx, 'type_code', e.target.value)}
                      >
                        <option value="우선">우선</option>
                        <option value="전보유예">전보유예</option>
                      </select>
                    </td>
                    <td className="border p-0">
                      <select
                        className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent"
                        value={row.school_id}
                        onChange={(e) => updateBulkRow(idx, 'school_id', e.target.value)}
                      >
                        <option value="">학교 선택</option>
                        {sortedSchools.map((school) => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="border p-0">
                      <input type="text" className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="성명" value={row.teacher_name} onChange={(e) => updateBulkRow(idx, 'teacher_name', e.target.value)} />
                    </td>
                    <td className="border p-0">
                      <select className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-transparent" value={row.gender} onChange={(e) => updateBulkRow(idx, 'gender', e.target.value)}>
                        <option value="">-</option>
                        <option value="남">남</option>
                        <option value="여">여</option>
                      </select>
                    </td>
                    <td className="border p-0">
                      <input type="text" className="w-full px-2 py-1.5 border-0 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="YYYY.MM.DD" value={row.birth_date} onChange={(e) => updateBulkRow(idx, 'birth_date', e.target.value)} />
                    </td>
                    <td className="border p-0">
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-2 py-1.5 border-0 text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="총점"
                        value={row.total_score}
                        onChange={(e) => updateBulkRow(idx, 'total_score', e.target.value)}
                        disabled={row.type_code === '전보유예'}
                      />
                    </td>
                    <td className="border p-0">
                      <input type="text" className="w-full px-2 py-1.5 border-0 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="비고" value={row.note} onChange={(e) => updateBulkRow(idx, 'note', e.target.value)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleBulkSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">저장</button>
            <button onClick={() => { setShowBulkForm(false); setBulkRows([emptyRow(), emptyRow(), emptyRow(), emptyRow(), emptyRow()]); }} className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">취소</button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th className="w-12 whitespace-nowrap text-center">순</th>
                <th className="w-20 text-center">구분</th>
                <th className="w-24 text-center">현임교</th>
                <th className="w-20 text-center">성명</th>
                <th className="w-14 text-center">성별</th>
                <th className="w-28 text-center">생년월일</th>
                <th className="w-16 text-center">총점</th>
                <th className="w-40 text-center">비고</th>
                <th className="w-24 text-center whitespace-nowrap">관리</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-gray-500 py-8">
                    우선/유예 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                sortedData.map((item, index) => (
                  <tr key={item.id}>
                    {editingId === item.id ? (
                      <>
                        <td className="text-center">{index + 1}</td>
                        <td>
                          <select className="input w-full" value={(editForm as Partial<PriorityTransfer>).type_code ?? ''} onChange={(e) => setEditForm({ ...editForm, type_code: e.target.value })}>
                            <option value="우선">우선</option>
                            <option value="전보유예">전보유예</option>
                          </select>
                        </td>
                        <td>
                          <select className="input w-full" value={(editForm as Partial<PriorityTransfer>).school_id ?? ''} onChange={(e) => setEditForm({ ...editForm, school_id: parseInt(e.target.value) || null })}>
                            <option value="">학교 선택</option>
                            {sortedSchools.map((school) => (
                              <option key={school.id} value={school.id}>{school.name}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input type="text" className="input w-full" value={(editForm as Partial<PriorityTransfer>).teacher_name ?? ''} onChange={(e) => setEditForm({ ...editForm, teacher_name: e.target.value })} />
                        </td>
                        <td>
                          <select className="input w-full" value={(editForm as Partial<PriorityTransfer>).gender ?? ''} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                            <option value="">-</option>
                            <option value="남">남</option>
                            <option value="여">여</option>
                          </select>
                        </td>
                        <td>
                          <input type="text" className="input w-full text-center" placeholder="YYYY.MM.DD" value={(editForm as Partial<PriorityTransfer>).birth_date ?? ''} onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })} />
                        </td>
                        <td>
                          <input
                            type="number"
                            step="0.01"
                            className="input w-full text-center"
                            value={(editForm as Partial<PriorityTransfer>).total_score ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, total_score: e.target.value ? parseFloat(e.target.value) : null })}
                            disabled={editForm.type_code === '전보유예'}
                          />
                        </td>
                        <td>
                          <input type="text" className="input w-full" value={(editForm as Partial<PriorityTransfer>).note ?? ''} onChange={(e) => setEditForm({ ...editForm, note: e.target.value })} />
                        </td>
                        <td className="text-center">
                          <button onClick={handleSave} className="text-green-600 hover:text-green-800 mr-2">저장</button>
                          <button onClick={handleCancel} className="text-gray-600 hover:text-gray-800">취소</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="text-center">{index + 1}</td>
                        <td className="text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.type_code === '우선' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                            {item.type_code}
                          </span>
                        </td>
                        <td className="text-center">{item.school_name}</td>
                        <td className="text-center font-medium">{item.teacher_name}</td>
                        <td className="text-center">{item.gender || '-'}</td>
                        <td className="text-center">{item.birth_date || '-'}</td>
                        <td className="text-center">{item.type_code === '우선' ? (item.total_score ?? '-') : '-'}</td>
                        <td className="text-center text-gray-500">{item.note}</td>
                        <td className="text-center whitespace-nowrap">
                          <button onClick={() => handleEdit(item)} className="text-blue-600 hover:text-blue-800 mr-2">수정</button>
                          <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:text-red-800">삭제</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        총 {sortedData.length}건 (우선전보: {priorityCount}건, 전보유예: {deferCount}건)
      </div>
    </div>
  );
}
