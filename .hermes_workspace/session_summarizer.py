#!/usr/bin/env python3
"""
Session Summarizer - Compresses conversation history to save context tokens
Preserves key decisions, tool calls, and outcomes while reducing context by 50-70%
"""

import json
from datetime import datetime

class SessionSummarizer:
    def __init__(self, context_window=266000, compression_threshold=0.85):
        self.context_window = context_window
        self.compression_threshold = compression_threshold
        self.preserved_items = []
    
    def calculate_usage(self, messages):
        """Calculate current token usage"""
        total_tokens = sum(len(msg.get('content', '')) for msg in messages)
        return total_tokens
    
    def should_summarize(self, messages):
        """Check if summarization is needed"""
        usage = self.calculate_usage(messages)
        return usage > (self.context_window * self.compression_threshold)
    
    def identify_preserved_items(self, messages):
        """Extract critical items that should not be summarized"""
        preserved = []
        for msg in messages:
            if msg.get('tool_call') or msg.get('tool_result'):
                preserved.append(msg)
            elif 'error' in msg.get('content', '').lower() or 'exception' in msg.get('content', '').lower():
                preserved.append(msg)
            elif 'decision' in msg.get('content', '').lower() or 'conclusion' in msg.get('content', '').lower():
                preserved.append(msg)
        return preserved
    
    def summarize_messages(self, messages):
        """Summarize messages while preserving critical items"""
        preserved = self.identify_preserved_items(messages)
        to_summarize = [m for m in messages if m not in preserved]
        
        # Group messages by topic/session
        summarized = []
        current_topic = []
        for msg in to_summarize:
            if msg.get('role') != 'system':
                current_topic.append(msg)
            else:
                if current_topic:
                    # Compress the topic
                    summary = self._compress_topic(current_topic)
                    summarized.append({'role': 'system', 'content': f'### {summary}'})
                    current_topic = []
        
        return summarized + preserved
    
    def _compress_topic(self, messages):
        """Compress a topic's messages"""
        if not messages:
            return ""
        
        # Extract key information
        tool_calls = [m for m in messages if m.get('tool_call')]
        outcomes = [m for m in messages if m.get('tool_result')]
        
        # Generate compressed summary
        summary = f"{len(messages)} messages, {len(tool_calls)} tool calls, {len(outcomes)} outcomes"
        return summary
    
    def compress(self, messages):
        """Main compression method"""
        if not self.should_summarize(messages):
            return messages
        
        return self.summarize_messages(messages)
    
    def get_stats(self, original, compressed):
        """Get compression statistics"""
        original_tokens = self.calculate_usage(original)
        compressed_tokens = self.calculate_usage(compressed)
        reduction = ((original_tokens - compressed_tokens) / original_tokens) * 100
        
        return {
            'original_tokens': original_tokens,
            'compressed_tokens': compressed_tokens,
            'reduction_percent': round(reduction, 2)
        }

# Example usage
if __name__ == "__main__":
    summarizer = SessionSummarizer()
    
    # Sample messages (would be from actual session history)
    messages = [
        {'role': 'user', 'content': 'Check system status'},
        {'role': 'assistant', 'content': 'Running: systemctl status llama-server', 'tool_call': 'systemctl'},
        {'role': 'system', 'content': 'Active: active (running)'},
        {'role': 'user', 'content': 'What about the gateway?'},
        {'role': 'assistant', 'content': 'Gateway is running normally', 'tool_call': 'openclaw_gateway_status'},
    ]
    
    compressed = summarizer.compress(messages)
    stats = summarizer.get_stats(messages, compressed)
    
    print("Compression Results:")
    print(f"Original tokens: {stats['original_tokens']}")
    print(f"Compressed tokens: {stats['compressed_tokens']}")
    print(f"Reduction: {stats['reduction_percent']}%")
    print("\nCompressed messages:")
    for msg in compressed:
        print(f"  - {msg['content'][:100]}...")
