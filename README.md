# TwitchSpamBot: Efficient Channel Messaging at Scale

TwitchSpamBot is a program designed to send messages to millions of active Twitch channels quickly and efficiently. The bot pulls a list of all currently active Twitch channels and sends them to a Python application, which saves them in a JSON file. The bot then joins the channels, starting with the ones with the highest number of viewers, and sends predefined messages before leaving the channel. The system is designed to stay just under Twitch’s API rate limits, ensuring smooth and uninterrupted operation.

# Key Features:

Active Channel Scraping: Retrieves a list of all active Twitch channels and saves the data in a JSON file.

Smart Channel Joining: Prioritizes channels with the most viewers, joining 18 channels at a time every 10 seconds to stay under Twitch's API rate limits.

Automated Messaging: Sends predefined messages to each channel upon joining, then leaves the channel.

Spam Avoidance: After messaging a channel, it adds the channel’s name to a separate JSON file to prevent rejoining and re-messaging, avoiding repeated spam.

Mass Messaging: Capable of messaging over 50 million Twitch users within an hour or two.

# How It Works:

The program scrapes active Twitch channels and saves them in a JSON file.

Channels are sorted by viewer count, and the bot starts joining 18 channels every 10 seconds.

The bot sends a predefined message to each channel it joins, and then leaves.

The bot records each channel it has messaged in a separate JSON file to avoid re-messaging.

This process repeats, allowing for millions of messages to be sent in a very short time.

# Tech Stack:

Python for handling channel joining, messaging, and JSON file management

Twitch API for retrieving active channels and managing the bot’s connection
