import React from 'react';
import { Search, Plus, X, Loader2, Image as ImageIcon, Edit3, Trash2 } from 'lucide-react';

export default function SongManagerModal({
  onClose,
  songSearchText,
  setSongSearchText,
  handleAddGlobalSong,
  filteredSongs,
  uploadingSongId,
  triggerGlobalImageUpload,
  handleOpenGallery,
  handleEditGlobalSong,
  handleDeleteGlobalSong
}) {
  return (
    <div className="song-modal-overlay" onClick={onClose}>
      <div className="song-modal-content" onClick={e => e.stopPropagation()}>
        <div className="song-modal-header">
          <h3>찬양 라이브러리 관리</h3>
          <button className="song-modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="song-search-box">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="찬양 제목 검색..." 
            value={songSearchText}
            onChange={(e) => setSongSearchText(e.target.value)}
            className="text-input"
          />
          <button className="btn btn-primary" onClick={handleAddGlobalSong} style={{ whiteSpace: 'nowrap', padding: '8px 16px' }}>
            <Plus size={16} /> 새 찬양
          </button>
        </div>

        <ul className="global-song-list">
          {filteredSongs.length === 0 && <li className="empty-message">검색 결과가 없습니다.</li>}
          {filteredSongs.map(song => (
            <li key={song.id} className="global-song-item">
              <span className="global-song-title">{song.title}</span>
              <div className="global-song-actions">
                {song.imageUrl ? (
                  <button className="song-btn view-image" onClick={() => handleOpenGallery(song.imageUrl)}>
                    <ImageIcon size={14} /> 악보 확인
                  </button>
                ) : (
                  <button className="song-btn upload-image" onClick={() => triggerGlobalImageUpload(song.id)} disabled={uploadingSongId === song.id}>
                    {uploadingSongId === song.id ? <Loader2 size={14} className="spin" /> : <ImageIcon size={14} />} 
                    {uploadingSongId === song.id ? '업로드중' : '악보 추가'}
                  </button>
                )}
                {song.imageUrl && (
                  <button className="song-btn upload-image" onClick={() => triggerGlobalImageUpload(song.id)} disabled={uploadingSongId === song.id} style={{ backgroundColor: '#fff3e0', color: '#e65100', border: '1px solid #ffe0b2' }}>
                    {uploadingSongId === song.id ? <Loader2 size={14} className="spin" /> : <ImageIcon size={14} />} 교체
                  </button>
                )}
                <div className="song-item-divider"></div>
                <button className="edit-btn" style={{ padding: '6px' }} onClick={() => handleEditGlobalSong(song.id, song.title)}>
                  <Edit3 size={14} />
                </button>
                <button className="edit-btn delete-btn" style={{ padding: '6px' }} onClick={() => handleDeleteGlobalSong(song.id, song.title, song.imageUrl)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
