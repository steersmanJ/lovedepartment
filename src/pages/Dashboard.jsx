import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Edit2, Check, X, Calendar, Edit3, Image as ImageIcon, Plus, Loader2, Lock, Unlock, ChevronUp, ChevronDown, Trash2, Search, Music, Users, GraduationCap, Maximize, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabaseClient';

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
  { id: 5, time: '09:30', name: '말씀 선포', assignee: '이목사님', scriptureRef: '', sermonTitle: '' },
  { id: 6, time: '09:50', name: '헌금 및 광고', assignee: '박인도 선생님' },
  { id: 7, time: '10:00', name: '주기도문', assignee: '다같이' },
];

const initialDetails = {
  fullScripture: '하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라',
  snackPrep: '최간식 선생님',
};

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(getUpcomingSunday());
  const [orders, setOrders] = useState([]);
  const [details, setDetails] = useState({});
  const [loading, setLoading] = useState(true);

  // Global Library States
  const [globalSongs, setGlobalSongs] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  // UI States
  const [isOrderEditMode, setIsOrderEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Edit Form States for Orders
  const [editAssignee, setEditAssignee] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editName, setEditName] = useState('');
  const [editScriptureRef, setEditScriptureRef] = useState('');
  const [editSermonTitle, setEditSermonTitle] = useState('');

  // Details
  const [editingDetail, setEditingDetail] = useState(null);
  const [editDetailValue, setEditDetailValue] = useState('');

  // Modal States
  const [showSongModalForOrder, setShowSongModalForOrder] = useState(null);
  const [songSearchText, setSongSearchText] = useState('');
  
  const [activeModalType, setActiveModalType] = useState(null); // 'teacher' | 'student' | null
  const [showSongManagerModal, setShowSongManagerModal] = useState(false);

  const [uploadingSongId, setUploadingSongId] = useState(null);
  const [viewImageState, setViewImageState] = useState(null);

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
    
    const fetchAllData = async () => {
      // 1. Schedules
      const { data: schedData } = await supabase.from('schedules').select('*').eq('date', selectedDate).single();
      if (schedData) {
        setOrders(schedData.orders || initialServiceOrders);
        setDetails(schedData.details || initialDetails);
      } else {
        await supabase.from('schedules').insert({ date: selectedDate, orders: initialServiceOrders, details: initialDetails });
        setOrders(initialServiceOrders);
        setDetails(initialDetails);
      }

      // 2. Global Songs
      const { data: songsData } = await supabase.from('songs').select('*');
      if (songsData) setGlobalSongs(songsData);

      // 3. Members
      const { data: membersData } = await supabase.from('settings').select('data').eq('id', 'members').single();
      if (membersData && membersData.data) {
        setTeachers(membersData.data.teachers || []);
        setStudents(membersData.data.students || []);
      }

      setLoading(false);
    };

    fetchAllData();
  }, [navigate, selectedDate]);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  const saveFirestore = async (newOrders, newDetails = details) => {
    try {
      await supabase.from('schedules').update({ orders: newOrders, details: newDetails }).eq('date', selectedDate);
    } catch (e) {
      console.error("Update failed", e);
      alert("저장에 실패했습니다.");
    }
  };

  const saveMembersFirestore = async (newTeachers, newStudents) => {
    try {
      await supabase.from('settings').update({ data: { teachers: newTeachers, students: newStudents } }).eq('id', 'members');
    } catch (e) {
      console.error("Members update failed", e);
      alert("데이터 저장에 실패했습니다.");
    }
  };

  // --- Order Management ---
  const startEdit = (order) => {
    setEditingId(order.id);
    setEditAssignee(order.assignee || '');
    setEditTime(order.time || '');
    setEditName(order.name || '');
    setEditScriptureRef(order.scriptureRef || '');
    setEditSermonTitle(order.sermonTitle || '');
  };

  const saveEdit = (id) => {
    const newOrders = orders.map(o => o.id === id ? { 
      ...o, 
      assignee: editAssignee,
      time: editTime,
      name: editName,
      scriptureRef: editScriptureRef,
      sermonTitle: editSermonTitle
    } : o);
    setOrders(newOrders);
    setEditingId(null);
    saveFirestore(newOrders);
  };

  const moveOrderUp = (index) => {
    if (index === 0) return;
    const newOrders = [...orders];
    const temp = newOrders[index - 1];
    newOrders[index - 1] = newOrders[index];
    newOrders[index] = temp;
    setOrders(newOrders);
    saveFirestore(newOrders);
  };

  const moveOrderDown = (index) => {
    if (index === orders.length - 1) return;
    const newOrders = [...orders];
    const temp = newOrders[index + 1];
    newOrders[index + 1] = newOrders[index];
    newOrders[index] = temp;
    setOrders(newOrders);
    saveFirestore(newOrders);
  };

  const deleteOrder = (id) => {
    if (!window.confirm("이 순서를 삭제하시겠습니까?")) return;
    const newOrders = orders.filter(o => o.id !== id);
    setOrders(newOrders);
    saveFirestore(newOrders);
  };

  const addNewOrder = () => {
    const newOrder = { id: Date.now(), time: '00:00', name: '새로운 순서', assignee: '담당자' };
    const newOrders = [...orders, newOrder];
    setOrders(newOrders);
    saveFirestore(newOrders);
    startEdit(newOrder);
  };

  // --- Detail Editing ---
  const saveDetailEdit = (key) => {
    const newDetails = { ...details, [key]: editDetailValue };
    setDetails(newDetails);
    setEditingDetail(null);
    saveFirestore(orders, newDetails);
  };

  // --- Song Management (Auto Complete & Global Manager) ---
  const handleOpenGallery = (startUrl) => {
    const galleryImages = [];
    orders.forEach(order => {
      if (order.songs) {
        order.songs.forEach(song => {
          if (song.imageUrl) {
            galleryImages.push({
              url: song.imageUrl,
              title: song.title,
              subtitle: order.name
            });
          }
        });
      }
    });
    const startIndex = galleryImages.findIndex(img => img.url === startUrl);
    setViewImageState({
      type: 'gallery',
      index: startIndex !== -1 ? startIndex : 0,
      images: galleryImages
    });
  };

  const handleSelectSong = (orderId, title, imageUrl = null) => {
    if (!title.trim()) return;
    const newOrders = orders.map(o => {
      if (o.id === orderId) {
        const newSongs = [...(o.songs || []), { id: Date.now().toString(), title, imageUrl }];
        return { ...o, songs: newSongs };
      }
      return o;
    });
    setOrders(newOrders);
    saveFirestore(newOrders);
    setShowSongModalForOrder(null);
    setSongSearchText('');
    
    const existing = globalSongs.find(g => g.title === title);
    if (!existing) {
      const addSong = async () => {
        const { data } = await supabase.from('songs').insert({ title, imageUrl: imageUrl || null }).select().single();
        if (data) setGlobalSongs(prev => [...prev, data]);
      };
      addSong();
    }
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
    setCurrentUploadTarget({ type: 'order', orderId, songId });
    if (fileInputRef.current) fileInputRef.current.click();
  };
  
  const triggerGlobalImageUpload = (songId) => {
    setCurrentUploadTarget({ type: 'library', songId });
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUploadTarget) return;

    const { type, orderId, songId } = currentUploadTarget;
    setUploadingSongId(songId);

    const fileExt = file.name.split('.').pop();
    const fileName = `${songId}_${Date.now()}.${fileExt}`;
    const filePath = type === 'library' 
      ? `global/${fileName}`
      : `${selectedDate}/${fileName}`;
      
    const { error: uploadError } = await supabase.storage.from('sheet-music').upload(filePath, file);

    if (uploadError) {
      console.error("Upload failed", uploadError);
      alert("이미지 업로드에 실패했습니다.");
      setUploadingSongId(null);
      e.target.value = '';
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('sheet-music').getPublicUrl(filePath);
    const downloadURL = publicUrlData.publicUrl;

    if (type === 'library') {
      await supabase.from('songs').update({ imageUrl: downloadURL }).eq('id', songId);
      setGlobalSongs(globalSongs.map(s => s.id === songId ? { ...s, imageUrl: downloadURL } : s));
    } else {
      // Update order
      let songTitle = '';
      const newOrders = orders.map(o => {
        if (o.id === orderId) {
          const newSongs = o.songs.map(s => {
            if (s.id === songId) {
              songTitle = s.title;
              return { ...s, imageUrl: downloadURL };
            }
            return s;
          });
          return { ...o, songs: newSongs };
        }
        return o;
      });
      setOrders(newOrders);
      saveFirestore(newOrders);

      if (songTitle) {
        const existing = globalSongs.find(g => g.title === songTitle);
        if (existing) {
          await supabase.from('songs').update({ imageUrl: downloadURL }).eq('id', existing.id);
          setGlobalSongs(globalSongs.map(s => s.id === existing.id ? { ...s, imageUrl: downloadURL } : s));
        } else {
          const addSong = async () => {
            const { data } = await supabase.from('songs').insert({ title: songTitle, imageUrl: downloadURL }).select().single();
            if(data) setGlobalSongs(prev => [...prev, data]);
          };
          addSong();
        }
      }
    }

    setUploadingSongId(null);
    setCurrentUploadTarget(null);
    e.target.value = '';
  };

  // Global Song Manager CRUD
  const handleAddGlobalSong = async () => {
    const title = prompt("추가할 찬양 제목을 입력하세요");
    if (!title || !title.trim()) return;
    const existing = globalSongs.find(g => g.title === title.trim());
    if (existing) {
      alert("이미 등록된 찬양입니다.");
      return;
    }
    const { data } = await supabase.from('songs').insert({ title: title.trim(), imageUrl: null }).select().single();
    if(data) setGlobalSongs([...globalSongs, data]);
  };

  const handleEditGlobalSong = async (id, oldTitle) => {
    const newTitle = prompt("찬양 제목을 수정하세요", oldTitle);
    if (!newTitle || !newTitle.trim()) return;
    await supabase.from('songs').update({ title: newTitle.trim() }).eq('id', id);
    setGlobalSongs(globalSongs.map(s => s.id === id ? { ...s, title: newTitle.trim() } : s));
  };

  const handleDeleteGlobalSong = async (id, title) => {
    if (!window.confirm(`'${title}' 찬양을 명단에서 삭제하시겠습니까?\n(과거 예배 순서에 입력된 내용은 유지됩니다.)`)) return;
    await supabase.from('songs').delete().eq('id', id);
    setGlobalSongs(globalSongs.filter(s => s.id !== id));
  };


  const filteredSongs = globalSongs.filter(s => s.title && s.title.includes(songSearchText));

  // --- Members Management (Teacher & Student) ---
  const handleAddDepartment = () => {
    const entityName = activeModalType === 'teacher' ? '교사 부서' : '학생 반';
    const name = prompt(`새로운 ${entityName}의 이름을 입력하세요`);
    if (!name || !name.trim()) return;
    
    const newDept = { id: Date.now().toString(), name: name.trim(), members: [] };
    if (activeModalType === 'teacher') saveMembersFirestore([...teachers, newDept], students);
    else saveMembersFirestore(teachers, [...students, newDept]);
  };

  const handleEditDepartment = (deptId, oldName) => {
    const entityName = activeModalType === 'teacher' ? '부서' : '반';
    const name = prompt(`${entityName} 이름을 수정하세요`, oldName);
    if (!name || !name.trim()) return;
    
    if (activeModalType === 'teacher') {
      saveMembersFirestore(teachers.map(d => d.id === deptId ? { ...d, name: name.trim() } : d), students);
    } else {
      saveMembersFirestore(teachers, students.map(d => d.id === deptId ? { ...d, name: name.trim() } : d));
    }
  };

  const handleDeleteDepartment = (deptId, name) => {
    const entityName = activeModalType === 'teacher' ? '부서' : '반';
    const personName = activeModalType === 'teacher' ? '교사' : '학생';
    if (!window.confirm(`'${name}' ${entityName}와 소속된 모든 ${personName}를 삭제하시겠습니까?`)) return;
    
    if (activeModalType === 'teacher') {
      saveMembersFirestore(teachers.filter(d => d.id !== deptId), students);
    } else {
      saveMembersFirestore(teachers, students.filter(d => d.id !== deptId));
    }
  };

  const handleAddMember = (deptId) => {
    const personName = activeModalType === 'teacher' ? '교사' : '학생';
    const name = prompt(`새 ${personName} 이름을 입력하세요`);
    if (!name || !name.trim()) return;
    const newMember = { id: Date.now().toString(), name: name.trim() };
    
    if (activeModalType === 'teacher') {
      saveMembersFirestore(teachers.map(d => d.id === deptId ? { ...d, members: [...d.members, newMember] } : d), students);
    } else {
      saveMembersFirestore(teachers, students.map(d => d.id === deptId ? { ...d, members: [...d.members, newMember] } : d));
    }
  };

  const handleEditMember = (deptId, memberId, oldName) => {
    const personName = activeModalType === 'teacher' ? '교사' : '학생';
    const name = prompt(`${personName} 이름을 수정하세요`, oldName);
    if (!name || !name.trim()) return;
    
    const updateMembers = (d) => d.id === deptId ? { ...d, members: d.members.map(m => m.id === memberId ? { ...m, name: name.trim() } : m) } : d;
    
    if (activeModalType === 'teacher') {
      saveMembersFirestore(teachers.map(updateMembers), students);
    } else {
      saveMembersFirestore(teachers, students.map(updateMembers));
    }
  };

  const handleDeleteMember = (deptId, memberId, name) => {
    const personName = activeModalType === 'teacher' ? '교사' : '학생';
    if (!window.confirm(`'${name}' ${personName}를 삭제하시겠습니까?`)) return;
    
    const deleteMembers = (d) => d.id === deptId ? { ...d, members: d.members.filter(m => m.id !== memberId) } : d;

    if (activeModalType === 'teacher') {
      saveMembersFirestore(teachers.map(deleteMembers), students);
    } else {
      saveMembersFirestore(teachers, students.map(deleteMembers));
    }
  };


  if (loading && orders.length === 0) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <p>로딩 중...</p>
      </div>
    );
  }

  const currentDepts = activeModalType === 'teacher' ? teachers : students;
  const modalTitle = activeModalType === 'teacher' ? '교사 관리' : '학생 관리';
  const modalAddDeptText = activeModalType === 'teacher' ? '새 부서 추가하기' : '새 반 추가하기';
  const modalAddMemberText = activeModalType === 'teacher' ? '교사 추가' : '학생 추가';

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>사랑부 예배</h1>
        <p>예배 준비 및 순서 담당자</p>
        <div className="header-actions" style={{ flexWrap: 'wrap', justifyContent: 'flex-end', rowGap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} />
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-picker-input"
            />
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button className="logout-btn" style={{ backgroundColor: 'rgba(255,255,255,0.3)', padding: '6px 8px' }} onClick={() => setShowSongManagerModal(true)}>
              <Music size={14} /> 찬양 관리
            </button>
            <button className="logout-btn" style={{ backgroundColor: 'rgba(255,255,255,0.3)', padding: '6px 8px' }} onClick={() => setActiveModalType('teacher')}>
              <Users size={14} /> 교사 관리
            </button>
            <button className="logout-btn" style={{ backgroundColor: 'rgba(255,255,255,0.3)', padding: '6px 8px' }} onClick={() => setActiveModalType('student')}>
              <GraduationCap size={14} /> 학생 관리
            </button>
            <button className="logout-btn" style={{ padding: '6px' }} onClick={handleLogout} title="로그아웃">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        
        <input type="file" accept="image/*" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileChange} />

        {/* 예배 순서 카드 */}
        <div className="card">
          <div className="card-title-row">
            <h2 className="card-title" style={{ marginBottom: 0 }}>예배 순서 및 담당자</h2>
            <button 
              className={`toggle-lock-btn ${isOrderEditMode ? 'unlocked' : ''}`} 
              onClick={() => setIsOrderEditMode(!isOrderEditMode)}
            >
              {isOrderEditMode ? <><Unlock size={14} /> 순서 잠금 풀림</> : <><Lock size={14} /> 순서 잠금 상태</>}
            </button>
          </div>
          
          <ul className="order-list" style={{ marginTop: '16px' }}>
            {orders.map((order, index) => (
              <li key={order.id} className="order-item-wrapper">
                {isOrderEditMode && editingId !== order.id && (
                  <div className="order-reorder-controls">
                    <button className="reorder-btn" onClick={() => moveOrderUp(index)} disabled={index === 0}>
                      <ChevronUp size={20} />
                    </button>
                    <button className="reorder-btn" onClick={() => moveOrderDown(index)} disabled={index === orders.length - 1}>
                      <ChevronDown size={20} />
                    </button>
                    <button className="reorder-btn delete-order" onClick={() => deleteOrder(order.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
                
                <div className={`order-item ${isOrderEditMode ? 'edit-mode-active' : ''}`}>
                  {editingId === order.id ? (
                    <div className="order-edit-form">
                      <div className="edit-row">
                        <div className="input-with-label time-wrapper">
                          <label>시간</label>
                          <input type="text" value={editTime} onChange={e => setEditTime(e.target.value)} className="text-input time-input" />
                        </div>
                        <div className="input-with-label assignee-wrapper" style={{flex: 1}}>
                          <label>담당자</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <input 
                              type="text" 
                              value={editAssignee} 
                              onChange={e => setEditAssignee(e.target.value)} 
                              className="text-input assignee-input" 
                            />
                            {/* Autocomplete Dropdown */}
                            <select 
                              className="assignee-select" 
                              onChange={(e) => {
                                if (e.target.value) setEditAssignee(e.target.value);
                                e.target.value = '';
                              }}
                            >
                              <option value="">▼ 선택</option>
                              {teachers.map(d => (
                                <optgroup label={`[교사] ${d.name}`} key={`t-${d.id}`}>
                                  {d.members.map(m => (
                                    <option value={m.name} key={`m-${m.id}`}>{m.name}</option>
                                  ))}
                                </optgroup>
                              ))}
                              {students.map(d => (
                                <optgroup label={`[학생] ${d.name}`} key={`s-${d.id}`}>
                                  {d.members.map(m => (
                                    <option value={m.name} key={`m-${m.id}`}>{m.name}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="edit-row">
                        <div className="input-with-label name-wrapper" style={{flex: 1}}>
                          <label>순서명</label>
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="text-input name-input" />
                        </div>
                      </div>
                      {editName.includes('말씀 선포') && (
                        <div className="edit-sermon-row">
                          <div className="input-with-label">
                            <label>성경 구절 (예: 요한복음 3:16)</label>
                            <input type="text" value={editScriptureRef} onChange={e => setEditScriptureRef(e.target.value)} className="text-input" />
                          </div>
                          <div className="input-with-label">
                            <label>말씀 제목 (예: 하나님의 사랑)</label>
                            <input type="text" value={editSermonTitle} onChange={e => setEditSermonTitle(e.target.value)} className="text-input" />
                          </div>
                        </div>
                      )}
                      <div className="edit-actions">
                        <button className="btn btn-secondary" onClick={() => saveEdit(order.id)}><Check size={16} /> 저장</button>
                        <button className="btn" onClick={() => setEditingId(null)} style={{ backgroundColor: '#eee' }}><X size={16} /> 취소</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="order-info-col">
                        <div className="order-info">
                          <span className="order-time">{order.time}</span>
                          <span className="order-name">{order.name}</span>
                        </div>
                        {order.name.includes('말씀 선포') && (
                          <div className="sermon-info">
                            <span className={`sermon-ref ${!order.scriptureRef ? 'empty-text' : ''}`}>
                              {order.scriptureRef || '(성경 구절을 입력해주세요)'}
                            </span>
                            <span className={`sermon-title ${!order.sermonTitle ? 'empty-text' : ''}`}>
                              {order.sermonTitle ? `"${order.sermonTitle}"` : '(말씀 제목을 입력해주세요)'}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="order-assignee">
                        <span className="assignee-badge">{order.assignee}</span>
                        <button className="edit-btn" onClick={() => startEdit(order)}>
                          <Edit2 size={16} />
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* 찬양 리스트 */}
                {(order.name.includes('예배 전 찬양') || order.name === '찬양' || order.songs) && !editingId && (
                  <div className={`song-list-container ${isOrderEditMode ? 'edit-mode-active' : ''}`}>
                    {order.songs && order.songs.length > 0 ? (
                      <ul className="song-list">
                        {order.songs.map((song, idx) => (
                          <li key={song.id} className="song-item">
                            <div className="song-title">
                              <span className="song-number">{idx + 1}.</span>
                              {song.title}
                            </div>
                            <div className="song-actions">
                              {song.imageUrl ? (
                                <button className="song-btn view-image" onClick={() => handleOpenGallery(song.imageUrl)}>
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
                    <button className="add-song-btn" onClick={() => { setShowSongModalForOrder(order.id); setSongSearchText(''); }}>
                      <Plus size={14} /> 찬양 곡 추가하기
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          
          {isOrderEditMode && (
            <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={addNewOrder}>
              <Plus size={16} /> 예배 순서 추가하기
            </button>
          )}
        </div>

        {/* 상세 정보 카드 */}
        <div className="card">
          <h2 className="card-title">예배 상세 정보</h2>
          <div className="details-grid">
            {[
              { key: 'fullScripture', label: '본문 말씀 (전체 구절)' },
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
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexDirection: key === 'fullScripture' ? 'column' : 'row' }}>
                    {key === 'fullScripture' ? (
                      <textarea
                        value={editDetailValue}
                        onChange={(e) => setEditDetailValue(e.target.value)}
                        className="text-input"
                        style={{ minHeight: '120px', fontSize: '0.95rem' }}
                        autoFocus
                      />
                    ) : (
                      <input
                        type="text"
                        value={editDetailValue}
                        onChange={(e) => setEditDetailValue(e.target.value)}
                        className="text-input"
                        style={{ fontSize: '0.95rem' }}
                        autoFocus
                      />
                    )}
                    <div style={{ display: 'flex', gap: '8px', alignSelf: key === 'fullScripture' ? 'flex-end' : 'auto' }}>
                      <button className="btn btn-secondary" onClick={() => saveDetailEdit(key)} style={{ padding: '8px 16px' }}>저장</button>
                      <button className="btn" onClick={() => setEditingDetail(null)} style={{ padding: '8px 16px', backgroundColor: '#eee' }}>취소</button>
                    </div>
                  </div>
                ) : (
                  <div className="detail-value" style={{ whiteSpace: 'pre-line' }}>{details[key]}</div>
                )}
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* 이미지 팝업 모달 */}
      {viewImageState && (
        <div className="image-modal-overlay" onClick={() => setViewImageState(null)}>
          <div className="image-modal-content" onClick={e => e.stopPropagation()}>
            <div className="image-modal-header-overlay">
              {viewImageState.type === 'gallery' && viewImageState.images[viewImageState.index] ? (
                <div className="image-modal-title">
                  <div className="title">{viewImageState.images[viewImageState.index].title}</div>
                  <div className="subtitle">{viewImageState.images[viewImageState.index].subtitle}</div>
                </div>
              ) : (
                <div className="image-modal-title">
                  <div className="title">{viewImageState.title || ''}</div>
                  <div className="subtitle">찬양 라이브러리</div>
                </div>
              )}
              <div className="image-modal-actions">
                <button className="image-modal-btn" onClick={() => {
                  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(e=>console.log(e));
                  else document.exitFullscreen();
                }}>
                  <Maximize size={24} color="#fff" />
                </button>
                <button className="image-modal-btn" onClick={() => setViewImageState(null)}>
                  <X size={24} color="#fff" />
                </button>
              </div>
            </div>
            
            {viewImageState.type === 'gallery' && viewImageState.images.length > 1 && (
              <>
                <button className="image-modal-nav prev" onClick={(e) => { e.stopPropagation(); setViewImageState(prev => ({...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length})) }}>
                  <ChevronLeft size={36} color="#fff" />
                </button>
                <button className="image-modal-nav next" onClick={(e) => { e.stopPropagation(); setViewImageState(prev => ({...prev, index: (prev.index + 1) % prev.images.length})) }}>
                  <ChevronRight size={36} color="#fff" />
                </button>
              </>
            )}

            <img 
              src={viewImageState.type === 'gallery' ? viewImageState.images[viewImageState.index].url : viewImageState.url} 
              alt="찬양 악보" 
              className="sheet-music-image" 
            />
          </div>
        </div>
      )}

      {/* 찬양 자동완성(순서용) 모달 */}
      {showSongModalForOrder && (
        <div className="song-modal-overlay" onClick={() => setShowSongModalForOrder(null)}>
          <div className="song-modal-content" onClick={e => e.stopPropagation()}>
            <div className="song-modal-header">
              <h3>찬양 곡 검색 및 추가</h3>
              <button className="song-modal-close" onClick={() => setShowSongModalForOrder(null)}><X size={20} /></button>
            </div>
            
            <div className="song-search-box">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                className="text-input search-input" 
                placeholder="찬양 제목을 검색하세요"
                value={songSearchText}
                onChange={e => setSongSearchText(e.target.value)}
                autoFocus
              />
            </div>

            <div className="song-suggestions-list">
              {filteredSongs.length > 0 ? (
                filteredSongs.map(song => (
                  <button 
                    key={song.id} 
                    className="suggestion-item"
                    onClick={() => handleSelectSong(showSongModalForOrder, song.title, song.imageUrl)}
                  >
                    <div className="suggestion-title">
                      <Music size={16} className="music-icon" />
                      {song.title}
                    </div>
                    {song.imageUrl && <span className="has-sheet-badge">악보 있음</span>}
                  </button>
                ))
              ) : (
                <div className="empty-suggestions">
                  <p>검색된 찬양이 없습니다.</p>
                </div>
              )}
              
              {songSearchText.trim() && !filteredSongs.find(s => s.title === songSearchText.trim()) && (
                <button 
                  className="suggestion-item create-new-song"
                  onClick={() => handleSelectSong(showSongModalForOrder, songSearchText.trim(), null)}
                >
                  <Plus size={16} /> "{songSearchText}" 새로운 곡으로 추가하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 전역 찬양 관리 모달 */}
      {showSongManagerModal && (
        <div className="song-modal-overlay" onClick={() => setShowSongManagerModal(false)}>
          <div className="song-modal-content members-modal-content" onClick={e => e.stopPropagation()}>
            <div className="song-modal-header">
              <h3>찬양 관리 (라이브러리)</h3>
              <button className="song-modal-close" onClick={() => setShowSongManagerModal(false)}><X size={20} /></button>
            </div>
            
            <div className="members-list-container">
              <ul className="member-list">
                {globalSongs.map(song => (
                  <li className="member-item" key={song.id} style={{ padding: '12px' }}>
                    <span className="member-name" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                      <Music size={14} color="var(--primary)" /> {song.title}
                    </span>
                    <div className="member-actions">
                      {song.imageUrl ? (
                        <button className="edit-btn" style={{ color: 'var(--primary)', padding: '6px' }} onClick={() => setViewImageState({ type: 'single', url: song.imageUrl, title: song.title })}>
                          <ImageIcon size={14} />
                        </button>
                      ) : (
                        <button className="edit-btn" style={{ padding: '6px' }} onClick={() => triggerGlobalImageUpload(song.id)} disabled={uploadingSongId === song.id}>
                          {uploadingSongId === song.id ? <Loader2 size={14} className="spin" /> : <ImageIcon size={14} />}
                        </button>
                      )}
                      <button className="edit-btn" style={{ padding: '6px' }} onClick={() => handleEditGlobalSong(song.id, song.title)}>
                        <Edit3 size={14} />
                      </button>
                      <button className="edit-btn delete-btn" style={{ padding: '6px' }} onClick={() => handleDeleteGlobalSong(song.id, song.title)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
              {globalSongs.length === 0 && <div className="empty-suggestions">등록된 찬양이 없습니다.</div>}
              
              <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={handleAddGlobalSong}>
                <Plus size={16} /> 새 찬양 등록하기
              </button>
            </div>
          </div>
        </div>
      )}


      {/* 교사/학생 관리 모달 */}
      {activeModalType && (
        <div className="song-modal-overlay" onClick={() => setActiveModalType(null)}>
          <div className="song-modal-content members-modal-content" onClick={e => e.stopPropagation()}>
            <div className="song-modal-header">
              <h3>{modalTitle}</h3>
              <button className="song-modal-close" onClick={() => setActiveModalType(null)}><X size={20} /></button>
            </div>
            
            <div className="members-list-container">
              {currentDepts.length > 0 ? (
                currentDepts.map(dept => (
                  <div className="department-card" key={dept.id}>
                    <div className="department-header">
                      <h4>{dept.name}</h4>
                      <div className="department-actions">
                        <button className="edit-btn" onClick={() => handleEditDepartment(dept.id, dept.name)}>
                          <Edit3 size={14} />
                        </button>
                        <button className="edit-btn delete-btn" onClick={() => handleDeleteDepartment(dept.id, dept.name)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <ul className="member-list">
                      {dept.members && dept.members.map(member => (
                        <li className="member-item" key={member.id}>
                          <span className="member-name">{member.name}</span>
                          <div className="member-actions">
                            <button className="edit-btn" onClick={() => handleEditMember(dept.id, member.id, member.name)}>
                              <Edit3 size={14} />
                            </button>
                            <button className="edit-btn delete-btn" onClick={() => handleDeleteMember(dept.id, member.id, member.name)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </li>
                      ))}
                      <li>
                        <button className="add-member-btn" onClick={() => handleAddMember(dept.id)}>
                          <Plus size={14} /> {modalAddMemberText}
                        </button>
                      </li>
                    </ul>
                  </div>
                ))
              ) : (
                <div className="empty-suggestions">등록된 데이터가 없습니다.</div>
              )}
              
              <button className="btn btn-secondary" style={{ marginTop: '16px' }} onClick={handleAddDepartment}>
                <Plus size={16} /> {modalAddDeptText}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
