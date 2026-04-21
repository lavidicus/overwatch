#!/usr/bin/env python3
"""
Phase 4: Cognee Graph Integration for Self-Improving Skills

This module integrates with Cognee (https://github.com/topoteretes/cognee)
to create a knowledge graph of skills, failures, and improvements.

Features:
- Track skill relationships and dependencies
- Map failure patterns across skills
- Store improvement knowledge for reuse
- Enable cross-skill learning
"""

import json
import time
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, field

# Try to import cognee, fall back to local implementation
try:
    from cognee import Agent
    from cognee.modules.search.vector_search import VectorSearch
    COGNEE_AVAILABLE = True
except ImportError:
    COGNEE_AVAILABLE = False
    print("⚠️  Cognee not installed. Using local graph implementation.")

# Configuration
WORKSPACE = Path("/home/localadmin/.openclaw/workspace")
GRAPH_FILE = WORKSPACE / "skills" / "cognee" / "skills_graph.json"
KNOWLEDGE_BASE = WORKSPACE / "skills" / "cognee" / "knowledge.json"

@dataclass
class SkillNode:
    """Represents a skill in the knowledge graph"""
    name: str
    slug: str
    version: str
    location: str
    success_rate: float = 0.0
    failure_count: int = 0
    improvement_count: int = 0
    last_improved: Optional[str] = None
    dependencies: Set[str] = field(default_factory=set)
    tags: Set[str] = field(default_factory=set)

@dataclass
class FailurePattern:
    """Represents a failure pattern"""
    pattern_type: str  # auth_error, context_error, tool_error, etc.
    description: str
    affected_skills: Set[str]
    frequency: int = 0
    solution: Optional[str] = None

@dataclass
class ImprovementRecord:
    """Records an improvement made to a skill"""
    skill_name: str
    old_version: str
    new_version: str
    improvement_type: str  # error_handling, trigger_optimization, etc.
    success_rate_change: float
    timestamp: str
    description: str
    validated: bool = True

