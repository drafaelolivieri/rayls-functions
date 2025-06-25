// Importar fetch (necessário para Node.js < 18)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
  // ===== CORS CONFIGURATION =====
  // Permite requisições do Webflow e outros domínios
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // ===== HANDLE PREFLIGHT REQUESTS =====
  // Navegadores fazem requisição OPTIONS antes do POST
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders
    };
  }

  // ===== VALIDATE HTTP METHOD =====
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // ===== PARSE AND VALIDATE INPUT =====
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid JSON' })
    };
  }

  const { email, country, bank, wallet } = body;

  // ===== VALIDATE REQUIRED FIELDS =====
  if (!email || !country || !bank || !wallet) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Missing required fields',
        required: ['email', 'country', 'bank', 'wallet']
      })
    };
  }

  // ===== VALIDATE EMAIL FORMAT =====
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid email format' })
    };
  }

  // ===== VALIDATE ETHEREUM ADDRESS =====
  const ethRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!ethRegex.test(wallet)) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Invalid Ethereum address' })
    };
  }

  // ===== CALL EXTERNAL API =====
  try {
    console.log('Calling getwaitlist.com API...');
    
    const apiResponse = await fetch('https://api.getwaitlist.com/api/v1/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        waitlist_id: process.env.WAITLIST_ID,
        referral_link: event.headers.referer || event.headers.origin || '',
        metadata: {
          country: country,
          bank: bank,
          wallet: wallet,
          timestamp: new Date().toISOString(),
          user_agent: event.headers['user-agent'] || ''
        }
      })
    });

    // ===== HANDLE API RESPONSE =====
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('API Error:', apiResponse.status, errorText);
      
      return {
        statusCode: apiResponse.status,
        headers: corsHeaders,
        body: JSON.stringify({ 
          error: 'External API error',
          details: errorText
        })
      };
    }

    // ===== PARSE SUCCESS RESPONSE =====
    const apiData = await apiResponse.json();
    console.log('API Success:', apiData);

    // ===== RETURN SUCCESS RESPONSE =====
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        position: apiData.priority || 'Unknown',
        referral_link: apiData.referral_link || '',
        message: 'Successfully joined waitlist'
      })
    };

  } catch (error) {
    // ===== HANDLE NETWORK ERRORS =====
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: 'Failed to process request'
      })
    };
  }
};
