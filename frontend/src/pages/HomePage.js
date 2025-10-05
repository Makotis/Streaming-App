import React, { useState, useEffect } from 'react';
import { musicAPI } from '../services/api';
import { Play, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const HomePage = () => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchSongs();
  }, [currentPage, searchTerm]);

  const fetchSongs = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 20,
        ...(searchTerm && { search: searchTerm })
      };
      const response = await musicAPI.getSongs(params);
      setSongs(response.data.songs);
    } catch (error) {
      toast.error('Failed to fetch songs');
      console.error('Error fetching songs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSongs();
  };

  const playSong = (song) => {
    console.log('Playing song:', song);
  };

  return (
    <div className="container" style={{ paddingTop: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '20px' }}>
          Discover Music
        </h1>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="Search for songs, artists, or albums..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 40px 12px 12px',
                border: '1px solid #333',
                borderRadius: '6px',
                backgroundColor: '#1a1a1a',
                color: 'white',
                fontSize: '14px'
              }}
            />
            <Search
              size={20}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#b3b3b3'
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>Loading songs...</div>
        </div>
      ) : (
        <>
          {songs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <h3>No songs found</h3>
              <p style={{ color: '#b3b3b3', marginTop: '10px' }}>
                {searchTerm ? 'Try a different search term' : 'No songs have been uploaded yet'}
              </p>
            </div>
          ) : (
            <div className="song-grid">
              {songs.map((song) => (
                <div key={song.id} className="song-card">
                  <div className="song-title">{song.title}</div>
                  <div className="song-artist">{song.artist}</div>
                  {song.album && (
                    <div style={{ color: '#b3b3b3', fontSize: '12px', marginTop: '5px' }}>
                      {song.album}
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '15px'
                  }}>
                    <button
                      onClick={() => playSong(song)}
                      style={{
                        background: '#1db954',
                        border: 'none',
                        borderRadius: '50%',
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'white'
                      }}
                    >
                      <Play size={16} />
                    </button>
                    <div style={{ fontSize: '12px', color: '#b3b3b3' }}>
                      by {song.uploader_name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {songs.length > 0 && (
            <div style={{ textAlign: 'center', marginTop: '40px', paddingBottom: '40px' }}>
              <button
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="btn btn-secondary"
              >
                Load More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HomePage;