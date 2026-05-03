import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Chat from './Chat';
import Manifestos from './Manifestos';
import './App.css';

function App() {
  return (
    <Router>
      <div>
        <nav style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '10px 20px', 
          borderBottom: '1px solid #dee2e6',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
            <Link to="/" style={{ 
              textDecoration: 'none', 
              color: '#007bff', 
              fontSize: '24px', 
              fontWeight: 'bold',
              marginRight: '30px'
            }}>
              Election Navigator 🗳️
            </Link>
            <div style={{ display: 'flex', gap: '20px' }}>
              <Link to="/" style={{ 
                textDecoration: 'none', 
                color: '#495057',
                padding: '8px 16px',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}>
                Chat Assistant
              </Link>
              <Link to="/manifestos" style={{ 
                textDecoration: 'none', 
                color: '#495057',
                padding: '8px 16px',
                borderRadius: '4px',
                transition: 'background-color 0.2s'
              }}>
                Manifestos
              </Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/" element={<Chat />} />
          <Route path="/manifestos" element={<Manifestos />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
