import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [containers, setContainers] = useState([]);
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const [containersRes, certsRes] = await Promise.all([
        axios.get(`${API_URL}/containers`),
        axios.get(`${API_URL}/certs`)
      ]);
      setContainers(containersRes.data.containers || []);
      setCerts(certsRes.data.certificates || []);
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContainerAction = async (name, action) => {
    try {
      await axios.post(`${API_URL}/containers/${name}/${action}`);
      fetchStatus();
    } catch (error) {
      console.error(`Error ${action}ing container:`, error);
      alert(`Failed to ${action} container: ${error.response?.data?.error || error.message}`);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔐 CertForge Admin Portal</h1>
        <p>CA Infrastructure Management</p>
      </header>

      <main className="App-main">
        <section className="section">
          <h2>📦 Containers</h2>
          <div className="container-list">
            {containers.map(container => (
              <div key={container.id} className={`container-card status-${container.status}`}>
                <div className="container-header">
                  <h3>{container.name}</h3>
                  <span className={`status-badge ${container.status}`}>{container.status}</span>
                </div>
                <div className="container-info">
                  <p><strong>Image:</strong> {container.image}</p>
                  <p><strong>Ports:</strong> {JSON.stringify(container.ports)}</p>
                </div>
                <div className="container-actions">
                  {container.status === 'stopped' && (
                    <button onClick={() => handleContainerAction(container.name, 'start')}>
                      ▶ Start
                    </button>
                  )}
                  {container.status === 'running' && (
                    <>
                      <button onClick={() => handleContainerAction(container.name, 'restart')}>
                        🔄 Restart
                      </button>
                      <button onClick={() => handleContainerAction(container.name, 'stop')}>
                        ⏹ Stop
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <h2>📜 Certificates</h2>
          <div className="cert-list">
            {certs.length === 0 ? (
              <p>No certificates issued yet.</p>
            ) : (
              certs.map(cert => (
                <div key={cert} className="cert-item">
                  <span>{cert}</span>
                  <a 
                    href={`${API_URL}/certs/${cert}`} 
                    download
                    className="download-btn"
                  >
                    ⬇ Download
                  </a>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
