export default function handler(req, res) {
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.searchParams.set('client_id', process.env.GOOGLE_ID);
  u.searchParams.set('redirect_uri', 'https://' + req.headers.host + '/api/callback');
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'https://www.googleapis.com/auth/meetings.space.created');
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent');
  res.redirect(u.toString());
}
