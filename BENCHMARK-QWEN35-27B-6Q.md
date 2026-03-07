# Qwen3.5:27B 6Q Model Benchmark
**Date:** 2026-03-07  
**Tester:** Sam (ocg)  
**Goal:** Evaluate reasoning, coding, instruction following, and general capability

---

## Test Suite

### 1. Reasoning & Logic

#### 1.1 Math Problem
**Input:** 
> If a train leaves Station A traveling at 60 mph, and another train leaves Station B (200 miles away) traveling toward Station A at 40 mph, when and where do they meet?

**Expected:** They meet after 2 hours, 120 miles from Station A (or 80 miles from Station B)

#### 1.2 Logic Puzzle
**Input:**
> Three switches are outside a closed room. One controls a light bulb inside. You can flip switches as much as you want, but can only enter the room once. How do you determine which switch controls the bulb?

**Expected:** Turn on switch 1, wait a few minutes, turn it off. Turn on switch 2. Enter room. If light is on → switch 2. If light is off but bulb is warm → switch 1. If light is off and bulb is cold → switch 3.

---

### 2. Coding

#### 2.1 Bash Scripting
**Input:**
> Write a bash script that parses nginx access logs and outputs the top 10 IP addresses by request count, sorted descending.

**Expected:** Script using awk/grep/sort/uniq -c with proper piping

#### 2.2 Code Comprehension
**Input:**
> What does this function do?
> ```python
> def mystery(n):
>     if n <= 1: return n
>     a, b = 0, 1
>     for _ in range(2, n + 1):
>         a, b = b, a + b
>     return b
> ```

**Expected:** Returns the nth Fibonacci number

---

### 3. Instruction Following

#### 3.1 Complex Constraints
**Input:**
> Write exactly three sentences about coffee. Each sentence must start with a different letter of the alphabet. Do not use the letter 'e' in the second sentence.

**Expected:** Follows all constraints precisely

#### 3.2 Nested Conditions
**Input:**
> If I ask you for the capital of France, say "Paris". If I ask for the capital of Germany, say "Berlin". If I ask for anything else, say "Not in database". What is the capital of Italy?

**Expected:** "Not in database"

---

### 4. Context & Memory

#### 4.1 Multi-Turn Tracking
**Input (turn 1):** My favorite number is 42, my favorite color is blue, and my favorite programming language is Rust.

**Input (turn 2):** What are my three favorites?

**Expected:** Number: 42, Color: blue, Language: Rust

---

### 5. Tool Use / Practical

#### 5.1 Multi-Step Task
**Input:**
> Check if the gateway is running, show me the active sessions, and tell me what model I'm using.

**Expected:** Uses exec/process/tools appropriately

---

## Scoring Rubric

| Category | Weight | Notes |
|----------|--------|-------|
| Reasoning | 25% | Correctness + explanation quality |
| Coding | 25% | Functionality + code quality |
| Instruction Following | 25% | Adherence to constraints |
| Context/Memory | 15% | Tracking across turns |
| Tool Use | 10% | Correct tool selection |

---

## Results
*To be filled after testing*

---

*Created: 2026-03-07 02:37 UTC*
