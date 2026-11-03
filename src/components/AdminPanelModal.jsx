import React, { useState, useRef } from 'react';
import { X, Loader2, FileText, Trash2, Edit3, Eye, FileCode, Send, Paperclip, MessageCircle, Copy, ExternalLink, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import { shareNoticeToKakao, copyNoticeLink, extractNoticeMeta } from '../utils/shareUtils';

export default function AdminPanelModal({ 
  onClose, 
  materials, 
  handleAddMaterial, 
  handleDeleteMaterial,
  isUploadingMaterial
}) {
  const [activeTab, setActiveTab] = useState('write'); // 'write' | 'preview'
  const [localContent, setLocalContent] = useState('');
  const [toast, setToast] = useState(null);
  const [expandedNotices, setExpandedNotices] = useState({});
  const fileInputRef = useRef(null);

  const toggleExpand = (id) => {
    setExpandedNotices(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleMdFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isMd = file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt');
    if (isMd) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        setLocalContent(text);
        setActiveTab('preview');
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  const onFormSubmit = async (e) => {
    e.preventDefault();
    const ok = await handleAddMaterial(e, localContent);
    if (ok !== false) {
      setLocalContent('');
      setActiveTab('write');
    }
  };

  return (
    <div className="song-modal-overlay" onClick={onClose}>
      <div className="song-modal-content admin-modal-content" onClick={e => e.stopPropagation()}>
        <div className="song-modal-header">
          <h3>관리자 메뉴 (공지 및 자료 등록)</h3>
          <button className="song-modal-close" onClick={onClose} title="닫기"><X size={20} /></button>
        </div>

        {toast && (
          <div style={{
            margin: '12px 24px 0 24px',
            padding: '10px 16px',
            borderRadius: '10px',
            background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
            border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
            color: toast.type === 'error' ? '#ef4444' : '#059669',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
            <span>{toast.message}</span>
          </div>
        )}
        
        <div className="admin-modal-body">
          {/* 새 공지 / 자료 등록 카드 */}
          <form onSubmit={onFormSubmit} className="admin-form-card">
            <div className="admin-form-header">
              <h4 className="admin-form-title">
                <Edit3 size={18} color="var(--primary)" /> 새로운 공지 / 자료 작성
              </h4>
              <div className="admin-toolbar">
                <label className="md-import-btn" title=".md 파일 내용 자동 가져오기">
                  <FileCode size={16} /> .md 파일 불러오기
                  <input 
                    type="file" 
                    accept=".md,.markdown,.txt" 
                    style={{ display: 'none' }} 
                    onChange={handleMdFileSelect}
                  />
                </label>
                <div className="admin-tab-group">
                  <button 
                    type="button" 
                    className={`admin-tab-btn ${activeTab === 'write' ? 'active' : ''}`}
                    onClick={() => setActiveTab('write')}
                  >
                    <Edit3 size={14} /> 편집
                  </button>
                  <button 
                    type="button" 
                    className={`admin-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('preview')}
                  >
                    <Eye size={14} /> 미리보기
                  </button>
                </div>
              </div>
            </div>

            {activeTab === 'write' ? (
              <textarea 
                className="text-input" 
                placeholder="공지사항이나 안내할 텍스트를 입력하세요.&#10;• 마크다운(# 제목, **굵게**, 표, mermaid 플로우차트)을 완벽 지원합니다.&#10;• 상단 '.md 파일 불러오기'를 누르면 문서 내용을 자동으로 채워줍니다." 
                value={localContent}
                onChange={e => setLocalContent(e.target.value)}
                style={{ minHeight: '160px', resize: 'vertical', lineHeight: '1.6', fontSize: '0.95rem' }}
              />
            ) : (
              <div className="admin-preview-box">
                {localContent.trim() ? (
                  <MarkdownRenderer content={localContent} />
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0, fontStyle: 'italic', textAlign: 'center', padding: '30px 0' }}>
                    입력된 내용이 없습니다. '편집' 탭에서 텍스트를 작성하거나 '.md 파일 불러오기'를 사용하세요.
                  </p>
                )}
              </div>
            )}

            {/* 하단 첨부파일 및 등록 버튼 바 */}
            <div className="admin-action-row">
              <div className="admin-file-picker-wrapper">
                <Paperclip size={16} color="var(--primary)" />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>파일 첨부:</span>
                <input 
                  type="file" 
                  name="materialFile" 
                  id="materialFile" 
                  ref={fileInputRef}
                  style={{ fontSize: '0.82rem', flex: 1, minWidth: 0 }} 
                  onChange={handleMdFileSelect}
                />
              </div>
              <button type="submit" className="admin-submit-btn" disabled={isUploadingMaterial}>
                {isUploadingMaterial ? (
                  <><Loader2 size={16} className="spin" /> 업로드 중...</>
                ) : (
                  <><Send size={16} /> 등록하기</>
                )}
              </button>
            </div>
          </form>

          {/* 등록된 항목 관리 리스트 */}
          <div>
            <h4 style={{ margin: '8px 0 14px 0', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--primary)" /> 등록된 항목 목록 ({materials.length}건)
            </h4>
            <div className="admin-materials-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {materials.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', background: 'rgba(255, 255, 255, 0.4)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.6)' }}>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>등록된 공지/자료가 없습니다.</p>
                </div>
              ) : null}
              {materials.map((mat) => {
                const isExpanded = !!expandedNotices[mat.id];
                const meta = extractNoticeMeta(mat.content, mat.fileName);

                return (
                  <div 
                    key={mat.id} 
                    style={{ 
                      border: '1px solid rgba(255, 255, 255, 0.9)', 
                      background: 'rgba(255, 255, 255, 0.88)', 
                      padding: '14px 16px', 
                      borderRadius: '16px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '10px', 
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)',
                      width: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* 항목 상단 헤더 (제목, 토글, 작성일시, 공유 및 삭제 버튼) */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingBottom: isExpanded ? '10px' : '4px', borderBottom: isExpanded ? '1px solid rgba(0, 0, 0, 0.06)' : 'none', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                        <button
                          type="button"
                          onClick={() => toggleExpand(mat.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '2px 0',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: 700,
                            fontSize: '0.92rem',
                            color: 'var(--text-main)',
                            textAlign: 'left'
                          }}
                          title={isExpanded ? '내용 접기' : '내용 펼쳐보기'}
                        >
                          {isExpanded ? <ChevronUp size={16} color="var(--primary)" /> : <ChevronDown size={16} color="#64748b" />}
                          <span style={{ color: isExpanded ? 'var(--primary)' : 'var(--text-main)' }}>{meta.title}</span>
                        </button>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {new Date(mat.created_at).toLocaleDateString('ko-KR')}
                        </span>
                        {mat.fileName && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'rgba(255, 107, 74, 0.1)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <Paperclip size={11} /> {mat.fileName}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button 
                          type="button"
                          onClick={() => shareNoticeToKakao({ id: mat.id, content: mat.content, fileName: mat.fileName, onToast: showToast })}
                          style={{
                            background: '#FEE500',
                            color: '#191919',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '5px 9px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
                          }}
                          title="카카오톡으로 공유"
                        >
                          <MessageCircle size={13} fill="#191919" /> 카톡
                        </button>
                        <button 
                          type="button"
                          onClick={async () => {
                            try {
                              await copyNoticeLink(mat.id);
                              showToast('공지 링크가 클립보드에 복사되었습니다!', 'success');
                            } catch(e) {
                              showToast('링크 복사 실패', 'error');
                            }
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.85)',
                            color: 'var(--text-main)',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            borderRadius: '8px',
                            padding: '5px 8px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                          title="링크 복사"
                        >
                          <Copy size={13} /> 복사
                        </button>
                        <a 
                          href={`/notice/${mat.id}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{
                            background: 'rgba(255, 255, 255, 0.85)',
                            color: 'var(--text-muted)',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            borderRadius: '8px',
                            padding: '6px 7px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none'
                          }}
                          title="공지 전용창 새 탭으로 열기"
                        >
                          <ExternalLink size={13} />
                        </a>
                        <button 
                          type="button"
                          style={{ 
                            width: '28px', 
                            height: '28px', 
                            minWidth: '28px',
                            padding: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ef4444', 
                            backgroundColor: '#fff', 
                            border: '1px solid #fee2e2', 
                            borderRadius: '8px', 
                            cursor: 'pointer', 
                            transition: 'all 0.2s ease',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                          }} 
                          onClick={() => handleDeleteMaterial(mat.id)}
                          title="항목 삭제"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* 접혀 있을 때: 가벼운 1줄 요약 박스 (클릭 시 펼치기) */}
                    {!isExpanded && (
                      <div 
                        onClick={() => toggleExpand(mat.id)}
                        style={{ 
                          fontSize: '0.84rem', 
                          color: 'var(--text-muted)', 
                          cursor: 'pointer', 
                          padding: '7px 10px', 
                          background: 'rgba(0, 0, 0, 0.02)', 
                          borderRadius: '8px', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          border: '1px dashed rgba(0, 0, 0, 0.08)'
                        }}
                        title="클릭하여 내용 펼쳐보기"
                      >
                        {meta.description || '내용 미리보기... (클릭하여 펼치기)'}
                      </div>
                    )}

                    {/* 펼쳐졌을 때만 마크다운 렌더링 (성능 부하 원천 차단) */}
                    {isExpanded && (mat.content || mat.fileUrl) && (
                      <div style={{ width: '100%', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                        <MarkdownRenderer content={mat.content} fileUrl={mat.fileUrl} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
