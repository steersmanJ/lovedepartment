import React from 'react';
import { Plus, X, Edit3, Trash2 } from 'lucide-react';

export default function MemberManagerModal({
  activeModalType, // 'teacher' | 'student' | null
  onClose,
  currentDepts, // teachers or students array
  modalTitle,
  modalAddDeptText,
  modalAddMemberText,
  handleAddDepartment,
  handleEditDepartment,
  handleDeleteDepartment,
  handleAddMember,
  handleEditMember,
  handleDeleteMember
}) {
  if (!activeModalType) return null;

  return (
    <div className="song-modal-overlay" onClick={onClose}>
      <div className="song-modal-content" onClick={e => e.stopPropagation()}>
        <div className="song-modal-header">
          <h3>{modalTitle}</h3>
          <button className="song-modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '16px 0', borderBottom: '1px solid #eee' }}>
          <button className="btn btn-primary" onClick={handleAddDepartment} style={{ width: '100%', padding: '10px' }}>
            <Plus size={16} /> {modalAddDeptText}
          </button>
        </div>

        <div className="depts-list" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '16px 0' }}>
          {currentDepts.length === 0 && <p className="empty-message">등록된 데이터가 없습니다.</p>}
          {currentDepts.map(dept => (
            <div key={dept.id} className="dept-card" style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
              <div className="dept-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #e0e0e0', paddingBottom: '8px' }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#333' }}>{dept.name}</h4>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="edit-btn" onClick={() => handleEditDepartment(dept.id, dept.name)}>
                    <Edit3 size={14} />
                  </button>
                  <button className="edit-btn delete-btn" onClick={() => handleDeleteDepartment(dept.id, dept.name)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              
              <ul className="members-list" style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0' }}>
                {dept.members && dept.members.map(member => (
                  <li key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#fff', border: '1px solid #eee', borderRadius: '4px', marginBottom: '4px' }}>
                    <span>{member.name}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="edit-btn" onClick={() => handleEditMember(dept.id, member.id, member.name)}>
                        <Edit3 size={12} />
                      </button>
                      <button className="edit-btn delete-btn" onClick={() => handleDeleteMember(dept.id, member.id, member.name)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              
              <button className="btn btn-secondary" onClick={() => handleAddMember(dept.id)} style={{ width: '100%', fontSize: '0.9rem', padding: '6px' }}>
                <Plus size={14} /> {modalAddMemberText}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
