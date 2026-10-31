export default async function handler(req, res) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: req.query.code,
      client_id: process.env.GOOGLE_ID,
      client_secret: process.env.GOOGLE_SECRET,
      redirect_uri: 'https://' + req.headers.host + '/api/callback',
      grant_type: 'authorization_code'
    })
  }).then(x => x.json());

  res.setHeader('Content-Type', 'text/html');
  res.send('<body style="font:14px system-ui;padding:30px;background:#0b0b0c;color:#fff">' +
    '<h3>Paste into Vercel as REFRESH_TOKEN</h3>' +
    '<textarea style="width:100%;height:110px;background:#1c1c1e;color:#30d158;border:0;padding:10px">' +
    (r.refresh_token || JSON.stringify(r)) + '</textarea>' +
    '<p style="color:#8a8a8e">Then redeploy.</p></body>');
}
