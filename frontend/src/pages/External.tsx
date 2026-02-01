import { useEffect, useState } from 'react';
import { externalOutApi, externalInApi, schoolApi } from '../services/api';
import type { ExternalOut, ExternalIn, School } from '../types';

export default function External() {
  const [outList, setOutList] = useState<ExternalOut[]>([]);
  const [inList, setInList] = useState<ExternalIn[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'out' | 'in'>('out');

  // 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [newOut, setNewOut] = useState({
    transfer_type: '일반',
    school_id: 0,
    teacher_name: '',
    gender: '',
    destination: '',
    separate_quota: '',
    note: '',
  });
  const [newIn, setNewIn] = useState({
    transfer_type: '일반',
    origin_school: '',
    teacher_name: '',
    gender: '',
    assigned_school_id: null as number | null,
    separate_quota: '',
    note: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [outRes, inRes, schoolRes] = await Promise.all([
        externalOutApi.getAll(),
        externalInApi.getAll(),
        schoolApi.getAll(),
      ]);
      setOutList(outRes.data);
      setInList(inRes.data);
      setSchools(schoolRes.data);
    } catch (error) {
      console.error('데이터 로딩 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOut = async () => {
    if (!newOut.school_id || !newOut.teacher_name) {
      alert('필수 항목을 입력해주세요.');
      return;
    }
    try {
      await externalOutApi.create(newOut);
      setNewOut({
        transfer_type: '일반',
        school_id: 0,
        teacher_name: '',
        gender: '',
        destination: '',
        separate_quota: '',
        note: '',
      });
      setShowAddForm(false);
      loadData();
    } catch (error) {
      console.error('추가 실패:', error);
    }
  };

  const handleAddIn = async () => {
    if (!newIn.teacher_name) {
      alert('교사명을 입력해주세요.');
      return;
    }
    try {
      await externalInApi.create(newIn);
      setNewIn({
        transfer_type: '일반',
        origin_school: '',
        teacher_name: '',
        gender: '',
        assigned_school_id: null,
        separate_quota: '',
        note: '',
      });
      setShowAddForm(false);
      loadData();
    } catch (error) {
      console.error('추가 실패:', error);
    }
  };

  const handleDeleteOut = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await externalOutApi.delete(id);
      loadData();
    } catch (error) {
      console.error('삭제 실패:', error);
    }
  };

  const handleDeleteIn = async (id: number) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await externalInApi.delete(id);
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

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">관외 전출입 관리</h2>

      {/* 탭 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setActiveTab('out'); setShowAddForm(false); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'out'
              ? 'bg-orange-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          관외전출 ({outList.length})
        </button>
        <button
          onClick={() => { setActiveTab('in'); setShowAddForm(false); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'in'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          관외전입 ({inList.length})
        </button>
      </div>

      {/* 추가 버튼 */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAddForm(true)}
          className="btn btn-primary"
        >
          + {activeTab === 'out' ? '관외전출' : '관외전입'} 추가
        </button>
      </div>

      {/* 관외전출 추가 폼 */}
      {showAddForm && activeTab === 'out' && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">새 관외전출 추가</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <select
              className="select"
              value={newOut.transfer_type}
              onChange={(e) => setNewOut({ ...newOut, transfer_type: e.target.value })}
            >
              <option value="일반">일반</option>
              <option value="정원외">정원외</option>
            </select>
            <select
              className="select"
              value={newOut.school_id}
              onChange={(e) => setNewOut({ ...newOut, school_id: parseInt(e.target.value) || 0 })}
            >
              <option value="0">현소속학교 선택</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="교사명"
              className="input"
              value={newOut.teacher_name}
              onChange={(e) => setNewOut({ ...newOut, teacher_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <select
              className="select"
              value={newOut.gender}
              onChange={(e) => setNewOut({ ...newOut, gender: e.target.value })}
            >
              <option value="">성별</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
            <input
              type="text"
              placeholder="전출지"
              className="input"
              value={newOut.destination}
              onChange={(e) => setNewOut({ ...newOut, destination: e.target.value })}
            />
            <input
              type="text"
              placeholder="별도정원"
              className="input"
              value={newOut.separate_quota}
              onChange={(e) => setNewOut({ ...newOut, separate_quota: e.target.value })}
            />
            <input
              type="text"
              placeholder="비고"
              className="input"
              value={newOut.note}
              onChange={(e) => setNewOut({ ...newOut, note: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddOut} className="btn btn-success">저장</button>
            <button onClick={() => setShowAddForm(false)} className="btn btn-secondary">취소</button>
          </div>
        </div>
      )}

      {/* 관외전입 추가 폼 */}
      {showAddForm && activeTab === 'in' && (
        <div className="card mb-6">
          <h3 className="text-lg font-semibold mb-4">새 관외전입 추가</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <select
              className="select"
              value={newIn.transfer_type}
              onChange={(e) => setNewIn({ ...newIn, transfer_type: e.target.value })}
            >
              <option value="일반">일반</option>
              <option value="정원외">정원외</option>
            </select>
            <input
              type="text"
              placeholder="원소속학교"
              className="input"
              value={newIn.origin_school}
              onChange={(e) => setNewIn({ ...newIn, origin_school: e.target.value })}
            />
            <input
              type="text"
              placeholder="교사명"
              className="input"
              value={newIn.teacher_name}
              onChange={(e) => setNewIn({ ...newIn, teacher_name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <select
              className="select"
              value={newIn.gender}
              onChange={(e) => setNewIn({ ...newIn, gender: e.target.value })}
            >
              <option value="">성별</option>
              <option value="남">남</option>
              <option value="여">여</option>
            </select>
            <select
              className="select"
              value={newIn.assigned_school_id ?? ''}
              onChange={(e) => setNewIn({ ...newIn, assigned_school_id: e.target.value ? parseInt(e.target.value) : null })}
            >
              <option value="">배치학교 선택</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="별도정원"
              className="input"
              value={newIn.separate_quota}
              onChange={(e) => setNewIn({ ...newIn, separate_quota: e.target.value })}
            />
            <input
              type="text"
              placeholder="비고"
              className="input"
              value={newIn.note}
              onChange={(e) => setNewIn({ ...newIn, note: e.target.value })}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleAddIn} className="btn btn-success">저장</button>
            <button onClick={() => setShowAddForm(false)} className="btn btn-secondary">취소</button>
          </div>
        </div>
      )}

      {/* 관외전출 목록 */}
      {activeTab === 'out' && (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>순번</th>
                  <th>유형</th>
                  <th>현소속</th>
                  <th>교사명</th>
                  <th>성별</th>
                  <th>전출지</th>
                  <th>별도정원</th>
                  <th>비고</th>
                  <th className="text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {outList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-gray-500 py-8">
                      관외전출 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  outList.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>{item.transfer_type}</td>
                      <td>{item.school_name}</td>
                      <td className="font-medium">{item.teacher_name}</td>
                      <td>{item.gender}</td>
                      <td>{item.destination}</td>
                      <td>{item.separate_quota}</td>
                      <td className="text-gray-500">{item.note}</td>
                      <td className="text-center">
                        <button
                          onClick={() => handleDeleteOut(item.id)}
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
      )}

      {/* 관외전입 목록 */}
      {activeTab === 'in' && (
        <div className="card">
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>순번</th>
                  <th>유형</th>
                  <th>원소속</th>
                  <th>교사명</th>
                  <th>성별</th>
                  <th>배치학교</th>
                  <th>별도정원</th>
                  <th>비고</th>
                  <th className="text-center">관리</th>
                </tr>
              </thead>
              <tbody>
                {inList.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-gray-500 py-8">
                      관외전입 데이터가 없습니다.
                    </td>
                  </tr>
                ) : (
                  inList.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>{item.transfer_type}</td>
                      <td>{item.origin_school}</td>
                      <td className="font-medium">{item.teacher_name}</td>
                      <td>{item.gender}</td>
                      <td>{item.assigned_school_name || '-'}</td>
                      <td>{item.separate_quota}</td>
                      <td className="text-gray-500">{item.note}</td>
                      <td className="text-center">
                        <button
                          onClick={() => handleDeleteIn(item.id)}
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
      )}

      <div className="mt-4 text-sm text-gray-500">
        총 {activeTab === 'out' ? outList.length : inList.length}건
      </div>
    </div>
  );
}
