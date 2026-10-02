import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) return;

    setIsLoading(true);
    setError('');

    let email = '';
    // Map simple passwords to virtual accounts
    if (password === '0121') email = 'editor@loveservice.com';
    else if (password === '5257') email = 'admin@loveservice.com';
    else {
      setError('비밀번호가 일치하지 않습니다.');
      setIsLoading(false);
      return;
    }

    const authPassword = password + '00'; // Supabase requires min 6 chars

    // 1. Try to sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: authPassword,
    });

    if (signInError) {
      // If user doesn't exist, try to sign up automatically (assuming email confirmation is disabled)
      if (signInError.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password: authPassword,
        });

        if (signUpError) {
          setError('로그인/가입 실패: ' + signUpError.message);
          setIsLoading(false);
          return;
        }
      } else {
        setError('로그인 실패: ' + signInError.message);
        setIsLoading(false);
        return;
      }
    }

    localStorage.setItem('isAuthenticated', 'true');
    navigate('/');
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <LogIn size={40} />
        </div>
        <h1 className="login-title">LoveService</h1>
        <p className="login-subtitle">사랑부 예배 준비 공유 서비스</p>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <input
              type="password"
              className="text-input"
              placeholder="비밀번호를 입력하세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ textAlign: 'center' }}
            />
            {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '8px' }}>{error}</p>}
          </div>
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? <Loader2 size={18} className="spin" /> : '입장하기'}
          </button>
        </form>
        <p style={{ marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          (관계자 외 접근 금지)
        </p>
      </div>
    </div>
  );
}
