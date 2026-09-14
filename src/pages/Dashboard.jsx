import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Edit2, Check, X, Calendar, Edit3, Image as ImageIcon, Plus, Loader2 } from 'lucide-react';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';

function getUpcomingSunday() {
  const d = new Date();
  const day = d.getDay();
  if (day !== 0) {
    d.setDate(d.getDate() + (7 - day));
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const date = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

const initialServiceOrders = [
  { id: 1, time: '09:00', name: '예배 전 찬양', assignee: '찬양팀', songs: [] },
  { id: 2, time: '09:15', name: '사도신경', assignee: '다같이' },
  { id: 3, time: '09:18', name: '찬양', assignee: '성가대', songs: [] },
  { id: 4, time: '09:25', name: '대표기도', assignee: '김사랑 선생님' },
  { id: 5, time: '09:30', name: '말씀 선포', assignee: '이목사님' },
  { id: 6, time: '09:50', name: '헌금 및 광고', assignee: '박인도 선생님' },
  { id: 7, time: '10:00', name: '주기도문', assignee: '다같이' },
];

const initialDetails = {
  sermon: '요한복음 3장 16절 (하나님의 사랑)',
  snackPrep: '최간식 선생님',
};

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(getUpcomingSunday());
  const [orders, setOrders] = useState([]);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);

  // UI States
  const [editingId, setEditingId] = useState(null);
  const [editAssignee, setEditAssignee] = useState('');
  const [editingDetail, setEditingDetail] = useState(null);
  const [editDetailValue, setEditDetailValue] = useState('');

  const [uploadingSongId, setUploadingSongId] = useState(null);
  const [viewImageUrl, setViewImageUrl] = useState(null);

  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [currentUploadTarget, setCurrentUploadTarget] = useState(null);

  useEffect(() => {
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      navigate('/login');
      return;
    }

    setLoading(true);
    const docRef = doc(db, 'service', selectedDate);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setOrders(data.orders || initialServiceOrders);
        setDetails(data.details || initialDetails);
      } else {
        // 문서가 없으면 초기 데이터 생성 (해당 주차)
        setDoc(docRef, {
          orders: initialServiceOrders,
          details: initialDetails
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error: ", error);
      alert("데이터를 불러오는 데 실패했습니다.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate, selectedDate]);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const saveFirestore = async (newOrders, newDetails = details) => {
    try {
      await updateDoc(doc(db, 'service', selectedDate), { orders: newOrders, details: newDetails });
    } catch (e) {
      console.error("Update failed", e);
      alert("저장에 실패했습니다.");
    }
  };

  const saveEdit = (id) => {
    const newOrders = orders.map(o => o.id === id ? { ...o, assignee: editAssignee } : o);
    setOrders(newOrders);
    setEditingId(null);
    saveFirestore(newOrders);
  };

  const saveDetailEdit = (key) => {
    const newDetails = { ...details, [key]: editDetailValue };
    setDetails(newDetails);
    setEditingDetail(null);
    saveFirestore(orders, newDetails);
  };

  // --- Song Management ---
  const addSong = (orderId) => {
    const newTitle = prompt("추가할 찬양 제목을 입력하세요:");
    if (!newTitle) return;

    const newOrders = orders.map(o => {
      if (o.id === orderId) {
        const newSongs = [...(o.songs || []), { id: Date.now().toString(), title: newTitle, imageUrl: null }];
        return { ...o, songs: newSongs };
      }
      return o;
    });
    setOrders(newOrders);
    saveFirestore(newOrders);
  };

  const removeSong = (orderId, songId) => {
    if (!window.confirm("이 찬양을 삭제하시겠습니까?")) return;
    const newOrders = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, songs: o.songs.filter(s => s.id !== songId) };
      }
      return o;
    });
    setOrders(newOrders);
    saveFirestore(newOrders);
  };

  const triggerImageUpload = (orderId, songId) => {
    setCurrentUploadTarget({ orderId, songId });
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUploadTarget) return;

    const { orderId, songId } = currentUploadTarget;
    setUploadingSongId(songId);

    const storagePath = `sheets/${selectedDate}/${orderId}_${songId}_${file.name}`;
    const storageReference = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageReference, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // progress can be tracked here if needed
      },
      (error) => {
        console.error("Upload failed", error);
        alert("이미지 업로드에 실패했습니다.");
        setUploadingSongId(null);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const newOrders = orders.map(o => {
          if (o.id === orderId) {
            const newSongs = o.songs.map(s => s.id === songId ? { ...s, imageUrl: downloadURL } : s);
            return { ...o, songs: newSongs };
          }
          return o;
        });
        setOrders(newOrders);
        saveFirestore(newOrders);
        setUploadingSongId(null);
        setCurrentUploadTarget(null);
        e.target.value = ''; // reset file input
      }
    );
  };

  if (loading && orders.length === 0) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>사랑부 예배</h1>
        <p>예배 준비 및 순서 담당자</p>
        <div className="header-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-picker-input"
            />
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={14} /> 로그아웃
          </button>
        </div>
      </header>

      <main className="main-content">
        
        {/* 숨겨진 파일 인풋 (악보 업로드용) */}
        <input 
          type="file" 
          accept="image/*"
          style={{ display: 'none' }}
          ref={fileInputRef}
          onChange={handleFileChange}
        />

        {/* 예배 순서 카드 */}
        <div className="card">
          <h2 className="card-title">예배 순서 및 담당자</h2>
          <ul className="order-list">
            {orders.map((order) => (
              <li key={order.id} className="order-item-wrapper">
                <div className="order-item">
                  <div className="order-info">
                    <span className="order-time">{order.time}</span>
                    <span className="order-name">{order.name}</span>
                  </div>
                  
                  <div className="order-assignee">
                    {editingId === order.id ? (
                      <>
                        <input 
                          type="text" 
                          value={editAssignee} 
                          onChange={(e) => setEditAssignee(e.target.value)}
                          className="text-input"
                          style={{ padding: '6px 10px', fontSize: '0.85rem', width: '100px' }}
                          autoFocus
                        />
                        <button className="edit-btn" onClick={() => saveEdit(order.id)} style={{ color: 'var(--secondary)' }}>
                          <Check size={18} />
                        </button>
                        <button className="edit-btn" onClick={() => setEditingId(null)} style={{ color: 'var(--error)' }}>
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="assignee-badge">{order.assignee}</span>
                        <button className="edit-btn" onClick={() => {
                          setEditingId(order.id);
                          setEditAssignee(order.assignee);
                        }}>
                          <Edit2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 찬양 관련 순서일 경우 찬양 리스트 표시 */}
                {order.songs !== undefined && (
                  <div className="song-list-container">
                    {order.songs.length > 0 ? (
                      <ul className="song-list">
                        {order.songs.map((song, idx) => (
                          <li key={song.id} className="song-item">
                            <div className="song-title">
                              <span className="song-number">{idx + 1}.</span>
                              {song.title}
                            </div>
                            <div className="song-actions">
                              {song.imageUrl ? (
                                <button className="song-btn view-image" onClick={() => setViewImageUrl(song.imageUrl)}>
                                  <ImageIcon size={14} /> 악보 보기
                                </button>
                              ) : (
                                <button 
                                  className="song-btn upload-image" 
                                  onClick={() => triggerImageUpload(order.id, song.id)}
                                  disabled={uploadingSongId === song.id}
                                >
                                  {uploadingSongId === song.id ? <Loader2 size={14} className="spin" /> : <ImageIcon size={14} />} 
                                  {uploadingSongId === song.id ? '업로드중' : '악보 추가'}
                                </button>
                              )}
                              <button className="song-btn delete-song" onClick={() => removeSong(order.id, song.id)}>
                                <X size={14} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="empty-songs">등록된 찬양이 없습니다.</div>
                    )}
                    <button className="add-song-btn" onClick={() => addSong(order.id)}>
                      <Plus size={14} /> 찬양 곡 추가하기
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* 상세 정보 카드 */}
        <div className="card">
          <h2 className="card-title">예배 상세 정보</h2>
          <div className="details-grid">
            
            {[
              { key: 'sermon', label: '오늘의 말씀' },
              { key: 'snackPrep', label: '간식 준비 담당' }
            ].map(({ key, label }) => (
              <div className="detail-item" key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div className="detail-label">{label}</div>
                  {editingDetail !== key && (
                    <button className="edit-btn" onClick={() => {
                      setEditingDetail(key);
                      setEditDetailValue(details[key] || '');
                    }} style={{ padding: '2px' }}>
                      <Edit3 size={14} />
                    </button>
                  )}
                </div>
                
                {editingDetail === key ? (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <input
                      type="text"
                      value={editDetailValue}
                      onChange={(e) => setEditDetailValue(e.target.value)}
                      className="text-input"
                      style={{ fontSize: '0.95rem' }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button className="btn btn-secondary" onClick={() => saveDetailEdit(key)} style={{ padding: '8px' }}>
                        저장
                      </button>
                      <button className="btn" onClick={() => setEditingDetail(null)} style={{ padding: '8px', backgroundColor: '#eee' }}>
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="detail-value">{details[key]}</div>
                )}
              </div>
            ))}

          </div>
        </div>

      </main>

      {/* 이미지 팝업 모달 */}
      {viewImageUrl && (
        <div className="image-modal-overlay" onClick={() => setViewImageUrl(null)}>
          <div className="image-modal-content" onClick={e => e.stopPropagation()}>
            <button className="image-modal-close" onClick={() => setViewImageUrl(null)}>
              <X size={24} color="#fff" />
            </button>
            <img src={viewImageUrl} alt="찬양 악보" className="sheet-music-image" />
          </div>
        </div>
      )}
    </div>
  );
}
