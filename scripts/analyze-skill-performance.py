#!/usr/bin/env python3
"""
Skill Performance Analyzer - Phase 2: Pattern Detection

Analyzes execution logs to identify:
- Skills with high failure rates
- Recurring error patterns
- Tool call failures correlated with specific skills
- Weekly performance trends
"""

import json
import os
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict
import statistics

# Configuration
LOG_FILE = Path(__file__).parent.parent / "skills" / "execution-logs" / "skills-executions.jsonl"
REPORT_DIR = Path(__file__).parent.parent / "reports"
REPORT_DIR.mkdir(parents=True, exist_ok=True)

class SkillAnalyzer:
    """Analyze skill execution patterns and generate reports"""
    
    def __init__(self, log_file: Path = LOG_FILE):
        self.log_file = log_file
    
    def load_executions(self, days: int = 7):
        """Load executions from the last N days"""
        executions = []
        cutoff = datetime.now() - timedelta(days=days)
        
        if not self.log_file.exists():
            return executions
        
        with open(self.log_file, 'r') as f:
            for line in f:
                try:
                    data = json.loads(line.strip())
                    exec_time = datetime.fromisoformat(data['timestamp'])
                    if exec_time >= cutoff:
                        executions.append(data)
                except json.JSONDecodeError:
                    continue
        
        return executions
    
    def analyze_failure_patterns(self, executions: list):
        """Identify recurring failure patterns"""
        patterns = defaultdict(list)
        
        for exec_data in executions:
            if not exec_data.get('success'):
                error = exec_data.get('error_message', 'Unknown error')
                
                # Categorize errors
                if 'tool' in error.lower() or 'api' in error.lower():
                    patterns['tool_errors'].append(exec_data)
                elif 'timeout' in error.lower():
                    patterns['timeout_errors'].append(exec_data)
                elif 'auth' in error.lower() or 'permission' in error.lower():
                    patterns['auth_errors'].append(exec_data)
                elif 'context' in error.lower() or 'token' in error.lower():
                    patterns['context_errors'].append(exec_data)
                else:
                    patterns['other_errors'].append(exec_data)
        
        return patterns
    
    def calculate_skill_health(self, executions: list):
        """Calculate health metrics for each skill"""
        skill_metrics = defaultdict(lambda: {
            'total': 0,
            'success': 0,
            'failed': 0,
            'durations': [],
            'tokens': [],
            'errors': []
        })
        
        for exec_data in executions:
            skill = exec_data.get('skill_name', 'unknown')
            skill_metrics[skill]['total'] += 1
            
            if exec_data.get('success'):
                skill_metrics[skill]['success'] += 1
            else:
                skill_metrics[skill]['failed'] += 1
                skill_metrics[skill]['errors'].append(exec_data.get('error_message', 'Unknown'))
            
            if 'duration_ms' in exec_data:
                skill_metrics[skill]['durations'].append(exec_data['duration_ms'])
            if 'tokens_used' in exec_data:
                skill_metrics[skill]['tokens'].append(exec_data['tokens_used'])
        
        # Calculate final metrics
        health = {}
        for skill, metrics in skill_metrics.items():
            avg_duration = statistics.mean(metrics['durations']) if metrics['durations'] else 0
            avg_tokens = statistics.mean(metrics['tokens']) if metrics['tokens'] else 0
            failure_rate = metrics['failed'] / metrics['total'] if metrics['total'] > 0 else 0
            
            health[skill] = {
                'total_runs': metrics['total'],
                'success_rate': (metrics['success'] / metrics['total'] * 100) if metrics['total'] > 0 else 100,
                'failure_rate': failure_rate,
                'avg_duration_ms': avg_duration,
                'avg_tokens': avg_tokens,
                'recent_errors': metrics['errors'][:3],  # Top 3 recent errors
                'health_score': self._calculate_health_score(failure_rate, metrics['total'])
            }
        
        return health
    
    def _calculate_health_score(self, failure_rate: float, total_runs: int):
        """Calculate overall health score (0-100)"""
        if total_runs < 3:
            return 80  # Neutral score for skills with little data
        
        # Base score on failure rate
        base_score = (1 - failure_rate) * 100
        
        # Penalty for high failure rate
        if failure_rate > 0.5:
            base_score -= 30
        elif failure_rate > 0.3:
            base_score -= 15
        
        # Bonus for high volume (more data = more reliable)
        if total_runs > 50:
            base_score += 10
        elif total_runs > 20:
            base_score += 5
        
        return min(100, max(0, base_score))
    
    def generate_health_report(self, days: int = 7):
        """Generate comprehensive health report"""
        executions = self.load_executions(days)
        
        if not executions:
            return "No execution data found for the specified period."
        
        health = self.calculate_skill_health(executions)
        patterns = self.analyze_failure_patterns(executions)
        
        # Sort by health score
        sorted_skills = sorted(health.items(), key=lambda x: x[1]['health_score'])
        
        report = f"""# Skill Health Report - {datetime.now().strftime('%Y-%m-%d')}

## Overview
- **Period:** Last {days} days
- **Total Executions:** {len(executions)}
- **Skills Monitored:** {len(health)}

## Skills Requiring Attention (Health Score < 70)
"""
        
        for skill, metrics in sorted_skills:
            if metrics['health_score'] < 70:
                report += f"""
### 🚨 {skill} (Health: {metrics['health_score']:.0f}/100)
- **Success Rate:** {metrics['success_rate']:.1f}%
- **Total Runs:** {metrics['total_runs']}
- **Recent Errors:**
"""
                for error in metrics['recent_errors'][:2]:
                    report += f"  - {error}\n"
        
        report += """
## Performance Summary
"""
        
        for skill, metrics in sorted_skills:
            report += f"""
### {skill}
- **Health Score:** {metrics['health_score']:.0f}/100
- **Success Rate:** {metrics['success_rate']:.1f}%
- **Avg Duration:** {metrics['avg_duration_ms']:.0f}ms
- **Avg Tokens:** {metrics['avg_tokens']:.0f}
"""
        
        # Add failure patterns
        if any(patterns.values()):
            report += """
## Failure Patterns Detected
"""
            for pattern_type, errors in patterns.items():
                if errors:
                    report += f"""
### {pattern_type.replace('_', ' ').title()}
- **Occurrences:** {len(errors)}
- **Affected Skills:** {', '.join(set(e.get('skill_name') for e in errors))}
"""
        
        # Save report
        report_date = datetime.now().strftime('%Y-%m-%d')
        report_file = REPORT_DIR / f"skill-health-{report_date}.md"
        
        with open(report_file, 'w') as f:
            f.write(report)
        
        return f"Report generated: {report_file}"
    
    def get_top_failing_skills(self, limit: int = 5):
        """Get the top N failing skills"""
        executions = self.load_executions(7)
        health = self.calculate_skill_health(executions)
        
        failing = [(skill, metrics) for skill, metrics in health.items() 
                  if metrics['failure_rate'] > 0.3 and metrics['total_runs'] >= 3]
        
        failing.sort(key=lambda x: x[1]['failure_rate'], reverse=True)
        return failing[:limit]

if __name__ == "__main__":
    analyzer = SkillAnalyzer()
    
    # Generate report
    result = analyzer.generate_health_report(7)
    print(result)
    
    # Show top failing skills
    failing = analyzer.get_top_failing_skills(3)
    if failing:
        print("\nTop Failing Skills:")
        for skill, metrics in failing:
            print(f"  - {skill}: {metrics['failure_rate']*100:.1f}% failure rate")
