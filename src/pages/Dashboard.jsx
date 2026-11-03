import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Edit2, Check, X, Calendar, Edit3, Image as ImageIcon, Plus, Loader2, Lock, Unlock, ChevronUp, ChevronDown, Trash2, Search, Music, Users, GraduationCap, Maximize, ChevronLeft, ChevronRight, Settings, FileText, Download, Printer, MessageCircle, Copy, ExternalLink } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { deleteFileFromStorage } from '../utils';
import { useReactToPrint } from 'react-to-print';
import BulletinLayout from '../components/BulletinLayout';
import Toast from '../components/Toast';
import AdminPanelModal from '../components/AdminPanelModal';
import SongManagerModal from '../components/SongManagerModal';
import MemberManagerModal from '../components/MemberManagerModal';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { shareNoticeToKakao, copyNoticeLink, extractNoticeMeta, getCachedMaterials, setCachedMaterials } from '../utils/shareUtils';

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

  // Global Library States (initialize materials from cache for 0ms instant display)
  const [globalSongs, setGlobalSongs] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [materials, setMaterials] = useState(() => getCachedMaterials() || []);
  const [expandedDashboardNotices, setExpandedDashboardNotices] = useState({});

  const toggleDashboardNotice = (id) => {
    setExpandedDashboardNotices(prev => ({ ...prev, [id]: !prev[id] }));
  };

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

  // Admin States
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [showAdminPanelModal, setShowAdminPanelModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg, type = 'success') => setToastMessage({ message: msg, type });

  // Header menu dropdown
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const printRef = useRef(null);
  const [currentUploadTarget, setCurrentUploadTarget] = useState(null);

  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: () => `사랑부_주보_${selectedDate}`,
    onAfterPrint: () => setIsPrinting(false),
  });

  const triggerPrint = () => {
    setIsPrinting(true);
  };

  useEffect(() => {
    if (isPrinting && printRef.current) {
      handlePrint();
    }
  }, [isPrinting]);

  const [userEmail, setUserEmail] = useState(null);
  const initialGlobalLoadedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const checkAuthAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        localStorage.removeItem('isAuthenticated');
        navigate('/login');
        return;
      }
      
      if (!isMounted) return;
      setUserEmail(session.user.email);

      if (!initialGlobalLoadedRef.current) {
        setLoading(true);
        // Fetch schedules + all global tables in PARALLEL instead of sequential waterfall
        const [schedRes, songsRes, membersRes, materialsRes] = await Promise.all([
          supabase.from('schedules').select('*').eq('date', selectedDate).single(),
          supabase.from('songs').select('id, title, imageUrl:imageurl'),
          supabase.from('settings').select('data').eq('id', 'members').single(),
          supabase.from('materials').select('id, content, fileName:filename, fileUrl:fileurl, created_at').order('created_at', { ascending: false })
        ]);

        if (!isMounted) return;

        if (schedRes.data) {
          setOrders(schedRes.data.orders || initialServiceOrders);
          setDetails(schedRes.data.details || initialDetails);
        } else {
          setOrders(initialServiceOrders);
          setDetails(initialDetails);
          supabase.from('schedules').insert({ date: selectedDate, orders: initialServiceOrders, details: initialDetails }).then(() => {});
        }

        if (songsRes.data) setGlobalSongs(songsRes.data);
        if (membersRes.data && membersRes.data.data) {
          setTeachers(membersRes.data.data.teachers || []);
          setStudents(membersRes.data.data.students || []);
        }
        if (materialsRes.data) {
          setMaterials(materialsRes.data);
          setCachedMaterials(materialsRes.data);
        }

        initialGlobalLoadedRef.current = true;
        setLoading(false);
      } else {
        // When only selectedDate changes, only fetch schedules for that date
        const { data: schedData } = await supabase.from('schedules').select('*').eq('date', selectedDate).single();
        if (!isMounted) return;
        if (schedData) {
          setOrders(schedData.orders || initialServiceOrders);
          setDetails(schedData.details || initialDetails);
        } else {
          setOrders(initialServiceOrders);
          setDetails(initialDetails);
          await supabase.from('schedules').insert({ date: selectedDate, orders: initialServiceOrders, details: initialDetails });
        }
      }
    };

    checkAuthAndFetchData();
    return () => {
      isMounted = false;
    };
  }, [navigate, selectedDate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('isAuthenticated');
    navigate('/login');
  };

  // Keyboard navigation for gallery
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewImageState?.type === 'gallery') {
        if (e.key === 'ArrowLeft') {
          setViewImageState(prev => ({...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length}));
        } else if (e.key === 'ArrowRight') {
          setViewImageState(prev => ({...prev, index: (prev.index + 1) % prev.images.length}));
        } else if (e.key === 'Escape') {
          setViewImageState(null);
        }
      } else if (viewImageState?.type === 'single') {
        if (e.key === 'Escape') {
          setViewImageState(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewImageState]);

  const saveFirestore = async (newOrders, newDetails = details) => {
    try {
      const { error } = await supabase.from('schedules').update({ orders: newOrders, details: newDetails }).eq('date', selectedDate);
      if (error) {
        console.error("Supabase update error:", error);
        showToast("일정 저장에 실패했습니다: " + error.message, 'error');
      }
    } catch (e) {
      console.error("Update failed", e);
      showToast("저장에 실패했습니다.", 'error');
    }
  };

  const saveMembersFirestore = async (newTeachers, newStudents) => {
    try {
      const { error } = await supabase.from('settings').update({ data: { teachers: newTeachers, students: newStudents } }).eq('id', 'members');
      if (error) {
        console.error("Supabase members error:", error);
        showToast("명단 저장에 실패했습니다: " + error.message, 'error');
        return;
      }
      // Bug fix: update local state immediately
      setTeachers(newTeachers);
      setStudents(newStudents);
      showToast('명단이 저장되었습니다.');
    } catch (e) {
      console.error("Members update failed", e);
      showToast("데이터 저장에 실패했습니다.", 'error');
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
        const { data, error } = await supabase.from('songs').insert({ title, imageurl: imageUrl || null }).select('id, title, imageUrl:imageurl').single();
        if (error) {
          console.error("Error inserting global song:", error);
          showToast("찬양 곡 등록에 실패했습니다: " + error.message, 'error');
        }
        if (data) setGlobalSongs(prev => [...prev, data]);
      };
      addSong();
    }
  };

  const removeSong = async (orderId, songId) => {
    if (!window.confirm("이 찬양을 삭제하시겠습니까?")) return;
    
    const newOrders = orders.map(o => {
      if (o.id === orderId) {
        const songToRemove = o.songs.find(s => s.id === songId);
        if (songToRemove && songToRemove.imageUrl) {
          // 비동기로 스토리지 파일 삭제
          deleteFileFromStorage(songToRemove.imageUrl);
        }
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
      showToast("이미지 업로드에 실패했습니다.", 'error');
      setUploadingSongId(null);
      e.target.value = '';
      return;
    }

    const { data: publicUrlData } = supabase.storage.from('sheet-music').getPublicUrl(filePath);
    const downloadURL = publicUrlData.publicUrl;

    if (type === 'library') {
      await supabase.from('songs').update({ imageurl: downloadURL }).eq('id', songId);
      setGlobalSongs(prev => prev.map(s => s.id === songId ? { ...s, imageUrl: downloadURL } : s));
    } else {
      // Update order
      let songTitle = '';
      const newOrders = orders.map(o => {
        if (o.id === orderId) {
          const newSongs = o.songs.map(s => {
            if (s.id === songId) {
              songTitle = s.title;
              if (s.imageUrl) {
                // 기존 이미지가 있다면 스토리지에서 삭제
                deleteFileFromStorage(s.imageUrl);
              }
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
          const { error } = await supabase.from('songs').update({ imageurl: downloadURL }).eq('id', existing.id);
          if (error) showToast("찬양 이미지 업데이트 실패: " + error.message, 'error');
          setGlobalSongs(prev => prev.map(s => s.id === existing.id ? { ...s, imageUrl: downloadURL } : s));
        } else {
          const addSong = async () => {
            const { data, error } = await supabase.from('songs').insert({ title: songTitle, imageurl: downloadURL }).select('id, title, imageUrl:imageurl').single();
            if (error) showToast("찬양 등록 실패: " + error.message, 'error');
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

  const handleAddGlobalSong = async () => {
    const title = prompt("추가할 찬양 제목을 입력하세요");
    if (!title || !title.trim()) return;
    const existing = globalSongs.find(g => g.title === title.trim());
    if (existing) {
      showToast("이미 등록된 찬양입니다.", 'error');
      return;
    }
    const { data, error } = await supabase.from('songs').insert({ title: title.trim(), imageurl: null }).select('id, title, imageUrl:imageurl').single();
    if (error) {
      showToast("찬양 추가 실패: " + error.message, 'error');
      return;
    }
    if(data) setGlobalSongs([...globalSongs, data]);
  };

  const handleEditGlobalSong = async (id, oldTitle) => {
    const newTitle = prompt("찬양 제목을 수정하세요", oldTitle);
    if (!newTitle || !newTitle.trim()) return;
    await supabase.from('songs').update({ title: newTitle.trim() }).eq('id', id);
    setGlobalSongs(prev => prev.map(s => s.id === id ? { ...s, title: newTitle.trim() } : s));
  };

  const handleDeleteGlobalSong = async (id, title, imageUrl) => {
    if (!window.confirm(`'${title}' 찬양을 명단에서 삭제하시겠습니까?\n(과거 예배 순서에 입력된 내용은 유지됩니다.)`)) return;
    
    if (imageUrl) {
      deleteFileFromStorage(imageUrl);
    }
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

  // --- Admin Materials Management ---
  const handleAdminMenuClick = () => {
    if (userEmail === 'admin@loveservice.com') {
      setShowAdminPanelModal(true);
    } else {
      setShowAdminAuthModal(true);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    const cleanPw = adminPasswordInput.trim();
    if (!cleanPw) return;

    if (cleanPw === '5257') {
      try {
        await supabase.auth.signInWithPassword({
          email: 'admin@loveservice.com',
          password: cleanPw + '00',
        });
      } catch (err) {
        console.warn('Admin auth sync:', err);
      }
      setUserEmail('admin@loveservice.com');
      setShowAdminAuthModal(false);
      setShowAdminPanelModal(true);
      setAdminPasswordInput('');
      showToast("관리자 모드로 전환되었습니다.", 'success');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: 'admin@loveservice.com',
      password: cleanPw + '00',
    });
    if (!error) {
      setUserEmail('admin@loveservice.com');
      setShowAdminAuthModal(false);
      setShowAdminPanelModal(true);
      setAdminPasswordInput('');
      showToast("관리자 모드로 전환되었습니다.", 'success');
    } else {
      showToast("비밀번호가 틀렸습니다.", 'error');
      setAdminPasswordInput('');
    }
  };

  const handleAddMaterial = async (e, contentText = '') => {
    e.preventDefault();
    const file = e.target.materialFile?.files?.[0];
    const cleanContent = (contentText || '').trim();
    if (!cleanContent && !file) return false;

    setIsUploadingMaterial(true);
    let fileUrl = null;
    let fileName = null;

    if (file) {
      const ext = file.name.split('.').pop();
      const uniqueName = `mat_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('sheet-music').upload(`materials/${uniqueName}`, file);
      if (uploadError) {
        showToast("파일 업로드 실패: " + uploadError.message, 'error');
        setIsUploadingMaterial(false);
        return false;
      }
      const { data: publicUrlData } = supabase.storage.from('sheet-music').getPublicUrl(`materials/${uniqueName}`);
      fileUrl = publicUrlData.publicUrl;
      fileName = file.name;
    }

    const newMat = { content: cleanContent, fileurl: fileUrl, filename: fileName };
    const { data, error } = await supabase.from('materials').insert(newMat).select('id, content, fileName:filename, fileUrl:fileurl, created_at').single();
    if (error) {
      showToast("등록 실패: " + error.message, 'error');
      setIsUploadingMaterial(false);
      return false;
    } else {
      const updated = [data, ...materials];
      setMaterials(updated);
      setCachedMaterials(updated);
      e.target.reset();
    }
    setIsUploadingMaterial(false);
    return true;
  };

  const handleDeleteMaterial = async (id) => {
    if (!window.confirm("이 항목을 삭제하시겠습니까?")) return;
    
    const matToDelete = materials.find(m => m.id === id);
    if (matToDelete && matToDelete.fileUrl) {
      deleteFileFromStorage(matToDelete.fileUrl);
    }

    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) {
      showToast("삭제 실패: " + error.message, 'error');
    } else {
      const updated = materials.filter(m => m.id !== id);
      setMaterials(updated);
      setCachedMaterials(updated);
    }
  };



  if (loading && orders.length === 0) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '16px' }}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>예배 정보를 불러오는 중...</p>
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
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button className="logout-btn" style={{ backgroundColor: '#2196f3', color: 'white', padding: '6px 12px', fontWeight: 'bold' }} onClick={triggerPrint} title="주보 인쇄 및 PDF 저장">
              <Printer size={14} /> 주보
            </button>
            <div style={{ position: 'relative' }}>
              <button className="logout-btn" style={{ backgroundColor: 'rgba(255,255,255,0.3)', padding: '6px 10px' }} onClick={() => setShowHeaderMenu(!showHeaderMenu)}>
                <Settings size={14} /> 메뉴 ▾
              </button>
              {showHeaderMenu && (
                <div className="header-dropdown" onClick={() => setShowHeaderMenu(false)}>
                  <button onClick={() => setShowSongManagerModal(true)}><Music size={14} /> 찬양 관리</button>
                  <button onClick={() => setActiveModalType('teacher')}><Users size={14} /> 교사 관리</button>
                  <button onClick={() => setActiveModalType('student')}><GraduationCap size={14} /> 학생 관리</button>
                  <button onClick={handleAdminMenuClick}><Settings size={14} /> 관리자</button>
                  <hr style={{ border: 'none', borderTop: '1px solid #eee', margin: '4px 0' }} />
                  <button onClick={handleLogout} style={{ color: 'var(--error)' }}><LogOut size={14} /> 로그아웃</button>
                </div>
              )}
            </div>
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
                              {Array.isArray(teachers) && teachers.map(d => (
                                <optgroup label={`[교사] ${d.name}`} key={`t-${d.id}`}>
                                  {Array.isArray(d.members) && d.members.map(m => (
                                    <option value={m.name} key={`m-${m.id}`}>{m.name}</option>
                                  ))}
                                </optgroup>
                              ))}
                              {Array.isArray(students) && students.map(d => (
                                <optgroup label={`[학생] ${d.name}`} key={`s-${d.id}`}>
                                  {Array.isArray(d.members) && d.members.map(m => (
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
                      {(editName || '').includes('말씀 선포') && (
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
                        <button className="btn" onClick={() => setEditingId(null)} style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}><X size={16} /> 취소</button>
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

                {/* 이미지 / 슬라이드 리스트 (모든 순서 항상 허용) */}
                {!editingId && (
                  <div className={`song-list-container ${isOrderEditMode ? 'edit-mode-active' : ''}`}>
                    {order.songs && order.songs.length > 0 && (
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
                    )}
                    <button className="add-song-btn" onClick={() => { setShowSongModalForOrder(order.id); setSongSearchText(''); }}>
                      <Plus size={14} /> {order.songs && order.songs.length > 0 ? '슬라이드 추가하기' : '슬라이드(이미지/악보) 첨부'}
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
                      <button className="btn" onClick={() => setEditingDetail(null)} style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.4)' }}>취소</button>
                    </div>
                  </div>
                ) : (
                  <div className="detail-value" style={{ whiteSpace: 'pre-line' }}>{details[key]}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 공지사항 및 자료 카드 */}
        <div className="card materials-card" style={{ marginTop: '24px' }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} /> 공지사항 및 자료
          </h2>
          <div className="materials-list">
            {materials.length > 0 ? materials.map((mat) => {
              const isExpanded = !!expandedDashboardNotices[mat.id];
              const meta = extractNoticeMeta(mat.content, mat.fileName);

              return (
                <div key={mat.id} className="material-item">
                  {/* 상단 툴바: 제목/토글 & 작성일시 & 카카오톡/링크 공유 버튼 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
                    <div 
                      onClick={() => toggleDashboardNotice(mat.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 1, minWidth: '180px' }}
                      title={isExpanded ? '내용 접기' : '내용 펼쳐보기'}
                    >
                      {isExpanded ? <ChevronUp size={17} color="var(--primary)" /> : <ChevronDown size={17} color="var(--text-muted)" />}
                      <span style={{ fontWeight: 700, fontSize: '0.96rem', color: isExpanded ? 'var(--primary-dark)' : 'var(--text-main)' }}>
                        {meta.title}
                      </span>
                      <span className="material-date" style={{ marginTop: 0, marginLeft: '4px', fontWeight: 500, whiteSpace: 'nowrap' }}>
                        {new Date(mat.created_at).toLocaleString('ko-KR', { month: 'long', day: 'numeric' })}
                      </span>
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
                          padding: '5px 10px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                        }}
                        title="카카오톡으로 공유"
                      >
                        <MessageCircle size={14} fill="#191919" /> 카톡 공유
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
                          padding: '5px 9px',
                          fontSize: '0.8rem',
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
                          padding: '5px 8px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          textDecoration: 'none'
                        }}
                        title="공지 전용창 새 탭으로 열기"
                      >
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>

                  {!isExpanded ? (
                    <div 
                      onClick={() => toggleDashboardNotice(mat.id)}
                      style={{
                        padding: '10px 12px',
                        background: 'rgba(255, 255, 255, 0.55)',
                        borderRadius: '10px',
                        border: '1px dashed rgba(231, 111, 81, 0.25)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: '1.5' }}>
                        {meta.description}
                      </p>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary-dark)' }}>
                        ▼ 전체 내용 펼쳐보기
                      </span>
                    </div>
                  ) : (
                    <>
                      {(mat.content || mat.fileUrl) && (
                        <div className="material-content" style={{ marginBottom: mat.fileName ? '12px' : '8px' }}>
                          <MarkdownRenderer content={mat.content} fileUrl={mat.fileUrl} />
                        </div>
                      )}
                      {mat.fileName && (
                        <a href={mat.fileUrl} target="_blank" rel="noopener noreferrer" className="material-file-btn btn btn-secondary" style={{ marginBottom: '8px' }}>
                          <Download size={14} /> {mat.fileName}
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleDashboardNotice(mat.id)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: 'rgba(0, 0, 0, 0.03)',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        ▲ 내용 접기
                      </button>
                    </>
                  )}
                </div>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                등록된 공지사항이 없습니다.
              </div>
            )}
          </div>
        </div>

      </main>

      {isPrinting && (
        <div style={{ display: 'none' }}>
          <BulletinLayout 
            ref={printRef} 
            date={selectedDate} 
            orders={orders} 
            details={details} 
            materials={materials} 
            teachers={teachers} 
            students={students} 
            bgImageUrl={null} // 추후 관리자 메뉴에서 배경 이미지 업로드 시 연동 가능
          />
        </div>
      )}

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
                <div className="thumbnail-strip" onClick={e => e.stopPropagation()}>
                  {viewImageState.images.map((img, idx) => (
                    <img 
                      key={idx}
                      src={img.url}
                      className={`thumbnail-img ${idx === viewImageState.index ? 'active' : ''}`}
                      onClick={() => setViewImageState(prev => ({...prev, index: idx}))}
                      alt="썸네일"
                    />
                  ))}
                </div>
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

      {/* 관리자 인증 모달 */}
      {showAdminAuthModal && (
        <div className="song-modal-overlay" onClick={() => setShowAdminAuthModal(false)}>
          <div className="song-modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '300px' }}>
            <div className="song-modal-header">
              <h3>관리자 메뉴</h3>
              <button className="song-modal-close" onClick={() => setShowAdminAuthModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <input 
                type="password" 
                value={adminPasswordInput} 
                onChange={e => setAdminPasswordInput(e.target.value)} 
                placeholder="비밀번호 4자리" 
                className="text-input" 
                autoFocus 
                style={{ textAlign: 'center' }}
              />
              <button type="submit" className="btn btn-primary" style={{ padding: '12px' }}>확인</button>
            </form>
          </div>
        </div>
      )}

      {/* 관리자 대시보드 모달 */}
      {showAdminPanelModal && (
        <AdminPanelModal 
          onClose={() => setShowAdminPanelModal(false)}
          materials={materials}
          handleAddMaterial={handleAddMaterial}
          handleDeleteMaterial={handleDeleteMaterial}
          isUploadingMaterial={isUploadingMaterial}
        />
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
        <SongManagerModal 
          onClose={() => setShowSongManagerModal(false)}
          songSearchText={songSearchText}
          setSongSearchText={setSongSearchText}
          handleAddGlobalSong={handleAddGlobalSong}
          filteredSongs={filteredSongs}
          uploadingSongId={uploadingSongId}
          triggerGlobalImageUpload={triggerGlobalImageUpload}
          handleOpenGallery={handleOpenGallery}
          handleEditGlobalSong={handleEditGlobalSong}
          handleDeleteGlobalSong={handleDeleteGlobalSong}
        />
      )}


      {/* 교사/학생 관리 모달 */}
      <MemberManagerModal 
        activeModalType={activeModalType}
        onClose={() => setActiveModalType(null)}
        currentDepts={currentDepts}
        modalTitle={modalTitle}
        modalAddDeptText={modalAddDeptText}
        modalAddMemberText={modalAddMemberText}
        handleAddDepartment={handleAddDepartment}
        handleEditDepartment={handleEditDepartment}
        handleDeleteDepartment={handleDeleteDepartment}
        handleAddMember={handleAddMember}
        handleEditMember={handleEditMember}
        handleDeleteMember={handleDeleteMember}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <Toast 
          message={toastMessage.message} 
          type={toastMessage.type} 
          onClose={() => setToastMessage(null)} 
        />
      )}

    </div>
  );
}