class SkillKnowledgeGraph:
    """
    Knowledge graph for skill relationships and improvements.
    
    If Cognee is available, uses it for vector search and relationships.
    Otherwise, uses local JSON-based graph.
    """
    
    def __init__(self):
        self.graph_file = GRAPH_FILE
        self.knowledge_file = KNOWLEDGE_BASE
        self.skills: Dict[str, SkillNode] = {}
        self.failure_patterns: Dict[str, FailurePattern] = {}
        self.improvements: List[ImprovementRecord] = []
        
        # Ensure directories exist
        self.graph_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize graph from disk
        self._load_graph()
        
        # Cognee integration (if available)
        self.cognee_agent = None
        if COGNEE_AVAILABLE:
            self._init_cognee()
    
    def _init_cognee(self):
        """Initialize Cognee agent for vector search"""
        try:
            self.cognee_agent = Agent()
            # Setup vector search for skill embeddings
            self.cognee_agent.add_search_engine(VectorSearch())
            print("✅ Cognee initialized for skill knowledge graph")
        except Exception as e:
            print(f"⚠️  Cognee initialization failed: {e}")
    
    def _load_graph(self):
        """Load graph from disk"""
        if self.graph_file.exists():
            with open(self.graph_file, 'r') as f:
                data = json.load(f)
                self.skills = {k: SkillNode(**v) for k, v in data.get('skills', {}).items()}
                self.failure_patterns = {k: FailurePattern(**v) for k, v in data.get('failure_patterns', {}).items()}
                self.improvements = [ImprovementRecord(**i) for i in data.get('improvements', [])]
    
    def _save_graph(self):
        """Save graph to disk"""
        data = {
            'skills': {k: {
                'name': v.name, 'slug': v.slug, 'version': v.version,
                'location': v.location, 'success_rate': v.success_rate,
                'failure_count': v.failure_count, 'improvement_count': v.improvement_count,
                'last_improved': v.last_improved, 'dependencies': list(v.dependencies),
                'tags': list(v.tags)
            } for k, v in self.skills.items()},
            'failure_patterns': {k: {
                'pattern_type': v.pattern_type, 'description': v.description,
                'affected_skills': list(v.affected_skills), 'frequency': v.frequency,
                'solution': v.solution
            } for k, v in self.failure_patterns.items()},
            'improvements': [{
                'skill_name': i.skill_name, 'old_version': i.old_version,
                'new_version': i.new_version, 'improvement_type': i.improvement_type,
                'success_rate_change': i.success_rate_change, 'timestamp': i.timestamp,
                'description': i.description, 'validated': i.validated
            } for i in self.improvements]
        }
        
        with open(self.graph_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        # Also save knowledge base
        self._save_knowledge_base()
    
    def _save_knowledge_base(self):
        """Save knowledge base for cross-skill learning"""
        knowledge = {
            'failure_solutions': {},
            'improvement_patterns': [],
            'skill_relationships': []
        }
        
        # Map failure patterns to solutions
        for pattern in self.failure_patterns.values():
            if pattern.solution:
                knowledge['failure_solutions'][pattern.pattern_type] = pattern.solution
        
        # Record improvement patterns
        for improvement in self.improvements:
            knowledge['improvement_patterns'].append({
                'skill': improvement.skill_name,
                'type': improvement.improvement_type,
                'impact': improvement.success_rate_change
            })
        
        # Record skill relationships
        for skill in self.skills.values():
            for dep in skill.dependencies:
                knowledge['skill_relationships'].append({
                    'skill': skill.name,
                    'dependency': dep,
                    'type': 'requires'
                })
        
        with open(self.knowledge_file, 'w') as f:
            json.dump(knowledge, f, indent=2)
    
    def add_skill(self, skill: SkillNode):
        """Add a skill to the graph"""
        self.skills[skill.slug] = skill
        self._save_graph()
    
    def update_skill_metrics(self, skill_slug: str, success_rate: float, 
                             failure_count: int, improvement_count: int):
        """Update skill metrics in the graph"""
        if skill_slug in self.skills:
            skill = self.skills[skill_slug]
            skill.success_rate = success_rate
            skill.failure_count = failure_count
            skill.improvement_count = improvement_count
            self._save_graph()
    
    def record_improvement(self, improvement: ImprovementRecord):
        """Record an improvement in the graph"""
        self.improvements.append(improvement)
        
        # Update skill improvement count
        if improvement.skill_name in self.skills:
            self.skills[improvement.skill_name].improvement_count += 1
            self.skills[improvement.skill_name].last_improved = improvement.timestamp
        
        self._save_graph()
    
    def add_failure_pattern(self, pattern: FailurePattern):
        """Add a failure pattern to the graph"""
        self.failure_patterns[pattern.pattern_type] = pattern
        self._save_graph()
    
    def set_solution_for_pattern(self, pattern_type: str, solution: str):
        """Set a solution for a failure pattern"""
        if pattern_type in self.failure_patterns:
            self.failure_patterns[pattern_type].solution = solution
            self.failure_patterns[pattern_type].frequency += 1
            self._save_graph()
    
    def add_dependency(self, skill_slug: str, dependency: str):
        """Add a dependency relationship between skills"""
        if skill_slug in self.skills:
            self.skills[skill_slug].dependencies.add(dependency)
            self._save_graph()
    
    def add_tag(self, skill_slug: str, tag: str):
        """Add a tag to a skill"""
        if skill_slug in self.skills:
            self.skills[skill_slug].tags.add(tag)
            self._save_graph()
    
    def find_similar_failures(self, failure_type: str, limit: int = 5) -> List[str]:
        """Find skills with similar failure patterns"""
        affected = []
        
        for pattern in self.failure_patterns.values():
            if failure_type in pattern.pattern_type.lower():
                affected.extend(pattern.affected_skills)
        
        # Deduplicate and limit
        return list(set(affected))[:limit]
    
    def get_skill_relationships(self, skill_slug: str) -> List[Dict]:
        """Get all relationships for a skill"""
        relationships = []
        
        if skill_slug in self.skills:
            skill = self.skills[skill_slug]
            
            # Dependencies
            for dep in skill.dependencies:
                relationships.append({
                    'type': 'dependency',
                    'target': dep,
                    'skill': skill.name
                })
            
            # Similar skills (same tags)
            for other_slug, other in self.skills.items():
                if other_slug != skill_slug:
                    common_tags = skill.tags & other.tags
                    if common_tags:
                        relationships.append({
                            'type': 'similar',
                            'target': other.name,
                            'common_tags': list(common_tags)
                        })
        
        return relationships
    
    def get_knowledge_for_skill(self, skill_slug: str) -> Dict:
        """Get relevant knowledge for a skill (cross-skill learning)"""
        knowledge = {
            'similar_skills': [],
            'common_failures': [],
            'improvement_suggestions': []
        }
        
        if skill_slug not in self.skills:
            return knowledge
        
        skill = self.skills[skill_slug]
        
        # Find similar skills (same tags)
        for other_slug, other in self.skills.items():
            if other_slug != skill_slug:
                common_tags = skill.tags & other.tags
                if common_tags and len(common_tags) >= 2:
                    knowledge['similar_skills'].append({
                        'slug': other_slug,
                        'name': other.name,
                        'success_rate': other.success_rate,
                        'common_tags': list(common_tags)
                    })
        
        # Find common failure patterns
        for pattern_type, pattern in self.failure_patterns.items():
            if skill_slug in pattern.affected_skills:
                # Check if other similar skills have solutions
                for other_slug in pattern.affected_skills:
                    if other_slug != skill_slug and other_slug in self.skills:
                        other = self.skills[other_slug]
                        if other.improvement_count > 0:
                            knowledge['improvement_suggestions'].append({
                                'from_skill': other.name,
                                'pattern': pattern_type,
                                'suggestion': f"Try {other.improvement_count} improvements that worked for {other.name}"
                            })
        
        return knowledge
    
    def generate_cross_skill_insights(self) -> str:
        """Generate insights based on cross-skill patterns"""
        insights = []
        
        # Find skills with high failure rates that share patterns
        high_failure_skills = [
            s for s in self.skills.values() 
            if s.success_rate < 0.5 and s.failure_count > 3
        ]
        
        if len(high_failure_skills) >= 2:
            # Check for common patterns
            common_patterns = set()
            for skill in high_failure_skills:
                skill_slug = skill.slug
                for pattern in self.failure_patterns.values():
                    if skill_slug in pattern.affected_skills:
                        common_patterns.add(pattern.pattern_type)
            
            if common_patterns:
                insights.append(f"⚠️  {len(high_failure_skills)} skills share failure patterns: {', '.join(common_patterns)}")
        
        # Find successful patterns that could be reused
        successful_skills = [
            s for s in self.skills.values()
            if s.success_rate >= 0.8 and s.improvement_count > 0
        ]
        
        if successful_skills:
            insights.append(f"💡 {len(successful_skills)} skills have >80% success rate with improvements")
        
        return '\n'.join(insights) if insights else "No cross-skill insights available."
    
    def export_graph(self) -> Dict:
        """Export complete graph as dictionary"""
        return {
            'skills': {k: vars(v) for k, v in self.skills.items()},
            'failure_patterns': {k: vars(v) for k, v in self.failure_patterns.items()},
            'improvements': [vars(i) for i in self.improvements],
            'summary': {
                'total_skills': len(self.skills),
                'total_failures': sum(s.failure_count for s in self.skills.values()),
                'total_improvements': len(self.improvements),
                'avg_success_rate': sum(s.success_rate for s in self.skills.values()) / max(len(self.skills), 1)
            }
        }

# Global graph instance
knowledge_graph = SkillKnowledgeGraph()

if __name__ == "__main__":
    # Test the knowledge graph
    print("🧪 Testing Skill Knowledge Graph...")
    
    # Add a test skill
    test_skill = SkillNode(
        name="self-improving",
        slug="self-improving",
        version="1.2.16",
        location="skills/self-improving/SKILL.md",
        success_rate=0.667,
        failure_count=3,
        improvement_count=1,
        tags={"self-improvement", "automation", "learning"}
    )
    
    knowledge_graph.add_skill(test_skill)
    print(f"✅ Added skill: {test_skill.name}")
    
    # Add a failure pattern
    test_pattern = FailurePattern(
        pattern_type="context_error",
        description="Context window exceeded limit",
        affected_skills={"self-improving"},
        frequency=1
    )
    
    knowledge_graph.add_failure_pattern(test_pattern)
    print(f"✅ Added failure pattern: {test_pattern.pattern_type}")
    
    # Record an improvement
    test_improvement = ImprovementRecord(
        skill_name="self-improving",
        old_version="1.2.15",
        new_version="1.2.16",
        improvement_type="error_handling",
        success_rate_change=0.333,
        timestamp=datetime.now().isoformat(),
        description="Added auto-improvement notes to SKILL.md"
    )
    
    knowledge_graph.record_improvement(test_improvement)
    print(f"✅ Recorded improvement: +{test_improvement.success_rate_change*100:.1f}%")
    
    # Generate insights
    print("\n📊 Cross-Skill Insights:")
    print(knowledge_graph.generate_cross_skill_insights())
    
    # Export graph
    print("\n📁 Graph exported to:", knowledge_graph.graph_file)
    print(f"✅ Knowledge graph initialized with {len(knowledge_graph.skills)} skills")
