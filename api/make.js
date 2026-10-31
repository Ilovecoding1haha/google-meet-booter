export default async function handler(req, res) {
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

  const s = await fetch('https://meet.googleapis.com/v2/spaces', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + r.access_token, 'Content-Type': 'application/json' },
    body: '{}'
  }).then(x => x.json());

  res.status(200).json({ ok: true, code: s.meetingCode, uri: s.meetingUri });
}
