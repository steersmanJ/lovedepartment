const KAKAO_KEY = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY || '8d334f1c98a6ad159499b78409b833f3';

/**
 * Initializes the Kakao JavaScript SDK if available.
 */
export function initKakao() {
  if (typeof window === 'undefined') return false;
  if (!window.Kakao) return false;

  try {
    if (!window.Kakao.isInitialized()) {
      window.Kakao.init(KAKAO_KEY);
    }
    return window.Kakao.isInitialized();
  } catch (err) {
    console.warn('Kakao SDK init error:', err);
    return false;
  }
}

const metaCache = new Map();
let memoryMaterialsCache = null;
const MATERIALS_STORAGE_KEY = 'love_dept_materials_cache_v1';

/**
 * Retrieves cached materials list from memory or sessionStorage for 0ms instant rendering.
 */
export function getCachedMaterials() {
  if (memoryMaterialsCache) return memoryMaterialsCache;
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(MATERIALS_STORAGE_KEY);
    if (raw) {
      memoryMaterialsCache = JSON.parse(raw);
      return memoryMaterialsCache;
    }
  } catch (e) {
    // ignore storage errors
  }
  return null;
}

/**
 * Saves materials list to memory and sessionStorage cache.
 */
export function setCachedMaterials(list) {
  if (!Array.isArray(list)) return;
  memoryMaterialsCache = list;
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    // ignore storage quota errors
  }
}

/**
 * Finds a single notice by ID from the cached materials list.
 */
export function getCachedNoticeById(id) {
  const list = getCachedMaterials();
  if (!list) return null;
  return list.find(item => String(item.id) === String(id)) || null;
}

/**
 * Parses markdown content to extract a clean title and summary (memoized).
 */
export function extractNoticeMeta(content, fileName) {
  const cacheKey = `${content || ''}||${fileName || ''}`;
  if (metaCache.has(cacheKey)) {
    return metaCache.get(cacheKey);
  }

  if (!content) {
    const emptyResult = {
      title: fileName ? `[첨부자료] ${fileName}` : '사랑부 공지사항',
      description: fileName ? '첨부파일이 등록된 공지사항입니다.' : '사랑부 공지사항을 확인하세요.'
    };
    metaCache.set(cacheKey, emptyResult);
    return emptyResult;
  }

  const lines = content
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  let title = '사랑부 공지사항';
  let descLines = [];

  // 1. Look for first heading (# 제목)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#')) {
      title = line.replace(/^#+\s*/, '').replace(/[*_~`]/g, '').trim();
      descLines = lines.slice(i + 1);
      break;
    }
  }

  // If no heading was found, use the first line as title
  if (title === '사랑부 공지사항' && lines.length > 0) {
    title = lines[0].replace(/[*_~`]/g, '').trim();
    if (title.length > 50) title = title.substring(0, 48) + '...';
    descLines = lines.slice(1);
  }

  // 2. Build clean summary from subsequent lines
  const cleanSummary = descLines
    .map(l => l.replace(/^[>*\-#|0-9.]+\s*/, '').replace(/[*_~`[\]]/g, '').trim())
    .filter(l => l.length > 0 && !l.startsWith('http') && !l.startsWith('flowchart'))
    .slice(0, 3)
    .join(' ')
    .trim();

  let description = cleanSummary || (fileName ? `첨부: ${fileName}` : '사랑부 소식 및 안내사항입니다.');
  if (description.length > 110) {
    description = description.substring(0, 108) + '...';
  }

  const result = { title, description };
  if (metaCache.size > 200) metaCache.clear();
  metaCache.set(cacheKey, result);
  return result;
}

/**
 * Gets the direct notice URL.
 */
export function getNoticeUrl(noticeId) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://lovedepartment-81dbc.web.app';
  return `${origin}/notice/${noticeId}`;
}

/**
 * Copies the notice direct link to the user's clipboard.
 */
export async function copyNoticeLink(noticeId) {
  const url = getNoticeUrl(noticeId);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(url);
    return { success: true, url };
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = url;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return { success: true, url };
  }
}

/**
 * Shares notice to KakaoTalk with smart fallback.
 * 1. Kakao.Share.sendDefault
 * 2. navigator.share (Mobile share sheet)
 * 3. Clipboard copy
 */
export async function shareNoticeToKakao({ id, content, fileName, onToast }) {
  const url = getNoticeUrl(id);
  const { title, description } = extractNoticeMeta(content, fileName);

  const isKakaoReady = initKakao();

  if (isKakaoReady && window.Kakao && window.Kakao.Share) {
    try {
      window.Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: title,
          description: description,
          imageUrl: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=600&q=80',
          imageWidth: 600,
          imageHeight: 315,
          link: {
            mobileWebUrl: url,
            webUrl: url,
          },
        },
        buttons: [
          {
            title: '공지 자세히 보기',
            link: {
              mobileWebUrl: url,
              webUrl: url,
            },
          },
        ],
      });
      if (onToast) onToast('카카오톡 공유 창을 열었습니다.', 'success');
      return { method: 'kakao', success: true };
    } catch (err) {
      console.warn('Kakao Share failed, falling back:', err);
    }
  }

  // Fallback 1: Mobile Web Share API
  if (navigator.share) {
    try {
      await navigator.share({
        title: title,
        text: `[사랑부 공지] ${title}\n${description}`,
        url: url,
      });
      if (onToast) onToast('공유되었습니다.', 'success');
      return { method: 'web-share', success: true };
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('Web Share failed, copying link:', err);
      } else {
        return { method: 'web-share', success: false };
      }
    }
  }

  // Fallback 2: Copy link to clipboard
  try {
    await copyNoticeLink(id);
    if (onToast) onToast('공유 링크가 클립보드에 복사되었습니다!', 'success');
    return { method: 'clipboard', success: true };
  } catch (err) {
    if (onToast) onToast('링크 복사에 실패했습니다.', 'error');
    return { method: 'none', success: false };
  }
}
