import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { musicAPI } from '../services/api';
import { User, Music, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfilePage = () => {
  const [userSongs, setUserSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserSongs();
    }
  }, [user]);

  const fetchUserSongs = async () => {
    try {
      setLoading(true);
      const response = await musicAPI.getUserSongs(user.id);
      setUserSongs(response.data.songs);
    } catch (error) {
      toast.error('Failed to fetch your songs');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSong = async (songId) => {
    if (!window.confirm('Are you sure you want to delete this song?')) {
      return;
    }

    try {
      await musicAPI.deleteSong(songId);
      setUserSongs(userSongs.filter(song => song.id !== songId));
      toast.success('Song deleted successfully');
    } catch (error) {
      toast.error('Failed to delete song');
    }
  };

  if (!user) {
    return (
      <div className="container" style={{ paddingTop: '40px', textAlign: 'center' }}>
        <h2>Please log in to view your profile</h2>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <div className="card" style={{ marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <User size={32} style={{ marginRight: '15px', color: '#1db954' }} />
          <div>
            <h2 style={{ marginBottom: '5px' }}>{user.username}</h2>
            <p style={{ color: '#b3b3b3', fontSize: '14px' }}>{user.email}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center' }}>
          <Music size={20} style={{ marginRight: '10px' }} />
          Your Uploads ({userSongs.length})
        </h3>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            Loading your songs...
          </div>
        ) : userSongs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: '#b3b3b3' }}>You haven't uploaded any songs yet.</p>
            <p style={{ color: '#b3b3b3', marginTop: '10px' }}>
              <a href="/upload" style={{ color: '#1db954', textDecoration: 'none' }}>
                Upload your first song
              </a>
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {userSongs.map((song) => (
              <div
                key={song.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  backgroundColor: '#2a2a2a',
                  borderRadius: '6px',
                  border: '1px solid #333'
                }}
              >
                <div>
                  <div className="song-title" style={{ marginBottom: '5px' }}>
                    {song.title}
                  </div>
                  <div className="song-artist" style={{ fontSize: '14px' }}>
                    {song.artist}
                    {song.album && ` • ${song.album}`}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '3px' }}>
                    Uploaded: {new Date(song.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleDeleteSong(song.id)}
                    style={{
                      background: 'none',
                      border: '1px solid #ff4444',
                      borderRadius: '4px',
                      padding: '8px',
                      cursor: 'pointer',
                      color: '#ff4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete song"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;