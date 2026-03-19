#!/usr/bin/env python3
"""
Snake Game - A polished pygame implementation
Author: Sam 🧑‍💼
"""

import pygame
import random
import math
import time
from enum import Enum
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple


# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
GREEN = (0, 255, 0)
CYAN = (0, 255, 255)
BLUE = (0, 100, 255)
RED = (255, 0, 0)
YELLOW = (255, 255, 0)
MAGENTA = (255, 0, 255)
DARK_GREEN = (0, 200, 0)
DARK_CYAN = (0, 200, 200)
NEON_GREEN = (57, 255, 20)
NEON_CYAN = (0, 255, 255)
NEON_RED = (255, 20, 147)


@dataclass
class Point:
    x: int
    y: int


class Particle:
    """A single particle with physics."""
    def __init__(self, x: float, y: float, color: Tuple[int, int, int]):
        self.x = x
        self.y = y
        self.color = color
        angle = random.uniform(0, 2 * math.pi)
        speed = random.uniform(2, 5)
        self.vx = math.cos(angle) * speed
        self.vy = math.sin(angle) * speed
        self.life = 1.0
        self.decay = random.uniform(0.02, 0.05)
        self.size = random.uniform(2, 5)

    def update(self) -> bool:
        self.x += self.vx
        self.y += self.vy
        self.vx *= 0.95  # Friction
        self.vy *= 0.95
        self.life -= self.decay
        return self.life > 0

    def draw(self, surface: pygame.Surface):
        alpha = int(255 * self.life)
        size = int(self.size * self.life)
        size = max(1, size)
        color = tuple(min(255, c * self.life) for c in self.color)
        pygame.draw.circle(surface, color, (int(self.x), int(self.y)), size)


class Direction(Enum):
    UP = (0, -1)
    DOWN = (0, 1)
    LEFT = (-1, 0)
    RIGHT = (1, 0)


