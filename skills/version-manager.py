#!/usr/bin/env python3
"""
Skill Version Manager - Phase 3: Auto-Amendment System

Manages skill versions with:
- Git-style version tracking
- Automatic amendment proposals
- A/B testing framework
- Rollback mechanism
"""

import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List
import hashlib
import shutil

# Configuration
VERSION_DIR = Path(__file__).parent / "versioned"
VERSION_DIR.mkdir(parents=True, exist_ok=True)

class SkillVersionManager:
    """Manage skill versions and amendments"""
    
    def __init__(self, skill_name: str):
        self.skill_name = skill_name
        self.skill_dir = VERSION_DIR / skill_name
        self.skill_dir.mkdir(parents=True, exist_ok=True)
        self.versions_file = self.skill_dir / "versions.json"
    
    def load_versions(self) -> List[Dict]:
        """Load version history"""
        if not self.versions_file.exists():
            return []
        
        with open(self.versions_file, 'r') as f:
            return json.load(f)
    
    def save_versions(self, versions: List[Dict]):
        """Save version history"""
        with open(self.versions_file, 'w') as f:
            json.dump(versions, f, indent=2)
    
    def create_version(self, content: str, commit_message: str, author: str = "system"):
        """Create a new version of the skill"""
        versions = self.load_versions()
        
        version_num = len(versions) + 1
        version_id = hashlib.md5(f"{self.skill_name}-{datetime.now().isoformat()}".encode()).hexdigest()[:8]
        
        version = {
            'version': version_num,
            'version_id': version_id,
            'timestamp': datetime.now().isoformat(),
            'commit_message': commit_message,
            'author': author,
            'content': content,
            'status': 'active',
            'test_results': {}
        }
        
        # Save content
        content_file = self.skill_dir / f"v{version_num}.md"
        with open(content_file, 'w') as f:
            f.write(content)
        
        # Update version history
        versions.append(version)
        self.save_versions(versions)
        
        # Set as active
        self.set_active_version(version_num)
        
        return version_id
    
    def set_active_version(self, version_num: int):
        """Set a version as active"""
        versions = self.load_versions()
        for v in versions:
            v['status'] = 'inactive'
        
        for v in versions:
            if v['version'] == version_num:
                v['status'] = 'active'
                break
        
        self.save_versions(versions)
        
        # Create symlink to active version
        active_link = self.skill_dir / "SKILL.md"
        if active_link.exists():
            active_link.unlink()
        
        content_file = self.skill_dir / f"v{version_num}.md"
        active_link.symlink_to(content_file)
    
    def get_active_version(self) -> Optional[Dict]:
        """Get the active version"""
        versions = self.load_versions()
        for v in versions:
            if v['status'] == 'active':
                return v
        return None
    
    def propose_amendment(self, current_content: str, failure_data: List[Dict], 
                         improvement_goal: str) -> Dict:
        """
        Propose an amendment to the skill based on failure data
        
        This would integrate with a model to generate the amendment proposal
        For now, returns structured data for manual review
        """
        # Analyze failures
        error_patterns = self._analyze_failures(failure_data)
        
        proposal = {
            'timestamp': datetime.now().isoformat(),
            'current_version': self.get_active_version()['version'] if self.get_active_version() else None,
            'failure_analysis': error_patterns,
            'improvement_goal': improvement_goal,
            'proposed_changes': [],
            'confidence': 0.0,
            'requires_review': True
        }
        
        return proposal
    
    def _analyze_failures(self, failures: List[Dict]) -> Dict:
        """Analyze failure patterns"""
        error_types = {}
        skills_affected = set()
        
        for failure in failures:
            error = failure.get('error_message', 'Unknown')
            skill = failure.get('skill_name', 'unknown')
            
            # Categorize error
            if 'tool' in error.lower():
                error_types['tool_errors'] = error_types.get('tool_errors', 0) + 1
            elif 'timeout' in error.lower():
                error_types['timeout_errors'] = error_types.get('timeout_errors', 0) + 1
            else:
                error_types['other_errors'] = error_types.get('other_errors', 0) + 1
            
            skills_affected.add(skill)
        
        return {
            'error_types': error_types,
            'skills_affected': list(skills_affected),
            'total_failures': len(failures)
        }
    
    def test_amendment(self, old_content: str, new_content: str, 
                      test_cases: List[Dict]) -> Dict:
        """
        A/B test an amendment against test cases
        
        Returns comparison results
        """
        results = {
            'timestamp': datetime.now().isoformat(),
            'old_version': self._hash_content(old_content),
            'new_version': self._hash_content(new_content),
            'test_cases': len(test_cases),
            'old_success_rate': 0.0,
            'new_success_rate': 0.0,
            'improvement': 0.0,
            'details': []
        }
        
        # Simulate testing (in reality, this would run actual tasks)
        old_successes = 0
        new_successes = 0
        
        for test_case in test_cases:
            # Simulate old version result
            old_success = self._simulate_version_performance(old_content, test_case)
            if old_success:
                old_successes += 1
            
            # Simulate new version result
            new_success = self._simulate_version_performance(new_content, test_case)
            if new_success:
                new_successes += 1
        
        results['old_success_rate'] = old_successes / len(test_cases) if test_cases else 0
        results['new_success_rate'] = new_successes / len(test_cases) if test_cases else 0
        results['improvement'] = results['new_success_rate'] - results['old_success_rate']
        
        return results
    
    def _simulate_version_performance(self, content: str, test_case: Dict) -> bool:
        """Simulate version performance (placeholder)"""
        # In reality, this would execute the skill with the test case
        # For now, return random result for demonstration
        import random
        return random.random() > 0.3  # 70% success rate
    
    def _hash_content(self, content: str) -> str:
        """Hash content for version identification"""
        return hashlib.md5(content.encode()).hexdigest()[:8]
    
    def rollback(self, target_version: int):
        """Rollback to a specific version"""
        versions = self.load_versions()
        
        # Find target version
        target = None
        for v in versions:
            if v['version'] == target_version:
                target = v
                break
        
        if not target:
            raise ValueError(f"Version {target_version} not found")
        
        # Set as active
        self.set_active_version(target_version)
        
        # Log rollback
        print(f"Rolled back to version {target_version}")
        return target

def create_skill_version(skill_name: str, content: str, message: str = "Initial version"):
    """Convenience function to create a skill version"""
    manager = SkillVersionManager(skill_name)
    return manager.create_version(content, message)

if __name__ == "__main__":
    # Test the version manager
    test_skill = "test-skill"
    content = "# Test Skill\n\nThis is a test skill for versioning."
    
    manager = SkillVersionManager(test_skill)
    version_id = manager.create_version(content, "Initial version", "system")
    print(f"Created version: {version_id}")
    
    active = manager.get_active_version()
    print(f"Active version: {active['version']}")
