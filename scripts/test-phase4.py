#!/usr/bin/env python3
"""
Phase 4: Cognee Graph Integration - Standalone Test

This script tests the knowledge graph without relying on the full engine.
"""

import sys
from pathlib import Path
from datetime import datetime

# Add skills directory to path
skills_path = Path(__file__).parent.parent / "skills"
sys.path.insert(0, str(skills_path))

# Load modules using importlib
import importlib.util

def load_module(name, filename):
    """Load a module from a file"""
    spec = importlib.util.spec_from_file_location(name, skills_path / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

# Import modules
cognee_integration = load_module('cognee_integration', 'cognee-integration.py')

knowledge_graph = cognee_integration.knowledge_graph
SkillKnowledgeGraph = cognee_integration.SkillKnowledgeGraph
SkillNode = cognee_integration.SkillNode
FailurePattern = cognee_integration.FailurePattern
ImprovementRecord = cognee_integration.ImprovementRecord

def run_phase4_test():
    """Test Phase 4: Cognee Graph Integration"""
    print("🔄 Testing Phase 4: Cognee Graph Integration")
    print("=" * 60)
    
    # Add test skill
    print("\n📊 Step 1: Adding test skills...")
    skill1 = SkillNode(
        name="self-improving",
        slug="self-improving",
        version="1.2.16",
        location="skills/self-improving/SKILL.md",
        success_rate=0.667,
        failure_count=3,
        improvement_count=1,
        tags={"self-improvement", "automation", "learning"}
    )
    knowledge_graph.add_skill(skill1)
    print(f"   ✅ Added: {skill1.name} (success rate: {skill1.success_rate*100:.1f}%)")
    
    # Add another similar skill
    skill2 = SkillNode(
        name="weather",
        slug="weather",
        version="1.0.0",
        location="skills/weather/SKILL.md",
        success_rate=0.85,
        failure_count=1,
        improvement_count=2,
        tags={"automation", "learning", "external-api"}
    )
    knowledge_graph.add_skill(skill2)
    print(f"   ✅ Added: {skill2.name} (success rate: {skill2.success_rate*100:.1f}%)")
    
    # Add failure patterns
    print("\n📊 Step 2: Adding failure patterns...")
    pattern1 = FailurePattern(
        pattern_type="context_error",
        description="Context window exceeded limit",
        affected_skills={"self-improving"},
        frequency=1
    )
    knowledge_graph.add_failure_pattern(pattern1)
    print(f"   ✅ Added: {pattern1.pattern_type}")
    
    pattern2 = FailurePattern(
        pattern_type="api_timeout",
        description="External API timeout",
        affected_skills={"weather", "self-improving"},
        frequency=2
    )
    knowledge_graph.add_failure_pattern(pattern2)
    print(f"   ✅ Added: {pattern2.pattern_type}")
    
    # Record improvements
    print("\n📊 Step 3: Recording improvements...")
    improvement1 = ImprovementRecord(
        skill_name="self-improving",
        old_version="1.2.15",
        new_version="1.2.16",
        improvement_type="error_handling",
        success_rate_change=0.333,
        timestamp=datetime.now().isoformat(),
        description="Added auto-improvement notes to SKILL.md"
    )
    knowledge_graph.record_improvement(improvement1)
    print(f"   ✅ Recorded: {improvement1.skill_name} (+{improvement1.success_rate_change*100:.1f}%)")
    
    improvement2 = ImprovementRecord(
        skill_name="weather",
        old_version="0.9.0",
        new_version="1.0.0",
        improvement_type="timeout_handling",
        success_rate_change=0.15,
        timestamp=datetime.now().isoformat(),
        description="Added retry logic for API timeouts"
    )
    knowledge_graph.record_improvement(improvement2)
    print(f"   ✅ Recorded: {improvement2.skill_name} (+{improvement2.success_rate_change*100:.1f}%)")
    
    # Get cross-skill knowledge
    print("\n💡 Step 4: Getting cross-skill knowledge...")
    skill_knowledge = knowledge_graph.get_knowledge_for_skill("self-improving")
    print(f"   Similar skills: {len(skill_knowledge.get('similar_skills', []))}")
    for similar in skill_knowledge.get('similar_skills', []):
        print(f"     - {similar['name']} ({similar['success_rate']*100:.1f}% success, {len(similar['common_tags'])} common tags)")
    
    # Generate insights
    print("\n📊 Step 5: Generating cross-skill insights...")
    insights = knowledge_graph.generate_cross_skill_insights()
    print(f"   {insights}")
    
    # Export graph
    print("\n📁 Step 6: Exporting graph...")
    graph_data = knowledge_graph.export_graph()
    print(f"   Total skills: {graph_data['summary']['total_skills']}")
    print(f"   Total failures: {graph_data['summary']['total_failures']}")
    print(f"   Total improvements: {graph_data['summary']['total_improvements']}")
    print(f"   Avg success rate: {graph_data['summary']['avg_success_rate']*100:.1f}%")
    
    # Save graph
    knowledge_graph._save_graph()
    print(f"   ✅ Graph saved to: {knowledge_graph.graph_file}")
    
    print("\n✅ Phase 4 test complete!")

if __name__ == "__main__":
    run_phase4_test()
