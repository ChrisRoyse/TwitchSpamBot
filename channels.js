const { ChatClient, JoinRateLimiter, ConnectionRateLimiter, ConnectionPool } = require('@kararty/dank-twitch-irc');
const axios = require('axios');
const existingChannels = new Set();

const TWITCH_CLIENT_ID = 'TWITCH_CLIENT_ID';  // FILL IN
const TWITCH_CLIENT_SECRET = 'TWITCH_CLIENT_SECRET';  // FILL IN
let PERMANENT_ACCESS_TOKEN = 'PERMANENT_ACCESS_TOKEN';  // FILL IN
let PERMANENT_REFRESH_TOKEN = 'PERMANENT_REFRESH_TOKEN';  // FILL IN

const client = new ChatClient({
    username: 'USERNAME',  // FILL IN
    password: 'PASSWORD',  // FILL IN
    rateLimits: 'BOT TYPE',  // FILL IN
    ignoreUnhandledPromiseRejections: true,
    installDefaultMixins: false,
    connection: {
        type: 'websocket',
        secure: true,
    },
    maxChannelCountPerConnection: 5000,
    connectionRateLimits: {
        parallelConnections: 3500,
        releaseTime: 20,
    }
});

client.use(new JoinRateLimiter(client));
client.use(new ConnectionPool(client, { poolSize: 150 }));
client.use(new ConnectionRateLimiter(client));

client.on('ready', () => console.log('connected'));

function processChannels(channels) {
    const uniqueChannels = channels.filter(channel => !existingChannels.has(channel.user_login));
    uniqueChannels.forEach(channel => existingChannels.add(channel.user_login));

    if (uniqueChannels.length > 0) {
        client.joinAll(uniqueChannels.map(channel => channel.user_login));
        // Send channel list to the Python application
        sendChannelsToPython(uniqueChannels.map(channel => ({ name: channel.user_login, viewers: channel.viewer_count })));
    }
}

async function fetchAccessToken() {
    try {
        const response = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: TWITCH_CLIENT_ID,
                client_secret: TWITCH_CLIENT_SECRET,
                grant_type: 'refresh_token',
                refresh_token: PERMANENT_REFRESH_TOKEN
            }
        });
        PERMANENT_ACCESS_TOKEN = response.data.access_token;
        PERMANENT_REFRESH_TOKEN = response.data.refresh_token;
    } catch (error) {
        console.error('Error refreshing access token:', error);
    }
}

async function fetchChannels() {
    let cursor;
    try {
        do {
            const response = await axios.get(`https://api.twitch.tv/helix/streams?first=100${cursor ? `&after=${cursor}` : ''}`, {
                headers: {
                    'Client-ID': TWITCH_CLIENT_ID,
                    'Authorization': `Bearer ${PERMANENT_ACCESS_TOKEN}`
                }
            });
            cursor = response.data.pagination.cursor;
            processChannels(response.data.data);
        } while (cursor);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            // Access token expired, refresh it
            await fetchAccessToken();
            // Retry fetching channels
            await fetchChannels();
        } else {
            console.error('Error fetching channels:', error);
        }
    }
}

function sendChannelsToPython(channels) {
    axios.post('http://127.0.0.1:5001/channels', channels)
        .then(response => {
            console.log('Successfully sent channels to Python application');
        })
        .catch(error => {
            console.error('Error sending channels to Python application:', error);
        });
}

function xd() {
    fetchChannels()
        .then(() => setTimeout(xd, 300))
        .catch(() => setTimeout(xd, 1000));
}

client.connect();
xd();

setInterval(() => {
    console.log(`connections: ${client.connections.length}, joined: ${client.joinedChannels.size}`);
}, 15000);
