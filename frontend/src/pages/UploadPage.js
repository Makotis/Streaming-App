import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { musicAPI } from '../services/api';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

const UploadPage = () => {
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [audioFile, setAudioFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        toast.error('Please select an audio file');
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast.error('File size must be less than 50MB');
        return;
      }
      setAudioFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !artist || !audioFile) {
      toast.error('Please fill in all required fields and select an audio file');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('title', title);
      formData.append('artist', artist);
      formData.append('album', album);
      formData.append('audio', audioFile);

      await musicAPI.uploadSong(formData);
      toast.success('Song uploaded successfully!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="card">
          <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>
            <Upload size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
            Upload Music
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter song title"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="artist">Artist *</label>
              <input
                type="text"
                id="artist"
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Enter artist name"
                disabled={loading}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="album">Album</label>
              <input
                type="text"
                id="album"
                value={album}
                onChange={(e) => setAlbum(e.target.value)}
                placeholder="Enter album name (optional)"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="audio">Audio File *</label>
              <input
                type="file"
                id="audio"
                accept="audio/*"
                onChange={handleFileChange}
                disabled={loading}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '2px dashed #333',
                  borderRadius: '6px',
                  backgroundColor: '#1a1a1a',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              />
              {audioFile && (
                <p style={{ color: '#1db954', fontSize: '14px', marginTop: '5px' }}>
                  Selected: {audioFile.name}
                </p>
              )}
              <p style={{ color: '#b3b3b3', fontSize: '12px', marginTop: '5px' }}>
                Supported formats: MP3, WAV, OGG, M4A (Max size: 50MB)
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading}
            >
              {loading ? 'Uploading...' : 'Upload Song'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;