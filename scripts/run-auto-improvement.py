#!/usr/bin/env python3
"""
Run the auto-improvement cycle on a specific skill
"""

import sys
import importlib.util
from pathlib import Path

# Define paths
workspace = Path(__file__).parent.parent
skills_path = workspace / "skills"

# Load execution_logger
spec = importlib.util.spec_from_file_location("execution_logger", skills_path / "execution-logger.py")
execution_logger = importlib.util.module_from_spec(spec)
spec.loader.exec_module(execution_logger)
SkillLogger = execution_logger.SkillLogger

# Load version_manager
spec = importlib.util.spec_from_file_location("version_manager", skills_path / "version-manager.py")
version_manager = importlib.util.module_from_spec(spec)
spec.loader.exec_module(version_manager)
SkillVersionManager = version_manager.SkillVersionManager

# Load analyze_skill_performance
spec = importlib.util.spec_from_file_location("analyze_skill_performance", workspace / "scripts" / "analyze-skill-performance.py")
analyze_skill_performance = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analyze_skill_performance)
SkillAnalyzer = analyze_skill_performance.SkillAnalyzer

# Load self_improving_engine
spec = importlib.util.spec_from_file_location("self_improving_engine", skills_path / "self-improving-engine.py")
self_improving_engine = importlib.util.module_from_spec(spec)
spec.loader.exec_module(self_improving_engine)
SelfImprovingEngine = self_improving_engine.SelfImprovingEngine

# Load model_integration
spec = importlib.util.spec_from_file_location("model_integration", skills_path / "model-integration.py")
model_integration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(model_integration)

# Run improvement cycle on self-improving skill
print("🔄 Starting auto-improvement cycle for 'self-improving' skill")
print("=" * 60)

# Create instances
logger = SkillLogger()
version_mgr = SkillVersionManager("self-improving")
analyzer = SkillAnalyzer()

engine = SelfImprovingEngine("self-improving", logger=logger, version_manager=version_mgr, analyzer=analyzer)

# Step 1: Check if improvement needed
print("\n📊 Step 1: Checking if improvement is needed...")
needs_improvement = engine.check_improvement_needed()
print(f"   Improvement needed: {needs_improvement}")

if not needs_improvement:
    print("✅ No improvement needed - failure rate below threshold")
    sys.exit(0)

# Step 2: Analyze failures
print("\n📊 Step 2: Analyzing failures...")
proposal = engine.analyze_failures()
print(f"   Current failure rate: {proposal['current_failure_rate']*100:.1f}%")
print(f"   Failure analysis:")
if 'failure_analysis' in proposal:
    for key, value in proposal['failure_analysis'].items():
        print(f"   - {key}: {value}")

# Step 3: Generate proposed amendment
print("\n💡 Step 3: Generating improvement proposal...")
proposed_content = engine._generate_proposed_content(proposal)
print(f"   Proposed content length: {len(proposed_content)} characters")
print(f"   Content preview:")
print(f"   {proposed_content[:200]}...")

# Step 4: Test the improvement
print("\n🧪 Step 4: Testing improvement...")
test_results = engine.test_improvement(proposed_content)
print(f"   Old success rate: {test_results['old_success_rate']*100:.1f}%")
print(f"   New success rate: {test_results['new_success_rate']*100:.1f}%")
print(f"   Improvement: {test_results['improvement']*100:.1f}%")

# Step 5: Evaluate and apply
print("\n📊 Step 5: Evaluating results...")
if test_results['improvement'] > 0.1:
    print(f"   ✅ Improvement ({test_results['improvement']*100:.1f}%) exceeds threshold (10%)")
    print("   Applying improvement...")
    engine.apply_improvement(
        proposed_content,
        f"Auto-improvement: +{test_results['improvement']*100:.1f}% success rate"
    )
    print("   ✅ Improvement committed!")
else:
    print(f"   ❌ Improvement ({test_results['improvement']*100:.1f}%) below threshold (10%)")
    print("   Rolling back - no changes applied")

print("\n" + "=" * 60)
print("✅ Auto-improvement cycle complete!")