class SnakeGame:
    def __init__(self):
        pygame.init()
        try:
            pygame.mixer.init()
        except pygame.error:
            # Audio device not available, continue without sound
            pass
        
        # Screen
        self.width = 800
        self.height = 600
        self.screen = pygame.display.set_mode((self.width, self.height))
        pygame.display.set_caption("Snake 🐍")
        self.clock = pygame.time.Clock()
        
        # Game settings
        self.tile_size = 20
        self.grid_width = self.width // self.tile_size
        self.grid_height = self.height // self.tile_size
        
        # Colors
        self.bg_color = BLACK
        self.grid_color = (30, 30, 30)
        self.snake_head_color = NEON_GREEN
        self.snake_body_front = CYAN
        self.snake_body_tail = BLUE
        self.food_color = NEON_RED
        self.score_color = YELLOW
        self.high_score_color = MAGENTA
        
        # Game state
        self.reset_game()
        
        # Load high score
        self.high_score_file = Path.home() / ".snake_high_score.txt"
        if self.high_score_file.exists():
            self.high_score = int(self.high_score_file.read_text().strip())
        else:
            self.high_score = 0
        
        # Particles
        self.particles: List[Particle] = []
        
        # Effects
        self.shake_timer = 0
        self.flash_timer = 0
        self.flash_color = None
        
        # Sounds (optional - create simple beeps)
        self.sounds_enabled = True
        
    def reset_game(self):
        center_x = self.grid_width // 2
        center_y = self.grid_height // 2
        
        self.direction = Direction.RIGHT
        self.next_direction = Direction.RIGHT
        self.speed = 8  # Frames per second (lower = slower)
        self.frame_count = 0
        self.score = 0
        self.game_over = False
        self.paused = False
        
        # Snake with gradient body
        self.snake = [
            Point(center_x, center_y),
            Point(center_x - 1, center_y),
            Point(center_x - 2, center_y),
        ]
        
        self.spawn_food()
        
    def spawn_food(self):
        while True:
            x = random.randint(0, self.grid_width - 1)
            y = random.randint(0, self.grid_height - 1)
            food = Point(x, y)
            if food not in self.snake:
                self.food = food
                break
    
    def spawn_particles(self, x: int, y: int, count: int = 20, color: Tuple[int, int, int] = None):
        if color is None:
            color = (NEON_RED[0], NEON_RED[1], NEON_RED[2])
        for _ in range(count):
            self.particles.append(Particle(x * self.tile_size + self.tile_size // 2,
                                          y * self.tile_size + self.tile_size // 2,
                                          color))
    
    def shake_screen(self, duration: int = 10):
        self.shake_timer = duration
    
    def flash_screen(self, color: Tuple[int, int, int], duration: int = 5):
        self.flash_timer = duration
        self.flash_color = color
    
    def handle_input(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False
            
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    return False
                elif event.key == pygame.K_q:
                    return False
                elif event.key == pygame.K_SPACE:
                    if not self.game_over:
                        self.paused = not self.paused
                elif event.key == pygame.K_r and self.game_over:
                    self.reset_game()
                elif not self.paused and not self.game_over:
                    if event.key == pygame.K_UP or event.key == pygame.K_w:
                        if self.direction != Direction.DOWN:
                            self.next_direction = Direction.UP
                    elif event.key == pygame.K_DOWN or event.key == pygame.K_s:
                        if self.direction != Direction.UP:
                            self.next_direction = Direction.DOWN
                    elif event.key == pygame.K_LEFT or event.key == pygame.K_a:
                        if self.direction != Direction.RIGHT:
                            self.next_direction = Direction.LEFT
                    elif event.key == pygame.K_RIGHT or event.key == pygame.K_d:
                        if self.direction != Direction.LEFT:
                            self.next_direction = Direction.RIGHT
        
        return True
    
    def update(self):
        if self.paused or self.game_over:
            # Still update particles
            self.particles = [p for p in self.particles if p.update()]
            if self.shake_timer > 0:
                self.shake_timer -= 1
            if self.flash_timer > 0:
                self.flash_timer -= 1
            return
        
        self.frame_count += 1
        if self.frame_count < self.speed:
            return
        
        self.frame_count = 0
        self.direction = self.next_direction
        dx, dy = self.direction.value
        
        # Calculate new head position
        new_head = Point(
            self.snake[0].x + dx,
            self.snake[0].y + dy
        )
        
        # Check wall collision
        if new_head.x < 0 or new_head.x >= self.grid_width or \
           new_head.y < 0 or new_head.y >= self.grid_height:
            self.game_over = True
            self.shake_screen(20)
            self.flash_screen(RED, 10)
            if self.score > self.high_score:
                self.high_score = self.score
                self.high_score_file.write_text(str(self.high_score))
            return
        
        # Check self collision
        if new_head in self.snake:
            self.game_over = True
            self.shake_screen(20)
            self.flash_screen(RED, 10)
            if self.score > self.high_score:
                self.high_score = self.score
                self.high_score_file.write_text(str(self.high_score))
            return
        
        # Move snake
        self.snake.insert(0, new_head)
        
        # Check food collision
        if new_head == self.food:
            self.score += 10
            self.speed = max(3, self.speed - 0.5)  # Cap speed
            self.spawn_particles(self.food.x, self.food.y, count=20, color=self.food_color)
            self.shake_screen(10)
            self.flash_screen(YELLOW, 5)
            self.spawn_food()
        else:
            self.snake.pop()
        
        # Update particles
        self.particles = [p for p in self.particles if p.update()]
    
    def draw_grid(self):
        for x in range(0, self.width, self.tile_size):
            pygame.draw.line(self.screen, self.grid_color, (x, 0), (x, self.height))
        for y in range(0, self.height, self.tile_size):
            pygame.draw.line(self.screen, self.grid_color, (0, y), (self.width, y))
    
    def draw_snake(self):
        for i, segment in enumerate(self.snake):
            x = segment.x * self.tile_size
            y = segment.y * self.tile_size
            
            # Gradient from head to tail
            if i == 0:
                color = self.snake_head_color
                size = self.tile_size - 2
            elif i < len(self.snake) // 2:
                color = self.snake_body_front
                size = self.tile_size - 4
            else:
                color = self.snake_body_tail
                size = self.tile_size - 4
            
            # Draw rounded rectangle
            rect = pygame.Rect(x + 1, y + 1, size, size)
            pygame.draw.rect(self.screen, color, rect, border_radius=8)
            
            # Add shine effect
            if i == 0:
                shine_rect = pygame.Rect(x + 3, y + 3, size // 3, size // 3)
                pygame.draw.rect(self.screen, WHITE, shine_rect, border_radius=3)
    
    def draw_food(self):
        x = self.food.x * self.tile_size + self.tile_size // 2
        y = self.food.y * self.tile_size + self.tile_size // 2
        
        # Draw pulsating food
        pulse = math.sin(pygame.time.get_ticks() / 200) * 2
        radius = (self.tile_size // 2 - 2) + pulse
        radius = max(3, min(radius, self.tile_size // 2 - 1))
        
        pygame.draw.circle(self.screen, self.food_color, (x, y), int(radius))
        
        # Inner glow
        pygame.draw.circle(self.screen, WHITE, (x, y), int(radius * 0.5))
    
    def draw_particles(self):
        for particle in self.particles:
            particle.draw(self.screen)
    
    def draw_ui(self):
        font_large = pygame.font.Font(None, 48)
        font_small = pygame.font.Font(None, 32)
        
        # Score
        score_text = font_large.render(f"Score: {self.score}", True, self.score_color)
        self.screen.blit(score_text, (20, 20))
        
        # High score
        high_text = font_large.render(f"High Score: {self.high_score}", True, self.high_score_color)
        self.screen.blit(high_text, (self.width - high_text.get_width() - 20, 20))
        
        # Pause overlay
        if self.paused and not self.game_over:
            overlay = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 128))
            self.screen.blit(overlay, (0, 0))
            
            pause_text = font_large.render("PAUSED", True, WHITE)
            pause_subtext = font_small.render("Press SPACE to continue", True, WHITE)
            self.screen.blit(pause_text, 
                           (self.width // 2 - pause_text.get_width() // 2, 
                            self.height // 2 - 30))
            self.screen.blit(pause_subtext,
                           (self.width // 2 - pause_subtext.get_width() // 2,
                            self.height // 2 + 20))
        
        # Game over overlay
        if self.game_over:
            overlay = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 180))
            self.screen.blit(overlay, (0, 0))
            
            game_over_text = font_large.render("GAME OVER", True, RED)
            restart_text = font_small.render("Press R to restart or Q to quit", True, WHITE)
            self.screen.blit(game_over_text,
                           (self.width // 2 - game_over_text.get_width() // 2,
                            self.height // 2 - 40))
            self.screen.blit(restart_text,
                           (self.width // 2 - restart_text.get_width() // 2,
                            self.height // 2 + 10))
        
        # Instructions on first frame
        if self.frame_count == 0 and self.score == 0 and not self.game_over:
            font_inst = pygame.font.Font(None, 28)
            inst_lines = [
                "Arrow Keys or WASD to move",
                "SPACE to pause",
                "Avoid walls and your tail",
                "Eat food to grow and speed up!"
            ]
            for i, line in enumerate(inst_lines):
                text = font_inst.render(line, True, WHITE)
                self.screen.blit(text,
                               (self.width // 2 - text.get_width() // 2,
                                self.height // 2 + 50 + i * 30))
    
    def draw_flash(self):
        if self.flash_timer > 0:
            overlay = pygame.Surface((self.width, self.height), pygame.SRCALPHA)
            overlay.fill(self.flash_color + (100,))
            self.screen.blit(overlay, (0, 0))
    
    def draw_shake(self):
        if self.shake_timer > 0:
            dx = random.randint(-3, 3)
            dy = random.randint(-3, 3)
            self.screen = pygame.display.get_surface()
            temp_surface = pygame.Surface((self.width, self.height))
            temp_surface.blit(self.screen, (-dx, -dy))
            self.screen.blit(temp_surface, (0, 0))
    
    def run(self):
        running = True
        while running:
            running = self.handle_input()
            
            self.update()
            
            # Draw
            self.screen.fill(self.bg_color)
            self.draw_grid()
            self.draw_food()
            self.draw_snake()
            self.draw_particles()
            self.draw_ui()
            self.draw_flash()
            self.draw_shake()
            
            pygame.display.flip()
            self.clock.tick(60)
        
        pygame.quit()


def main():
    game = SnakeGame()
    game.run()


if __name__ == "__main__":
    main()
