#!/usr/bin/env python3
"""
Self-Improving Skills Engine - Complete Implementation

Orchestrates the full self-improvement loop:
1. Observe → Log every execution
2. Inspect → Analyze failures and patterns
3. Amend → Propose and test amendments
4. Evaluate → Validate improvements
5. Update → Commit verified changes
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import statistics

# Check if running as script (not imported)
if __name__ == "__main__":
    # Add parent directory to path for imports
    sys.path.insert(0, str(Path(__file__).parent))
    
    from execution_logger import SkillLogger, log_skill_invocation
    from version_manager import SkillVersionManager
    from analyze_skill_performance import SkillAnalyzer
else:
    # When imported, use global instances or pass them in
    SkillLogger = None
    log_skill_invocation = None
    SkillVersionManager = None
    SkillAnalyzer = None

class SelfImprovingEngine:
    """Main engine for self-improving skills system"""
    
    def __init__(self, skill_name: str, logger=None, version_manager=None, analyzer=None):
        self.skill_name = skill_name
        
        # Use passed instances or create new ones
        if logger is None:
            from execution_logger import SkillLogger
            self.logger = SkillLogger()
        else:
            self.logger = logger
            
        if version_manager is None:
            from version_manager import SkillVersionManager
            self.version_manager = SkillVersionManager(skill_name)
        else:
            self.version_manager = version_manager
            
        if analyzer is None:
            from analyze_skill_performance import SkillAnalyzer
            self.analyzer = SkillAnalyzer()
        else:
            self.analyzer = analyzer
        
        # Configuration
        self.failure_threshold = 0.3  # 30% failure rate triggers improvement
        self.min_samples = 5  # Minimum executions before improvement
        self.improvement_confidence = 0.7  # Minimum confidence to auto-apply
        
        # Load current skill content
        self.current_content = self._load_current_skill()
    
    def _load_current_skill(self) -> str:
        """Load current skill content"""
        skill_file = Path(__file__).parent / self.skill_name / "SKILL.md"
        
        # Check if symlink exists
        if skill_file.is_symlink():
            skill_file = Path(skill_file.readlink())
        
        if skill_file.exists():
            with open(skill_file, 'r') as f:
                return f.read()
        
        return "# No skill content found"
    
    def record_execution(self, success: bool, error_message: Optional[str] = None,
                        tokens_used: int = 0, duration_ms: int = 0,
                        tool_calls: Optional[List] = None, output_summary: str = ""):
        """Record a skill execution"""
        log_skill_invocation(
            skill_name=self.skill_name,
            task_description="skill_execution",  # Would be more specific in real usage
            trigger_context="automatic",
            success=success,
            error_message=error_message,
            tool_calls=tool_calls or [],
            output_summary=output_summary,
            tokens_used=tokens_used,
            duration_ms=duration_ms
        )
    
    def check_improvement_needed(self) -> bool:
        """Check if skill needs improvement based on recent performance"""
        executions = self.analyzer.load_executions(days=7)
        skill_executions = [e for e in executions if e.get('skill_name') == self.skill_name]
        
        if len(skill_executions) < self.min_samples:
            return False
        
        # Calculate failure rate
        failed = sum(1 for e in skill_executions if not e.get('success'))
        failure_rate = failed / len(skill_executions)
        
        return failure_rate > self.failure_threshold
    
    def analyze_failures(self) -> Dict:
        """Analyze recent failures and generate improvement proposal"""
        executions = self.analyzer.load_executions(days=7)
        skill_executions = [e for e in executions if e.get('skill_name') == self.skill_name]
        failures = [e for e in skill_executions if not e.get('success')]
        
        if not failures:
            return {'needs_improvement': False}
        
        # Generate improvement proposal
        proposal = self.version_manager.propose_amendment(
            self.current_content,
            failures,
            f"Reduce failure rate from {self._calculate_current_failure_rate():.1f}% to <{self.failure_threshold*100:.0f}%"
        )
        
        proposal['needs_improvement'] = True
        proposal['current_failure_rate'] = self._calculate_current_failure_rate()
        
        return proposal
    
    def _calculate_current_failure_rate(self) -> float:
        """Calculate current failure rate"""
        executions = self.analyzer.load_executions(days=7)
        skill_executions = [e for e in executions if e.get('skill_name') == self.skill_name]
        
        if not skill_executions:
            return 0.0
        
        failed = sum(1 for e in skill_executions if not e.get('success'))
        return failed / len(skill_executions)
    
    def test_improvement(self, proposed_content: str) -> Dict:
        """Test the proposed improvement"""
        test_results = self.version_manager.test_amendment(
            self.current_content,
            proposed_content,
            test_cases=[{"id": 1}, {"id": 2}, {"id": 3}]  # Placeholder test cases
        )
        
        test_results['proposed_content_hash'] = self.version_manager._hash_content(proposed_content)
        test_results['current_content_hash'] = self.version_manager._hash_content(self.current_content)
        
        return test_results
    
    def apply_improvement(self, new_content: str, commit_message: str):
        """Apply an improvement to the skill"""
        self.version_manager.create_version(
            new_content,
            commit_message,
            author="auto-improvement"
        )
        
        self.current_content = new_content
        print(f"✅ Applied improvement: {commit_message}")
    
    def run_improvement_cycle(self):
        """Run the complete improvement cycle"""
        print(f"🔄 Starting improvement cycle for {self.skill_name}")
        
        # Step 1: Check if improvement needed
        if not self.check_improvement_needed():
            print(f"✅ No improvement needed (failure rate below threshold)")
            return
        
        # Step 2: Analyze failures
        print("📊 Analyzing failures...")
        proposal = self.analyze_failures()
        
        if not proposal.get('needs_improvement'):
            print("✅ No improvement needed")
            return
        
        print(f"🚨 Failure rate: {proposal['current_failure_rate']*100:.1f}%")
        print("💡 Generating improvement proposal...")
        
        # Step 3: Generate proposed content (placeholder)
        # In reality, this would call a model to generate the amendment
        proposed_content = self._generate_proposed_content(proposal)
        
        # Step 4: Test the improvement
        print("🧪 Testing improvement...")
        test_results = self.test_improvement(proposed_content)
        
        print(f"📈 Improvement: {test_results['improvement']*100:.1f}%")
        
        # Step 5: Evaluate and apply
        if test_results['improvement'] > 0.1:  # At least 10% improvement
            print("✅ Improvement validated, applying...")
            self.apply_improvement(
                proposed_content,
                f"Auto-improvement: +{test_results['improvement']*100:.1f}% success rate"
            )
        else:
            print("❌ Improvement not significant enough, rolling back")
    
    def _generate_proposed_content(self, proposal: Dict) -> str:
        """Generate proposed content based on analysis using model integration"""
        try:
            # Try to use model integration
            from model_integration import ModelIntegrator
            
            integrator = ModelIntegrator()
            
            failure_analysis = proposal.get('failure_analysis', {})
            improvement_goal = proposal.get('improvement_goal', 'Reduce failures')
            
            # Generate actual improvement using model
            proposed_content = integrator.generate_improvement_proposal(
                self.current_content,
                failure_analysis,
                improvement_goal
            )
            
            # If model call failed or returned error, fall back to comment-based approach
            if "[ERROR]" in proposed_content or "[TIMEOUT]" in proposed_content:
                print(f"   ⚠️ Model call failed: {proposed_content[:100]}")
                print("   Falling back to comment-based improvement")
                proposed_content = self._generate_comment_based_improvement(proposal)
            
            return proposed_content
        
        except ImportError:
            # Model integration not available, use fallback
            print("   ⚠️ Model integration not available")
            print("   Using comment-based improvement")
            return self._generate_comment_based_improvement(proposal)
        except Exception as e:
            # Any other error, use fallback
            print(f"   ⚠️ Model integration error: {e}")
            print("   Using comment-based improvement")
            return self._generate_comment_based_improvement(proposal)
    
    def _generate_comment_based_improvement(self, proposal: Dict) -> str:
        """Fallback: add improvement notes as comments"""
        return f"""{self.current_content}

# Auto-Improvement Notes ({datetime.now().strftime('%Y-%m-%d')})
## Analysis
{json.dumps(proposal.get('failure_analysis', {}), indent=2)}

## Improvement Goal
{proposal.get('improvement_goal', 'Reduce failures')}

## Status
Pending model-generated amendment (fallback mode)

## Recommended Actions
- Review failure patterns above
- Manually update trigger conditions if needed
- Add error handling for identified issues
- Test changes before committing
"""

# Convenience function
def improve_skill(skill_name: str):
    """Convenience function to improve a specific skill"""
    engine = SelfImprovingEngine(skill_name)
    engine.run_improvement_cycle()

if __name__ == "__main__":
    print("Self-Improving Skills Engine initialized")
    
    # Demo with test skill
    # improve_skill("test-skill")
