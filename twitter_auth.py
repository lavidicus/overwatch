#!/usr/bin/env python3
"""
Twitter/X Authentication Script for OpenClaw
Run this once to generate cookies file
"""

import asyncio
import os
import sys

try:
    from twikit import Client
except ImportError:
    print("Twikit not installed. Install with: pip3 install twikit")
    sys.exit(1)

async def authenticate():
    """Authenticate with Twitter and save cookies"""
    print("Twitter/X Authentication for OpenClaw")
    print("=" * 50)
    print()
    print("This will authenticate your Twitter account and")
    print("save cookies for future automated scraping.")
    print()
    print("⚠️  WARNING: You're logging into your personal Twitter account.")
    print("   Make sure you trust this process.")
    print()
    
    # Get credentials
    username = input("Enter Twitter username/email/phone: ").strip()
    email = input("Enter email (same as username if email login): ").strip()
    password = input("Enter password: ").strip()
    
    if not username or not password:
        print("✗ Username and password required.")
        return False
    
    print()
    print("Authenticating...")
    
    try:
        # Initialize client
        client = Client('en-US')
        
        # Login
        await client.login(
            auth_info_1=username,
            auth_info_2=email if email != username else None,
            password=password
        )
        
        # Save cookies
        cookies_path = os.path.expanduser('~/.openclaw/twitter_cookies.json')
        await client.save_cookies(cookies_path)
        
        print()
        print("✅ Authentication successful!")
        print(f"   Cookies saved to: {cookies_path}")
        print()
        print("You can now use the Twitter scraper.")
        print()
        print("Test it with: python3 twitter_scraper.py")
        
        return True
        
    except Exception as e:
        print()
        print(f"✗ Authentication failed: {e}")
        print()
        print("Troubleshooting:")
        print("  - Check your username/password")
        print("  - If 2FA is enabled, you may need to complete it manually")
        print("  - Twitter may require CAPTCHA completion")
        return False

if __name__ == "__main__":
    success = asyncio.run(authenticate())
    sys.exit(0 if success else 1)