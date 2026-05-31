import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 10);
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      alert('请输入用户名');
      return;
    }
    const newRoomId = generateRoomId();
    localStorage.setItem('userName', userName.trim());
    navigate(`/room/${newRoomId}`);
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!userName.trim() || !roomId.trim()) {
      alert('请输入用户名和房间号');
      return;
    }
    localStorage.setItem('userName', userName.trim());
    navigate(`/room/${roomId.trim()}`);
  };

  return (
    <div className="home-page">
      <h1 className="home-title">协作白板</h1>
      <p className="home-subtitle">远程桌面实时协作标注系统</p>
      
      <div className="home-form">
        <div className="form-group">
          <label className="form-label">用户名</label>
          <input
            type="text"
            className="form-input"
            placeholder="输入您的名字"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>
        
        <button className="btn btn-primary" onClick={handleCreateRoom}>
          创建新房间
        </button>
        
        <div style={{ textAlign: 'center', color: '#666', margin: '0.5rem 0' }}>
          或者
        </div>
        
        <div className="form-group">
          <label className="form-label">房间号</label>
          <input
            type="text"
            className="form-input"
            placeholder="输入房间号加入"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
        </div>
        
        <button className="btn btn-secondary" onClick={handleJoinRoom}>
          加入房间
        </button>
      </div>
    </div>
  );
}

export default Home;
