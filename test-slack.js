/**
 * Quick test script to verify Slack token works
 * Run with: node test-slack.js
 */
require('dotenv').config();

const SLACK_API_KEY = process.env.SLACK_API_KEY;

if (!SLACK_API_KEY) {
  console.error('❌ SLACK_API_KEY not found in .env');
  process.exit(1);
}

console.log(`Token type: ${SLACK_API_KEY.substring(0, 5)}`);
console.log(`Token length: ${SLACK_API_KEY.length}`);

// Test the token
fetch('https://slack.com/api/auth.test', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SLACK_API_KEY}`,
    'Content-Type': 'application/json'
  }
})
  .then(res => res.json())
  .then(data => {
    if (data.ok) {
      console.log('✅ Token is valid!');
      console.log(`Bot: ${data.bot_id || 'N/A'}`);
      console.log(`User: ${data.user_id || 'N/A'}`);
      console.log(`Team: ${data.team || 'N/A'}`);
    } else {
      console.error('❌ Token validation failed:');
      console.error(`Error: ${data.error}`);
      if (data.error === 'invalid_auth') {
        console.error('\nThis token might be:');
        console.error('- Expired (xoxe- tokens expire)');
        console.error('- Not a Bot Token (need xoxb- token)');
        console.error('- Missing chat:write scope');
      }
    }
  })
  .catch(err => {
    console.error('❌ Error testing token:', err.message);
  });

