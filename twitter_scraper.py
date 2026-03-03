#!/usr/bin/env python3
"""
Twitter/X News Scraper for OpenClaw
Pulls top tweets from news accounts for daily briefing
"""

import asyncio
import os
import sys
from datetime import datetime

try:
    from twikit import Client
except ImportError:
    print("Twikit not installed. Install with: pip install twikit")
    sys.exit(1)

# News accounts to monitor (modify as needed)
NEWS_ACCOUNTS = [
    "Reuters",
    "AP",
    "CNN",
    "BBCBreaking",
    "nytimes",
    "WSJ",
    "FoxNews",
    "AlJazeera",
    "DWNews",
    "SkyNews"
]

async def get_twitter_news():
    """Pull top tweets from news accounts"""
    results = []
    
    # Initialize client
    client = Client('en-US')
    
    # Login - you'll need to provide credentials
    # First run will require you to authenticate via cookies
    try:
        cookies_path = os.path.expanduser('~/.openclaw/twitter_cookies.json')
        
        if os.path.exists(cookies_path):
            await client.load_cookies(cookies_path)
            print("✓ Loaded existing cookies")
        else:
            print("⚠ No cookies found. You need to login first.")
            print("Run the authentication script first.")
            return results
            
    except Exception as e:
        print(f"✗ Login error: {e}")
        print("Please run the auth script first to generate cookies.")
        return results
    
    # Fetch tweets from each news account
    for account in NEWS_ACCOUNTS:
        try:
            tweets = await client.get_user_tweets(account, 'Tweets', 5)
            for tweet in tweets[:3]:  # Get top 3 from each
                results.append({
                    'source': account,
                    'text': tweet.text[:280] if len(tweet.text) > 280 else tweet.text,
                    'url': f"https://twitter.com/{account}/status/{tweet.id}",
                    'created_at': tweet.created_at,
                    'likes': tweet.like_count,
                    'retweets': tweet.retweet_count
                })
        except Exception as e:
            print(f"✗ Error fetching {account}: {e}")
    
    # Sort by engagement (likes + retweets)
    results.sort(key=lambda x: x['likes'] + x['retweets'], reverse=True)
    
    return results[:15]  # Return top 15 total

def format_news_tweet(results):
    """Format tweets into readable briefing"""
    if not results:
        return "No tweets available. Check cookies file."
    
    output = "**TWITTER NEWS HIGHLIGHTS**\n\n"
    
    for i, tweet in enumerate(results[:15], 1):
        output += f"{i}. **@{tweet['source']}**\n"
        output += f"   {tweet['text']}\n"
        output += f"   {tweet['likes']:,} likes | {tweet['retweets']:,} retweets\n"
        output += f"   → {tweet['url']}\n\n"
    
    return output

async def main():
    """Main entry point"""
    print(f"Twitter News Scraper - {datetime.now().isoformat()}")
    print("-" * 50)
    
    results = await get_twitter_news()
    
    if results:
        print(format_news_tweet(results))
    else:
        print("No tweets retrieved.")
    
    return results

if __name__ == "__main__":
    asyncio.run(main())