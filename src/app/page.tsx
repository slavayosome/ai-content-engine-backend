export default function HomePage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>AI Content Engine Backend</h1>
      <p>This is a backend-only service with the following API endpoints:</p>
      
      <h2>Cron Jobs (Automated)</h2>
      <ul>
        <li><code>GET /api/fetch-trending</code> - Hourly article fetching</li>
        <li><code>GET /api/map-cache-to-users</code> - Hourly user matching</li>
        <li><code>GET /api/purge-cache</code> - Daily cleanup</li>
      </ul>
      
      <h2>User Endpoints</h2>
      <ul>
        <li><code>POST /api/accept-suggestion?id=UUID</code> - Accept suggestion</li>
        <li><code>DELETE /api/decline-suggestion?id=UUID</code> - Decline suggestion</li>
      </ul>
      
      <p>Status: <span style={{ color: 'green' }}>✓ Backend services running</span></p>
    </div>
  )
} 