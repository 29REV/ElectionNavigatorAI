import React from 'react';

function Manifestos() {
  const parties = [
    {
      name: 'DMK',
      url: 'https://www.dmk.in/en/resources/manifesto/',
      description: 'Dravida Munnetra Kazhagam'
    },
    {
      name: 'TVK',
      url: 'https://tvkmanifesto2026.com/',
      description: 'Tamilaga Vettri Kazhagam'
    },
    {
      name: 'AIADMK',
      url: 'https://aiadmk.com/aiadmk-manifesto-2026/',
      description: 'All India Anna Dravida Munnetra Kazhagam'
    },
    {
      name: 'NTK',
      url: 'https://makkalarasu.in/',
      description: 'Naam Tamilar Katchi'
    }
  ];

  return (
    <div className="manifestos-container">
      <h1>Election Manifestos</h1>
      <p>Explore the official manifesto pages of major political parties contesting in the Tamil Nadu MLA elections.</p>
      
      <div className="manifestos-grid">
        {parties.map((party, index) => (
          <div key={index} className="party-card">
            <h2>{party.name}</h2>
            <p>{party.description}</p>
            <a 
              href={party.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="manifesto-link"
            >
              View Manifesto
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Manifestos;