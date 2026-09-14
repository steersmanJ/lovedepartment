import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';

export default function Login() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    // For demo purposes, we're using a simple shared password.
    // In the future, this can be replaced with Firebase Auth.
    if (password === '1234') { 
      localStorage.setItem('isAuthenticated', 'true');
      navigate('/');
    } else {
      setError('비밀번호가 일치하지 않습니다.');
    }
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
          <button type="submit" className="btn btn-primary">
            입장하기
          </button>
        </form>
        <p style={{ marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          임시 비밀번호는 <strong>1234</strong> 입니다.
        </p>
      </div>
    </div>
  );
}
