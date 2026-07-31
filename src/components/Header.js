import React from 'react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <h1 className="header-title">
          <span className="blockchain-icon">⛓️</span>
          Blockchain Explorer
        </h1>
        <p className="header-subtitle">Real-time blockchain visualization and interaction</p>
      </div>
    </header>
  );
};

export default Header;
