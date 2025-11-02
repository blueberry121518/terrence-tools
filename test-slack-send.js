/**
 * Test if token can send messages
 */
require('dotenv').config();

const SLACK_API_KEY = process.env.SLACK_API_KEY;

// Test chat.postMessage (what your tool uses)
fetch('https://slack.com/api/chat.postMessage', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SLACK_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    channel: '#general', // Change this to a channel in your workspace
    text: 'Test message from Terrence MCP Tools'
  })
})
  .then(res => res.json())
  .then(data => {
    if (data.ok) {
      console.log('✅ Successfully sent message!');
      console.log(`Channel: ${data.channel}`);
      console.log(`Message TS: ${data.ts}`);
    } else {
      console.error('❌ Failed to send message:');
      console.error(`Error: ${data.error}`);
      console.error(`Response: ${JSON.stringify(data, null, 2)}`);
      
      if (data.error === 'missing_scope') {
        console.error('\n⚠️  Your token needs the chat:write scope');
      } else if (data.error === 'invalid_auth') {
        console.error('\n⚠️  Token might be expired or invalid');
      } else if (data.error === 'channel_not_found') {
        console.error('\n⚠️  Channel not found. Try a channel ID instead: C1234567890');
      }
    }
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
  });
