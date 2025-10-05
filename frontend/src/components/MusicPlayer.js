import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';

const MusicPlayer = () => {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = audioRef.current;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };

    const setAudioTime = () => setCurrentTime(audio.currentTime);

    if (audio) {
      audio.addEventListener('loadeddata', setAudioData);
      audio.addEventListener('timeupdate', setAudioTime);

      return () => {
        audio.removeEventListener('loadeddata', setAudioData);
        audio.removeEventListener('timeupdate', setAudioTime);
      };
    }
  }, [currentSong]);

  const playPause = () => {
    const prevValue = isPlaying;
    setIsPlaying(!prevValue);
    if (!prevValue) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressChange = (e) => {
    const newTime = (e.target.value / 100) * duration;
    setCurrentTime(newTime);
    audioRef.current.currentTime = newTime;
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value / 100;
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
  };

  if (!currentSong) {
    return null;
  }

  return (
    <div className="player">
      <audio ref={audioRef} src={currentSong.file_url} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: '0 0 300px' }}>
          <div>
            <div className="song-title" style={{ fontSize: '14px', marginBottom: '2px' }}>
              {currentSong.title}
            </div>
            <div className="song-artist" style={{ fontSize: '12px' }}>
              {currentSong.artist}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
          <div className="player-controls">
            <button style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer' }}>
              <SkipBack size={20} />
            </button>
            <button
              onClick={playPause}
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
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button style={{ background: 'none', border: 'none', color: '#b3b3b3', cursor: 'pointer' }}>
              <SkipForward size={20} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '5px', width: '100%', maxWidth: '500px' }}>
            <span style={{ fontSize: '12px', color: '#b3b3b3', minWidth: '40px' }}>
              {formatTime(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={duration ? (currentTime / duration) * 100 : 0}
              onChange={handleProgressChange}
              style={{ flex: 1, height: '4px' }}
            />
            <span style={{ fontSize: '12px', color: '#b3b3b3', minWidth: '40px' }}>
              {formatTime(duration)}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 200px', justifyContent: 'flex-end' }}>
          <Volume2 size={16} style={{ color: '#b3b3b3' }} />
          <input
            type="range"
            min="0"
            max="100"
            value={volume * 100}
            onChange={handleVolumeChange}
            style={{ width: '80px', height: '4px' }}
          />
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;