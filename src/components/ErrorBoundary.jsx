import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#333' }}>
          <h2>앗, 화면을 불러오는 중 문제가 발생했습니다!</h2>
          <p style={{ margin: '1rem 0', color: '#666' }}>일시적인 오류일 수 있으니 새로고침을 해주세요.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', fontSize: '1rem', cursor: 'pointer', backgroundColor: '#2196f3', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            새로고침
          </button>
          <br /><br />
          <details style={{ whiteSpace: 'pre-wrap', textAlign: 'left', background: '#f5f5f5', padding: '1rem', borderRadius: '4px', fontSize: '0.85rem' }}>
            {this.state.error && this.state.error.toString()}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
