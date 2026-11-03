import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { shareNoticeToKakao, copyNoticeLink, getCachedNoticeById } from '../utils/shareUtils';
import { 
  FileText, 
  ArrowLeft, 
  Share2, 
  Copy, 
  Download, 
  Calendar, 
  Loader2, 
  AlertCircle, 
  CheckCircle2,
  Home,
  MessageCircle
} from 'lucide-react';

export default function NoticeView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const cached = id ? getCachedNoticeById(id) : null;
  const [notice, setNotice] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (message, type = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    document.title = 'Love Department';
    const fetchNotice = async () => {
      if (!id) {
        setError('올바르지 않은 공지사항 링크입니다.');
        setLoading(false);
        return;
      }

      const cachedItem = getCachedNoticeById(id);
      if (cachedItem) {
        setNotice(cachedItem);
        setLoading(false);
      } else {
        setLoading(true);
      }

      try {
        const { data, error: fetchErr } = await supabase
          .from('materials')
          .select('id, content, fileName:filename, fileUrl:fileurl, created_at')
          .eq('id', id)
          .single();

        if (fetchErr || !data) {
          if (!cachedItem) {
            setError('해당 공지사항을 찾을 수 없거나 삭제되었습니다.');
          }
        } else {
          setNotice(data);
        }
      } catch (err) {
        console.error('Fetch notice error:', err);
        if (!cachedItem) {
          setError('공지사항을 불러오는 중 오류가 발생했습니다.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNotice();
  }, [id]);

  const handleKakaoShare = () => {
    if (!notice) return;
    shareNoticeToKakao({
      id: notice.id,
      content: notice.content,
      fileName: notice.fileName,
      onToast: showToast
    });
  };

  const handleCopyLink = async () => {
    if (!notice) return;
    try {
      await copyNoticeLink(notice.id);
      showToast('공지 링크가 클립보드에 복사되었습니다!', 'success');
    } catch (e) {
      showToast('링크 복사에 실패했습니다.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: '16px' }}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>공지사항을 불러오는 중입니다...</p>
      </div>
    );
  }

  if (error || !notice) {
    return (
      <div className="app-container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '36px 24px' }}>
          <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px', color: 'var(--text-main)' }}>안내</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.6' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Home size={18} /> 사랑부 홈으로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`toast-notification ${toastMessage.type}`} style={{
          position: 'fixed',
          top: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          borderRadius: '12px',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 600,
          color: toastMessage.type === 'error' ? '#ef4444' : '#10b981',
          animation: 'slideDown 0.3s ease'
        }}>
          {toastMessage.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toastMessage.message}</span>
        </div>
      )}

      {/* Floating Glass Header */}
      <header className="header" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              onClick={() => navigate('/')}
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                borderRadius: '10px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--text-main)',
                transition: 'all 0.2s ease'
              }}
              title="사랑부 홈으로 이동"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="logo-title" style={{ fontSize: '1.25rem', margin: 0, cursor: 'pointer' }} onClick={() => navigate('/')}>
                사랑부 공지사항
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate('/')}
              style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Home size={15} /> 전체 주보 보기
            </button>
          </div>
        </div>
      </header>

      {/* Main Notice Content Area */}
      <main className="main-content" style={{ flex: 1, padding: '20px 16px 40px 16px', maxWidth: '840px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div className="card" style={{ padding: '24px 22px', borderRadius: '24px' }}>
          
          {/* Metadata Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingBottom: '16px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.85rem' }}>
              <Calendar size={15} />
              <span>{new Date(notice.created_at).toLocaleString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>

            {/* Quick Share Buttons in Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleKakaoShare}
                style={{
                  background: '#FEE500',
                  color: '#191919',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  transition: 'all 0.2s ease'
                }}
                title="카카오톡으로 공유"
              >
                <MessageCircle size={15} fill="#191919" /> 카카오톡 공유
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  color: 'var(--text-main)',
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease'
                }}
                title="링크 복사"
              >
                <Copy size={14} /> 링크 복사
              </button>
            </div>
          </div>

          {/* Attached File Download Button if exists */}
          {notice.fileName && (
            <div style={{ marginBottom: '24px' }}>
              <a 
                href={notice.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="material-file-btn btn btn-secondary"
                style={{ padding: '10px 16px', fontSize: '0.9rem', borderRadius: '10px' }}
              >
                <Download size={16} /> {notice.fileName} (다운로드)
              </a>
            </div>
          )}

          {/* Notice Markdown Body */}
          <div className="material-content" style={{ minHeight: '120px' }}>
            <MarkdownRenderer content={notice.content} fileUrl={notice.fileUrl} />
          </div>

          {/* Bottom Action Footer Bar */}
          <div style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1px solid rgba(0, 0, 0, 0.06)', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              이 공지사항을 카카오톡이나 링크로 다른 분들과 공유해 보세요.
            </p>
            <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '420px' }}>
              <button 
                type="button"
                className="btn" 
                onClick={handleKakaoShare}
                style={{ 
                  flex: 1, 
                  backgroundColor: '#FEE500', 
                  color: '#191919', 
                  fontWeight: 700, 
                  fontSize: '0.95rem',
                  padding: '12px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(254, 229, 0, 0.4)'
                }}
              >
                <MessageCircle size={18} fill="#191919" /> 카카오톡 공유
              </button>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={handleCopyLink}
                style={{ 
                  flex: 1, 
                  fontSize: '0.95rem', 
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.85)'
                }}
              >
                <Copy size={18} /> 링크 복사
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
