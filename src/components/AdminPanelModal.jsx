import React from 'react';
import { X, Loader2, FileText, Trash2 } from 'lucide-react';

export default function AdminPanelModal({ 
  onClose, 
  materials, 
  handleAddMaterial, 
  handleDeleteMaterial,
  newMaterialContent,
  setNewMaterialContent,
  isUploadingMaterial
}) {
  return (
    <div className="song-modal-overlay" onClick={onClose}>
      <div className="song-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <div className="song-modal-header">
          <h3>관리자 메뉴 (공지 및 자료 등록)</h3>
          <button className="song-modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        
        <div style={{ padding: '16px 0' }}>
          <form onSubmit={handleAddMaterial} className="admin-material-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8f9fa', padding: '16px', borderRadius: '8px' }}>
            <h4>새로운 공지/자료 올리기</h4>
            <textarea 
              className="text-input" 
              placeholder="공지사항이나 안내할 텍스트를 입력하세요" 
              value={newMaterialContent}
              onChange={e => setNewMaterialContent(e.target.value)}
              style={{ minHeight: '80px', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input type="file" name="materialFile" id="materialFile" className="text-input" style={{ flex: 1, padding: '8px' }} />
              <button type="submit" className="btn btn-primary" disabled={isUploadingMaterial} style={{ padding: '8px 24px', whiteSpace: 'nowrap' }}>
                {isUploadingMaterial ? <><Loader2 size={16} className="spin" /> 업로드중</> : '등록하기'}
              </button>
            </div>
          </form>

          <h4 style={{ marginTop: '24px', marginBottom: '12px' }}>등록된 항목 관리</h4>
          <div className="admin-materials-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
            {materials.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>등록된 항목이 없습니다.</p> : null}
            {materials.map(mat => (
              <div key={mat.id} style={{ border: '1px solid #eee', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  {mat.content && <div style={{ fontSize: '0.9rem', marginBottom: '8px', whiteSpace: 'pre-line' }}>{mat.content}</div>}
                  {mat.fileName && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FileText size={14} /> {mat.fileName}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '8px' }}>
                    {new Date(mat.created_at).toLocaleString('ko-KR')}
                  </div>
                </div>
                <button className="btn" style={{ padding: '6px', color: 'var(--error)', backgroundColor: '#fff', border: '1px solid #ffebee' }} onClick={() => handleDeleteMaterial(mat.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
