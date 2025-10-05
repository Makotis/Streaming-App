import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import UploadPage from './pages/UploadPage';
import ProfilePage from './pages/ProfilePage';
import MusicPlayer from './components/MusicPlayer';

function App() {
  const { user } = useAuth();

  return (
    <div className="App">
      <Navbar />
      <main style={{ paddingBottom: user ? '80px' : '0' }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
      {user && <MusicPlayer />}
    </div>
  );
}

export default App;