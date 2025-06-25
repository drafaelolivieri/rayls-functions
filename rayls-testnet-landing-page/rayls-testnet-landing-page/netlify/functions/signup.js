exports.handler = async (event) => {
  /* ---------- CORS & method guards ---------- */
  if (event.httpMethod === 'OPTIONS')
    return { statusCode: 200,
      headers:{ 'Access-Control-Allow-Origin':'*',
                'Access-Control-Allow-Methods':'POST,OPTIONS',
                'Access-Control-Allow-Headers':'Content-Type' } };

  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method Not Allowed' };

  /* ---------- parse & sanity-check ---------- */
  const { email, country, bank, wallet } = JSON.parse(event.body || '{}');
  if (!email || !country || !bank || !wallet)
    return { statusCode: 400, body: 'Missing fields' };

  try {
    /* one call only – Create Signup */
    const apiRes = await fetch('https://api.getwaitlist.com/api/v1/signup', {
      method : 'POST',
      headers: { 'Content-Type':'application/json' },
      body   : JSON.stringify({
        email,
        waitlist_id : process.env.WAITLIST_ID,
        referral_link: event.headers.referer || '',
        metadata    : { country, bank, wallet }
      })
    });

    if (!apiRes.ok)
      return { statusCode: apiRes.status, body: await apiRes.text() };

    const { priority, referral_link } = await apiRes.json();

    /* return just what the front-end needs */
    return {
      statusCode: 200,
      headers   : { 'Access-Control-Allow-Origin':'*' },
      body      : JSON.stringify({
        position: priority,          // ← live queue number
        referral_link
      })
    };

  } catch (err) {
    console.error('Waitlist proxy error', err);
    return { statusCode: 500, body: 'Waitlist proxy error' };
  }
};
