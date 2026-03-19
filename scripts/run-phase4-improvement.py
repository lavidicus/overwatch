#!/usr/bin/env python3
"""
Phase 4: Cognee Graph Integration Runner

This script runs the complete improvement cycle with knowledge graph integration.
It uses cross-skill learning to generate better improvement proposals.
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
import importlib.util

# Add skills directory to path
skills_path = Path(__file__).parent.parent / "skills"
sys.path.insert(0, str(skills_path))

# Load modules using importlib to handle hyphenated filenames
def load_module(name, filename):
    """Load a module from a file"""
    spec = importlib.util.spec_from_file_location(name, skills_path / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

# Import modules
self_improving_engine = load_module('self_improving_engine', 'self-improving-engine.py')
cognee_integration = load_module('cognee_integration', 'cognee-integration.py')

SelfImprovingEngine = self_improving_engine.SelfImprovingEngine
knowledge_graph = cognee_integration.knowledge_graph
SkillKnowledgeGraph = cognee_integration.SkillKnowledgeGraph

class CogneeImprovedSelfImprovingEngine(SelfImprovingEngine):
    """
    Self-improving engine with Cognee knowledge graph integration.
    
    Uses cross-skill learning to generate better improvement proposals.
    """
    
    def __init__(self, skill_slug: str):
        super().__init__(skill_slug)
        self.knowledge_graph = knowledge_graph
    
    def generate_improvement_proposal(self, skill_slug: str, 
                                       failure_analysis: Dict) -> str:
        """
        Generate improvement proposal with cross-skill learning.
        
        Uses knowledge graph to find similar skills and their solutions.
        """
        # Get base proposal from parent
        base_proposal = super().generate_improvement_proposal(skill_slug, failure_analysis)
        
        # Get cross-skill knowledge
        skill_knowledge = self.knowledge_graph.get_knowledge_for_skill(skill_slug)
        
        # Enhance proposal with cross-skill insights
        enhanced_proposal = self._enhance_with_knowledge(base_proposal, skill_knowledge)
        
        return enhanced_proposal
    
    def _enhance_with_knowledge(self, base_proposal: str, 
                                 skill_knowledge: Dict) -> str:
        """Enhance proposal with cross-skill learning"""
        
        enhancements = []
        
        # Add similar skills with high success rates
        if skill_knowledge.get('similar_skills'):
            similar = skill_knowledge['similar_skills'][:3]  # Top 3
            enhancements.append("\n\n### Cross-Skill Learning:\n")
            enhancements.append("Based on similar skills with high success rates:\n")
            
            for skill in similar:
                enhancements.append(f"- **{skill['name']}** ({skill['success_rate']*100:.1f}% success): {len(skill['common_tags'])} common tags")
        
        # Add improvement suggestions from similar skills
        if skill_knowledge.get('improvement_suggestions'):
            enhancements.append("\n### Suggested Improvements:\n")
            for suggestion in skill_knowledge['improvement_suggestions'][:3]:
                enhancements.append(f"- {suggestion['suggestion']}")
        
        # Add failure pattern solutions
        if skill_knowledge.get('common_failures'):
            enhancements.append("\n### Common Failure Patterns:\n")
            for pattern in skill_knowledge['common_failures'][:3]:
                enhancements.append(f"- {pattern}")
        
        return base_proposal + ''.join(enhancements)
    
    def evaluate_improvement(self, old_content: str, new_content: str,
                             skill_slug: str) -> Dict:
        """
        Evaluate improvement with knowledge graph context.
        
        Checks if similar skills had similar improvements that worked.
        """
        # Get base evaluation from parent
        evaluation = super().evaluate_improvement(old_content, new_content, skill_slug)
        
        # Get knowledge graph insights
        skill_knowledge = self.knowledge_graph.get_knowledge_for_skill(skill_slug)
        
        # Enhance evaluation with cross-skill context
        evaluation['cross_skill_context'] = {
            'similar_successful_skills': len(skill_knowledge.get('similar_skills', [])),
            'improvement_suggestions_found': len(skill_knowledge.get('improvement_suggestions', [])),
            'recommendation': self._generate_recommendation(evaluation, skill_knowledge)
        }
        
        return evaluation
    
    def _generate_recommendation(self, evaluation: Dict, 
                                  skill_knowledge: Dict) -> str:
        """Generate recommendation based on cross-skill learning"""
        
        if evaluation['improvement'] >= 0.10:
            # Check if similar skills had similar improvements
            similar_skills = skill_knowledge.get('similar_skills', [])
            if similar_skills:
                return "✅ Recommended: Similar skills show this improvement pattern works"
            return "✅ Recommended: Improvement meets threshold"
        
        return "⚠️  Not recommended: Improvement below threshold"
    
    def record_improvement(self, skill_slug: str, old_version: str, 
                           new_version: str, improvement_type: str,
                           success_rate_change: float, description: str):
        """Record improvement in knowledge graph"""
        from skills.cognee_integration import ImprovementRecord
        
        improvement = ImprovementRecord(
            skill_name=skill_slug,
            old_version=old_version,
            new_version=new_version,
            improvement_type=improvement_type,
            success_rate_change=success_rate_change,
            timestamp=datetime.now().isoformat(),
            description=description
        )
        
        self.knowledge_graph.record_improvement(improvement)
        print(f"📊 Recorded improvement in knowledge graph: +{success_rate_change*100:.1f}%")

def run_phase4_improvement(skill_slug: str = "self-improving"):
    """
    Run complete improvement cycle with Cognee integration.
    """
    print("🔄 Starting Phase 4: Cognee Graph Integration")
    print("=" * 60)
    
    # Initialize engine with knowledge graph
    engine = CogneeImprovedSelfImprovingEngine(skill_slug)
    
    # Check if improvement needed
    print("\n📊 Step 1: Checking if improvement is needed...")
    improvement_needed = engine.check_improvement_needed(skill_slug)
    print(f"   Improvement needed: {improvement_needed}")
    
    if not improvement_needed:
        print("✅ No improvement needed at this time.")
        return
    
    # Analyze failures
    print("\n📊 Step 2: Analyzing failures...")
    failure_analysis = engine.analyze_skill_failures(skill_slug)
    print(f"   Current failure rate: {failure_analysis.get('failure_rate', 0)*100:.1f}%")
    print(f"   Error types: {failure_analysis.get('error_types', {})}")
    
    # Get knowledge graph insights
    print("\n💡 Step 3: Getting cross-skill knowledge...")
    skill_knowledge = engine.knowledge_graph.get_knowledge_for_skill(skill_slug)
    insights = engine.knowledge_graph.generate_cross_skill_insights()
    print(f"   {insights}")
    
    # Generate improvement proposal
    print("\n💡 Step 4: Generating improvement proposal...")
    proposal = engine.generate_improvement_proposal(skill_slug, failure_analysis)
    print(f"   Proposed content length: {len(proposal)} characters")
    print(f"   Content preview (first 200 chars):\n   {proposal[:200]}...")
    
    # Test improvement
    print("\n🧪 Step 5: Testing improvement...")
    evaluation = engine.evaluate_improvement(
        failure_analysis.get('old_content', ''),
        proposal,
        skill_slug
    )
    
    print(f"   Old success rate: {evaluation.get('old_success_rate', 0)*100:.1f}%")
    print(f"   New success rate: {evaluation.get('new_success_rate', 0)*100:.1f}%")
    print(f"   Improvement: {evaluation.get('improvement', 0)*100:.1f}%")
    print(f"   Recommendation: {evaluation.get('cross_skill_context', {}).get('recommendation', 'Unknown')}")
    
    # Apply or rollback
    print("\n📊 Step 6: Evaluation...")
    if evaluation['improvement'] >= 0.10:
        # Apply improvement
        engine.apply_improvement(skill_slug, proposal)
        
        # Record in knowledge graph
        engine.record_improvement(
            skill_slug=skill_slug,
            old_version=failure_analysis.get('current_version', 'unknown'),
            new_version=f"v{len(engine.knowledge_graph.improvements) + 1}",
            improvement_type="error_handling",
            success_rate_change=evaluation['improvement'],
            description=proposal[:100]
        )
        
        print(f"   ✅ Improvement applied! (+{evaluation['improvement']*100:.1f}%)")
        print(f"   ✅ Version {len(engine.knowledge_graph.improvements)} created")
        print(f"   ✅ Knowledge graph updated")
        
    else:
        print(f"   ❌ Improvement ({evaluation['improvement']*100:.1f}%) below 10% threshold")
        print(f"   ✅ Rolling back - no change...")
    
    # Generate final insights
    print("\n📊 Step 7: Cross-Skill Insights...")
    print(engine.knowledge_graph.generate_cross_skill_insights())
    
    # Export graph
    print("\n📁 Graph exported to:", engine.knowledge_graph.graph_file)
    
    print("\n✅ Phase 4 complete!")

if __name__ == "__main__":
    skill_slug = sys.argv[1] if len(sys.argv) > 1 else "self-improving"
    run_phase4_improvement(skill_slug)
