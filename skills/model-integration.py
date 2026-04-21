#!/usr/bin/env python3
"""
Model Integration Module - Calls qwen3.5 to generate skill improvements

Integrates with local Ollama instance to generate:
- SKILL.md amendments based on failure analysis
- Improvement proposals with specific changes
- A/B test content generation
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime

class ModelIntegrator:
    """Integrate with local qwen3.5 model for skill improvements"""
    
    def __init__(self, model_name: str = "qwen3.5:latest"):
        self.model_name = model_name
        self.ollama_base_url = "http://localhost:11434/api/generate"
    
    def call_model(self, prompt: str, system_prompt: str = "") -> str:
        """Call qwen3.5 via Ollama API"""
        try:
            # Build the request
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "num_ctx": 32768,  # Use available context
                }
            }
            
            if system_prompt:
                payload["system"] = system_prompt
            
            # Execute via subprocess (Ollama CLI)
            result = subprocess.run(
                [
                    "ollama", "run", self.model_name,
                    f"System: {system_prompt}\n\n{prompt}"
                ],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode != 0:
                # Fallback to API call
                return self._call_api(payload)
            
            return result.stdout.strip()
        
        except subprocess.TimeoutExpired:
            return "[TIMEOUT] Model call exceeded 120s limit"
        except Exception as e:
            return f"[ERROR] {str(e)}"
    
    def _call_api(self, payload: Dict) -> str:
        """Call Ollama API directly"""
        import urllib.request
        
        try:
            data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                self.ollama_base_url,
                data=data,
                headers={'Content-Type': 'application/json'}
            )
            
            with urllib.request.urlopen(req, timeout=120) as response:
                result = json.loads(response.read())
                return result.get('response', '')
        
        except Exception as e:
            return f"[API_ERROR] {str(e)}"
    
    def generate_improvement_proposal(
        self,
        current_skill_content: str,
        failure_analysis: Dict,
        improvement_goal: str
    ) -> str:
        """
        Generate improvement proposal for a skill based on failure analysis
        
        Returns: Modified SKILL.md content with improvements
        """
        
        system_prompt = """You are an expert AI assistant helping to improve a skill's SKILL.md file.
You analyze failure patterns and propose specific, actionable improvements to the skill's instructions.
Your improvements should be:
- Specific and actionable
- Address the identified failure patterns
- Maintain the skill's original intent
- Add clear error handling and fallback behavior
- Include better trigger conditions when needed"""
        
        prompt = f"""
# Current Skill Content
{current_skill_content[:10000]}...  # (truncated for context)

# Failure Analysis
{json.dumps(failure_analysis, indent=2)}

# Improvement Goal
{improvement_goal}

# Task
Based on the failure analysis, propose specific improvements to the SKILL.md file.
Include:
1. Updated trigger conditions (if needed)
2. Better error handling
3. Clearer instructions
4. Additional safeguards
5. Version update

Return ONLY the improved SKILL.md content, nothing else.
"""
        
        return self.call_model(prompt, system_prompt)
    
    def generate_error_handler_addition(
        self,
        current_skill_content: str,
        error_types: List[str]
    ) -> str:
        """Generate error handling section to add to the skill"""
        
        system_prompt = """You are creating error handling sections for AI skills.
Add comprehensive error handling, fallback behavior, and recovery strategies."""
        
        prompt = f"""
# Current Skill
{current_skill_content[:5000]}

# Error Types Encountered
{error_types}

# Task
Create an "Error Handling & Recovery" section to add to the skill.
Include:
- Common error patterns
- Fallback strategies
- Recovery procedures
- When to ask for help
- Logging recommendations

Return ONLY the error handling section markdown.
"""
        
        return self.call_model(prompt, system_prompt)
    
    def generate_trigger_optimization(
        self,
        current_skill_content: str,
        failure_rate: float,
        recent_failures: List[Dict]
    ) -> str:
        """Generate optimized trigger conditions"""
        
        system_prompt = """You are optimizing AI skill trigger conditions.
Help make triggers more precise to reduce false positives and failures."""
        
        prompt = f"""
# Current Skill
{current_skill_content[:5000]}

# Performance Data
- Failure Rate: {failure_rate*100:.1f}%
- Recent Failures: {len(recent_failures)}

# Task
Propose optimized trigger conditions that:
1. Reduce false positives
2. Better match user intent
3. Add exclusion criteria
4. Include confidence thresholds

Return ONLY the updated "When to Use" section.
"""
        
        return self.call_model(prompt, system_prompt)

# Convenience functions
def generate_skill_improvement(skill_name: str, current_content: str, failure_analysis: Dict):
    """Generate improvement for a specific skill"""
    integrator = ModelIntegrator()
    
    proposal = integrator.generate_improvement_proposal(
        current_content,
        failure_analysis,
        f"Reduce failure rate for {skill_name} skill"
    )
    
    return proposal

if __name__ == "__main__":
    # Test the model integration
    print("🧪 Testing model integration...")
    
    integrator = ModelIntegrator()
    
    # Test call
    test_prompt = "Hello, can you confirm you're working?"
    response = integrator.call_model(test_prompt)
    
    print(f"Response: {response[:200]}...")
    print("✅ Model integration working!")
