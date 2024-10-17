import asyncio
import time
import threading
import json
import requests
import socket
from flask import Flask, request, jsonify
from datetime import datetime, timedelta

app = Flask(__name__)

TWITCH_TOKEN = 'TWITCH_TOKEN'
TWITCH_NICKNAME = 'TWITCH_NICKNAME'
TWITCH_OAUTH = f'oauth:{TWITCH_TOKEN}'  # Ensure the token is prefixed with 'oauth:'

channels_with_viewers = []
message_sent_log = {}
log_file_path = 'message_log.json'

server = "irc.chat.twitch.tv"
port = 6667

# Load message log from file
def load_message_log():
    global message_sent_log
    try:
        with open(log_file_path, 'r') as file:
            message_sent_log = json.load(file)
    except FileNotFoundError:
        message_sent_log = {}

# Save message log to file
def save_message_log():
    with open(log_file_path, 'w') as file:
        json.dump(message_sent_log, file)

async def irc_send_message(channel, message):
    try:
        irc = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        irc.connect((server, port))
        print(f"Connected to IRC server for channel {channel}")

        irc.send(f"PASS {TWITCH_OAUTH}\n".encode("utf-8"))
        irc.send(f"NICK {TWITCH_NICKNAME}\n".encode("utf-8"))
        irc.send(f"JOIN #{channel}\n".encode("utf-8"))
        print(f"Joined channel {channel}")

        await asyncio.sleep(1)  # Wait for joining the channel

        irc.send(f"PRIVMSG #{channel} :{message}\n".encode("utf-8"))
        print(f"Sent message to {channel}: {message}")

        await asyncio.sleep(1)  # Wait for the message to be sent

        irc.send(f"PART #{channel}\n".encode("utf-8"))
        irc.close()
        print(f"Left channel {channel}")

        # Log the message sent time
        message_sent_log[channel] = datetime.now().isoformat()
        save_message_log()

    except Exception as e:
        print(f"Error sending message to {channel}: {e}")

@app.route('/channels', methods=['POST'])
def receive_channels():
    global channels_with_viewers
    channels_with_viewers = sorted(request.json, key=lambda k: k['viewers'], reverse=True)
    return jsonify({'status': 'received'}), 200

def start_message_thread():
    threading.Thread(target=message_scheduler, daemon=True).start()

def message_scheduler():
    while True:
        asyncio.run(send_messages())
        time.sleep(10)  # 10 seconds interval

async def send_messages():
    message = ("Attention Gamers! Dalaya, a new RPG launches Oct 7 at 6pm. Check it out on the Dalaya Discord at discord.gg/dalaya")
    for i in range(0, len(channels_with_viewers), 18):  # Process in batches of 18 channels
        batch = channels_with_viewers[i:i+18]
        tasks = []
        for channel_info in batch:
            channel_name = channel_info['name']
            if not should_send_message(channel_name):
                continue
            tasks.append(asyncio.create_task(irc_send_message(channel_name, message)))
        await asyncio.gather(*tasks)
        print(f"Completed batch of {len(batch)} channels. Waiting for next batch.")
        await asyncio.sleep(10)  # Wait 10 seconds before the next batch

def should_send_message(channel_name):
    now = datetime.now()
    two_weeks_ago = now - timedelta(weeks=2)
    if channel_name in message_sent_log:
        last_sent = datetime.fromisoformat(message_sent_log[channel_name])
        if last_sent > two_weeks_ago:
            return False
    return True

if __name__ == '__main__':
    load_message_log()
    start_message_thread()
    app.run(host='0.0.0.0', port=5001)
