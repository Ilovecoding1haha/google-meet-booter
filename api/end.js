async function token() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: process.env.REFRESH_TOKEN,
      client_id: process.env.GOOGLE_ID,
      client_secret: process.env.GOOGLE_SECRET,
      grant_type: 'refresh_token'
    })
  }).then(x => x.json());
  return r.access_token;
}

export default async function handler(req, res) {
  const code = String(req.query.code || '').replace(/[^a-z-]/gi, '');
  if (!code) return res.status(400).json({ ok: false, error: 'no code' });

  const t = await token();
  if (!t) return res.status(500).json({ ok: false, error: 'token failed' });
  const H = { Authorization: 'Bearer ' + t };

  const look = await fetch('https://meet.googleapis.com/v2/spaces/' + code, { headers: H });
  if (!look.ok) {
    return res.status(200).json({
      ok: false, stage: 'lookup',
      error: 'space not found or not owned by you — create it via the API first'
    });
  }
  const space = await look.json();
  const id = space.name.split('/').pop();
  const live = !!space.activeConference;

  const kill = await fetch('https://meet.googleapis.com/v2/spaces/' + id + ':endActiveConference', {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: '{}'
  });

  return res.status(200).json({
    ok: kill.ok, space: id, wasLive: live, status: kill.status,
    error: kill.ok ? null : (await kill.text()).slice(0, 300)
  });
}
