import React, { forwardRef } from 'react';

const BulletinLayout = forwardRef(({ date, orders, details, materials, teachers, students, bgImageUrl }, ref) => {
  // A4 Landscape is 297mm x 210mm
  // We'll use mm for dimensions, and let the browser's print engine handle it.
  
  return (
    <div 
      ref={ref} 
      className="bulletin-page"
      style={{
        width: '297mm',
        height: '210mm',
        backgroundColor: '#fff',
        backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'none',
        backgroundSize: '100% 100%',
        backgroundRepeat: 'no-repeat',
        display: 'flex',
        boxSizing: 'border-box',
        overflow: 'hidden',
        position: 'relative' // For absolute positioning if needed
      }}
    >
      {/* Column 1: Left (Worship Order) */}
      <div className="bulletin-column" style={columnStyle}>
        <h2 className="bulletin-title">주일 예배 순서</h2>
        <div className="bulletin-date">{date}</div>
        
        <div className="bulletin-orders">
          {orders.map((order, idx) => (
            <div key={idx} className="bulletin-order-item">
              <div className="order-time">{order.time}</div>
              <div className="order-name">{order.name}</div>
              <div className="order-assignee">{order.assignee}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Column 2: Center (Sermon & Details) */}
      <div className="bulletin-column" style={columnStyle}>
        <h2 className="bulletin-title">오늘의 말씀</h2>
        
        {/* Find the sermon order to display title and scriptureRef */}
        {orders.filter(o => o.name.includes('말씀')).map((sermon, idx) => (
          <div key={idx} className="bulletin-sermon-header">
            <div className="sermon-title">{sermon.sermonTitle}</div>
            <div className="sermon-ref">{sermon.scriptureRef}</div>
          </div>
        ))}
        
        <div className="bulletin-scripture-body">
          {details.fullScripture}
        </div>

        <div className="bulletin-snacks" style={{ marginTop: 'auto', paddingTop: '20px' }}>
          <strong>이번 주 간식 섬김:</strong> {details.snackPrep}
        </div>
      </div>

      {/* Column 3: Right (Announcements & People) */}
      <div className="bulletin-column" style={{ ...columnStyle, borderRight: 'none' }}>
        <h2 className="bulletin-title">교회 소식</h2>
        <div className="bulletin-materials">
          {materials && materials.length > 0 ? (
            <ul>
              {materials.map(mat => (
                mat.content ? <li key={mat.id}>{mat.content}</li> : null
              ))}
            </ul>
          ) : (
            <p style={{fontSize:'10px', color:'#999'}}>등록된 소식이 없습니다.</p>
          )}
        </div>

        <h2 className="bulletin-title" style={{ marginTop: '20px' }}>섬기는 사람들</h2>
        <div className="bulletin-people">
          {teachers && teachers.map((dept, idx) => (
            <div key={idx} className="bulletin-dept">
              <strong>{dept.name}</strong>: {dept.members && dept.members.map(m => m.name).join(', ')}
            </div>
          ))}
        </div>
      </div>

      {/* Internal CSS for printing specifically */}
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        
        .bulletin-column {
          flex: 1;
          padding: 20mm;
          display: flex;
          flex-direction: column;
        }

        .bulletin-title {
          font-size: 16pt;
          font-weight: bold;
          text-align: center;
          margin-bottom: 10pt;
          color: #333;
          border-bottom: 1px solid #ccc;
          padding-bottom: 5pt;
        }

        .bulletin-date {
          text-align: center;
          font-size: 10pt;
          color: #666;
          margin-bottom: 15pt;
        }

        .bulletin-order-item {
          display: flex;
          align-items: center;
          margin-bottom: 8pt;
          font-size: 10pt;
        }

        .order-time {
          width: 40px;
          color: #999;
          font-size: 9pt;
        }

        .order-name {
          flex: 1;
          font-weight: bold;
        }

        .order-assignee {
          text-align: right;
        }

        .bulletin-sermon-header {
          text-align: center;
          margin-bottom: 15pt;
        }

        .sermon-title {
          font-size: 14pt;
          font-weight: bold;
          color: #2c3e50;
        }

        .sermon-ref {
          font-size: 10pt;
          color: #666;
          margin-top: 5pt;
        }

        .bulletin-scripture-body {
          font-size: 11pt;
          line-height: 1.8;
          text-align: justify;
          white-space: pre-wrap;
        }
        
        .bulletin-materials ul {
          padding-left: 15pt;
          margin: 0;
          font-size: 10pt;
          line-height: 1.6;
        }

        .bulletin-materials li {
          margin-bottom: 8pt;
        }

        .bulletin-people {
          font-size: 9pt;
          line-height: 1.5;
        }

        .bulletin-dept {
          margin-bottom: 5pt;
        }
      `}</style>
    </div>
  );
});

const columnStyle = {
  borderRight: '1px dashed #e0e0e0', // This can be removed later when a background image is used
  boxSizing: 'border-box'
};

export default BulletinLayout;
