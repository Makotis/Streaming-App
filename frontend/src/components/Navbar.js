import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Music, Upload, User, LogOut, Home } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <ul className="navbar-nav">
          <li>
            <Link to="/" className="nav-link">
              <Music size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Music Stream
            </Link>
          </li>
          <li>
            <Link to="/">
              <Home size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
              Home
            </Link>
          </li>

          {user ? (
            <>
              <li>
                <Link to="/upload">
                  <Upload size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                  Upload
                </Link>
              </li>
              <li>
                <Link to="/profile">
                  <User size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                  Profile
                </Link>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#b3b3b3',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  <LogOut size={16} style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                  Logout
                </button>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/login">Login</Link>
              </li>
              <li>
                <Link to="/register">Register</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;