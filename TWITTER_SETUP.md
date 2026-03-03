# Twitter/X Scraper Setup Guide

## Overview
This guide helps you set up free Twitter/X scraping using Twikit (no expensive API needed).

## Files

- `twitter_auth.py` - Authentication script (run once)
- `twitter_scraper.py` - Main scraper (pulls news tweets)

## Setup Steps

### 1. Install Twikit

```bash
pip3 install twikit
```

If pip3 is not available:
```bash
python3 -m pip install twikit
```

### 2. Authenticate (Run Once)

```bash
cd /home/localadmin/.openclaw/workspace
python3 twitter_auth.py
```

This will:
- Prompt for your Twitter username/email and password
- Generate a `cookies.json` file in `~/.openclaw/`
- Save cookies for future automated scraping

**⚠️ Security Note:** 
- Cookies are saved locally in `~/.openclaw/twitter_cookies.json`
- Only readable by your user account
- Twitter may require 2FA or CAPTCHA completion during login

### 3. Test the Scraper

```bash
python3 twitter_scraper.py
```

This will:
- Load your saved cookies
- Fetch top tweets from news accounts
- Display them sorted by engagement (likes + retweets)

### 4. Add to Daily Briefing (Optional)

The cron job is already configured to search for tweets. It will:
- Search for trending topics from news accounts
- Include top tweets in your daily briefing

## News Accounts Monitored

By default, the scraper monitors:
- Reuters
- AP (Associated Press)
- CNN
- BBCBreaking
- nytimes
- WSJ (Wall Street Journal)
- FoxNews
- AlJazeera
- DWNews
- SkyNews

## Customization

### Add/Remove Accounts

Edit `twitter_scraper.py` and modify the `NEWS_ACCOUNTS` list:

```python
NEWS_ACCOUNTS = [
    "YourAccount1",
    "YourAccount2",
    # ...
]
```

### Change Output Format

Modify the `format_news_tweet()` function in `twitter_scraper.py`.

## Troubleshooting

### "No cookies found"
- Run `python3 twitter_auth.py` first
- Check `~/.openclaw/twitter_cookies.json` exists

### Authentication failed
- Verify username/password
- Twitter may require 2FA - complete it during login
- May need to complete a CAPTCHA

### "Twitter changed their site"
- Twikit uses scraping, which can break if Twitter updates their UI
- Check GitHub issues: https://github.com/d60/twikit/issues

### Rate limiting
- Twitter may limit requests
- Add delays between requests if needed
- Don't scrape too frequently

## Integration with OpenClaw

The scraper is set up to run as part of your daily briefing cron job at 6AM CST.

The cron job searches for:
1. Top 3 geopolitics news items
2. Top 3 cybersecurity news items  
3. Top tweets from news accounts

All delivered to your Signal chat.

## Alternative: Apify

If Twikit stops working, consider Apify's Tweet Scraper:
- More reliable (handles anti-bot measures)
- Cost: $40 per 1,000 tweets (free tier available)
- No authentication needed
- Docs: https://blog.apify.com/how-to-scrape-tweets-and-more-on-twitter-59330e6fb522/