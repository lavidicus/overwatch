#!/usr/bin/env python3
"""
OpenClaw section editor

A safer interactive editor for ~/.openclaw/openclaw.json that lets you view,
edit, add, and delete whole config sections without hand-editing the entire file.

Key behaviors:
- Parses JSON5 input, so section edits can use JSON5 syntax.
- Creates a timestamped backup before every write.
- Validates candidate configs before saving.
- Writes atomically to avoid partial/corrupt saves.
- Supports editing whole sections in $EDITOR (defaults to vim).

Dependencies:
 pip install json5

Tested with Python 3.10+.
"""

from __future__ import annotations

import copy
import datetime as dt
import difflib
import json
import os
import re
import shlex
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any, Iterable, List, Sequence, Union

try:
 import json5 # type: ignore
except ImportError:
 print("Missing dependency: json5", file=sys.stderr)
 print("Install it with: python3 -m pip install json5", file=sys.stderr)
 raise

Token = Union[str, int]


class ConfigError(Exception):
 pass


def now_stamp() -> str:
 return dt.datetime.now().strftime("%Y%m%d-%H%M%S")


def json_dump_pretty(value: Any) -> str:
 return json.dumps(value, indent=2, sort_keys=False, ensure_ascii=False) + "\n"


def print_hr() -> None:
 print("-" * 80)


def expand_config_path(raw_path: str | None) -> Path:
 if raw_path:
 return Path(raw_path).expanduser().resolve()
 return Path("~/.openclaw/openclaw.json").expanduser().resolve()


def parse_path(path: str) -> List[Token]:
 """
 Supports:
 agents.defaults.model
 agents.list[0]
 agents.defaults.models["openai/gpt-5.4"]
 channels.telegram.accounts['default']
 """
 path = path.strip()
 if not path:
 return []

 tokens: List[Token] = []
 i = 0
 n = len(path)

 while i < n:
 if path[i] == ".":
 i += 1
 continue

 if path[i] == "[":
 end = path.find("]", i)
 if end == -1:
 raise ConfigError(f"Invalid path: missing ] in {path!r}")
 inner = path[i + 1 : end].strip()
 if not inner:
 raise ConfigError(f"Invalid path: empty [] in {path!r}")
 if (inner[0] == inner[-1]) and inner[0] in ("'", '"'):
 try:
 tokens.append(json.loads(inner))
 except json.JSONDecodeError as exc:
 raise ConfigError(f"Invalid quoted key in path {path!r}: {exc}") from exc
 elif re.fullmatch(r"-?\d+", inner):
 tokens.append(int(inner))
 else:
 tokens.append(inner)
 i = end + 1
 continue

 j = i
 while j < n and path[j] not in ".[":
 j += 1
 segment = path[i:j].strip()
 if not segment:
 raise ConfigError(f"Invalid path: empty segment in {path!r}")
 tokens.append(segment)
 i = j

 return tokens


def format_path(tokens: Sequence[Token]) -> str:
 if not tokens:
 return "<root>"
 parts: List[str] = []
 for token in tokens:
 if isinstance(token, int):
 parts.append(f"[{token}]")
 elif re.fullmatch(r"[A-Za-z_][A-Za-z0-9_-]*", token):
 if parts:
 parts.append(".")
 parts.append(token)
 else:
 escaped = json.dumps(token)
 parts.append(f"[{escaped}]")
 return "".join(parts)


class OpenClawConfigApp:
 def __init__(self, config_path: Path):
 self.config_path = config_path
 self.config_dir = config_path.parent
 self.backup_dir = self.config_dir / "backups"
 self.editor = os.environ.get("EDITOR", "vim")
 self._ensure_paths()
 self.config = self._load_config_file(self.config_path)

 def _ensure_paths(self) -> None:
 self.config_dir.mkdir(parents=True, exist_ok=True)
 self.backup_dir.mkdir(parents=True, exist_ok=True)

 def _load_config_file(self, path: Path) -> Any:
 if not path.exists():
 return {}
 raw = path.read_text(encoding="utf-8")
 try:
 return json5.loads(raw)
 except Exception as exc:
 raise ConfigError(f"Failed to parse {path}: {exc}") from exc

 def reload(self) -> None:
 self.config = self._load_config_file(self.config_path)

 def serialize(self, config: Any) -> str:
 # JSON is valid JSON5, so writing normalized JSON is safe.
 return json_dump_pretty(config)

 def create_backup(self) -> Path:
 backup_path = self.backup_dir / f"openclaw.json.{now_stamp()}.bak"
 if self.config_path.exists():
 shutil.copy2(self.config_path, backup_path)
 else:
 backup_path.write_text("{}\n", encoding="utf-8")
 return backup_path

 def _stage_openclaw_home(self, candidate_text: str, tmp_home: Path) -> Path:
 real_home = Path.home()
 real_oc_dir = real_home / ".openclaw"
 staged_oc_dir = tmp_home / ".openclaw"
 staged_oc_dir.mkdir(parents=True, exist_ok=True)

 if real_oc_dir.exists():
 for item in real_oc_dir.iterdir():
 if item.name == "openclaw.json":
 continue
 target = staged_oc_dir / item.name
 try:
 os.symlink(item, target, target_is_directory=item.is_dir())
 except OSError:
 if item.is_dir():
 shutil.copytree(item, target, dirs_exist_ok=True)
 else:
 shutil.copy2(item, target)

 candidate_path = staged_oc_dir / "openclaw.json"
 candidate_path.write_text(candidate_text, encoding="utf-8")
 return candidate_path

 def validate_candidate(self, candidate_config: Any) -> tuple[bool, str]:
 candidate_text = self.serialize(candidate_config)

 # Check JSON5 parse first, even though candidate_config is already parsed.
 try:
 json5.loads(candidate_text)
 except Exception as exc:
 return False, f"JSON5 serialization check failed: {exc}"

 openclaw_bin = shutil.which("openclaw")
 if openclaw_bin:
 with tempfile.TemporaryDirectory(prefix="openclaw-validate-") as td:
 tmp_home = Path(td)
 self._stage_openclaw_home(candidate_text, tmp_home)
 env = os.environ.copy()
 env["HOME"] = str(tmp_home)
 env["OPENCLAW_HOME"] = str(tmp_home / ".openclaw")

 cmd = [openclaw_bin, "config", "validate"]
 proc = subprocess.run(
 cmd,
 capture_output=True,
 text=True,
 env=env,
 )
 out = (proc.stdout or "") + ("\n" if proc.stdout and proc.stderr else "") + (proc.stderr or "")
 out = out.strip()
 if proc.returncode == 0:
 return True, out or "Validation succeeded."
 return False, out or "openclaw config validate failed."

 # Fallback: syntax-only validation when OpenClaw CLI is unavailable.
 return True, "OpenClaw CLI not found; JSON5 syntax check passed, but schema validation was skipped."

 def write_candidate(self, candidate_config: Any, note: str = "") -> Path:
 valid, message = self.validate_candidate(candidate_config)
 if not valid:
 raise ConfigError(message)

 backup_path = self.create_backup()
 rendered = self.serialize(candidate_config)
 tmp_path = self.config_path.with_suffix(self.config_path.suffix + ".tmp")
 tmp_path.write_text(rendered, encoding="utf-8")
 os.replace(tmp_path, self.config_path)
 self.config = copy.deepcopy(candidate_config)
 print(f"Saved {self.config_path}")
 print(f"Backup: {backup_path}")
 if note:
 print(f"Change: {note}")
 print(message)
 return backup_path

 def _walk_to_parent(self, config: Any, tokens: Sequence[Token], create_missing: bool = False) -> tuple[Any, Token | None]:
 if not tokens:
 return None, None
 cur = config
 for idx, token in enumerate(tokens[:-1]):
 next_token = tokens[idx + 1]
 if isinstance(token, int):
 if not isinstance(cur, list):
 raise ConfigError(f"Expected list at {format_path(tokens[:idx])}, found {type(cur).__name__}")
 if token < 0:
 raise ConfigError("Negative indexes are not supported.")
 while create_missing and token >= len(cur):
 cur.append({} if not isinstance(next_token, int) else [])
 if token >= len(cur):
 raise ConfigError(f"Index {token} out of range at {format_path(tokens[:idx+1])}")
 if cur[token] is None and create_missing:
 cur[token] = {} if not isinstance(next_token, int) else []
 cur = cur[token]
 else:
 if not isinstance(cur, dict):
 raise ConfigError(f"Expected object at {format_path(tokens[:idx])}, found {type(cur).__name__}")
 if token not in cur:
 if not create_missing:
 raise ConfigError(f"Path not found: {format_path(tokens[:idx+1])}")
 cur[token] = {} if not isinstance(next_token, int) else []
 elif cur[token] is None and create_missing:
 cur[token] = {} if not isinstance(next_token, int) else []
 cur = cur[token]
 return cur, tokens[-1]

 def get_value(self, tokens: Sequence[Token]) -> Any:
 cur = self.config
 if not tokens:
 return cur
 for idx, token in enumerate(tokens):
 if isinstance(token, int):
 if not isinstance(cur, list):
 raise ConfigError(f"Expected list at {format_path(tokens[:idx])}, found {type(cur).__name__}")
 if token < 0 or token >= len(cur):
 raise ConfigError(f"Index {token} out of range at {format_path(tokens[:idx+1])}")
 cur = cur[token]
 else:
 if not isinstance(cur, dict):
 raise ConfigError(f"Expected object at {format_path(tokens[:idx])}, found {type(cur).__name__}")
 if token not in cur:
 raise ConfigError(f"Path not found: {format_path(tokens[:idx+1])}")
 cur = cur[token]
 return cur

 def set_value(self, tokens: Sequence[Token], value: Any) -> Any:
 candidate = copy.deepcopy(self.config)
 if not tokens:
 return value
 parent, leaf = self._walk_to_parent(candidate, tokens, create_missing=True)
 if leaf is None:
 return value
 if isinstance(leaf, int):
 if not isinstance(parent, list):
 raise ConfigError(f"Expected list at {format_path(tokens[:-1])}, found {type(parent).__name__}")
 if leaf < 0:
 raise ConfigError("Negative indexes are not supported.")
 while leaf >= len(parent):
 parent.append(None)
 parent[leaf] = value
 else:
 if not isinstance(parent, dict):
 raise ConfigError(f"Expected object at {format_path(tokens[:-1])}, found {type(parent).__name__}")
 parent[leaf] = value
 return candidate

 def delete_value(self, tokens: Sequence[Token]) -> Any:
 candidate = copy.deepcopy(self.config)
 if not tokens:
 raise ConfigError("Refusing to delete the entire root config.")
 parent, leaf = self._walk_to_parent(candidate, tokens, create_missing=False)
 if leaf is None:
 raise ConfigError("Invalid delete path.")
 if isinstance(leaf, int):
 if not isinstance(parent, list):
 raise ConfigError(f"Expected list at {format_path(tokens[:-1])}, found {type(parent).__name__}")
 if leaf < 0 or leaf >= len(parent):
 raise ConfigError(f"Index {leaf} out of range at {format_path(tokens)}")
 parent.pop(leaf)
 else:
 if not isinstance(parent, dict):
 raise ConfigError(f"Expected object at {format_path(tokens[:-1])}, found {type(parent).__name__}")
 if leaf not in parent:
 raise ConfigError(f"Path not found: {format_path(tokens)}")
 del parent[leaf]
 return candidate

 def print_value(self, tokens: Sequence[Token]) -> None:
 value = self.get_value(tokens)
 print(json_dump_pretty(value), end="")

 def print_tree(self, value: Any | None = None, prefix: str = "", depth: int = 0, max_depth: int = 2) -> None:
 if value is None:
 value = self.config
 if depth > max_depth:
 return
 if isinstance(value, dict):
 keys = list(value.keys())
 for idx, key in enumerate(keys):
 branch = "└── " if idx == len(keys) - 1 else "├── "
 child = value[key]
 child_info = self._short_type(child)
 print(f"{prefix}{branch}{key} ({child_info})")
 extension = " " if idx == len(keys) - 1 else "│ "
 if isinstance(child, (dict, list)) and depth < max_depth:
 self.print_tree(child, prefix + extension, depth + 1, max_depth)
 elif isinstance(value, list):
 for idx, item in enumerate(value):
 branch = "└── " if idx == len(value) - 1 else "├── "
 child_info = self._short_type(item)
 print(f"{prefix}{branch}[{idx}] ({child_info})")
 extension = " " if idx == len(value) - 1 else "│ "
 if isinstance(item, (dict, list)) and depth < max_depth:
 self.print_tree(item, prefix + extension, depth + 1, max_depth)
 else:
 print(f"{prefix}{self._short_scalar(value)}")

 def _short_type(self, value: Any) -> str:
 if isinstance(value, dict):
 return f"object, {len(value)} key(s)"
 if isinstance(value, list):
 return f"list, {len(value)} item(s)"
 return type(value).__name__

 def _short_scalar(self, value: Any) -> str:
 text = repr(value)
 return text if len(text) <= 60 else text[:57] + "..."

 def show_diff(self, candidate_config: Any) -> None:
 old = self.serialize(self.config).splitlines(keepends=True)
 new = self.serialize(candidate_config).splitlines(keepends=True)
 diff = difflib.unified_diff(old, new, fromfile="current", tofile="candidate")
 text = "".join(diff)
 if not text:
 print("No changes.")
 return
 print(text, end="")

 def confirm(self, prompt: str) -> bool:
 answer = input(f"{prompt} [y/N]: ").strip().lower()
 return answer in {"y", "yes"}

 def edit_section_in_editor(self, tokens: Sequence[Token]) -> Any:
 try:
 current_value = self.get_value(tokens)
 except ConfigError:
 current_value = {}

 with tempfile.NamedTemporaryFile(
 mode="w+",
 suffix=".json5",
 delete=False,
 encoding="utf-8",
 ) as tf:
 temp_name = tf.name
 tf.write(json_dump_pretty(current_value))
 tf.flush()

 try:
 cmd = shlex.split(self.editor) + [temp_name]
 proc = subprocess.run(cmd)
 if proc.returncode != 0:
 raise ConfigError(f"Editor exited with status {proc.returncode}")
 raw = Path(temp_name).read_text(encoding="utf-8")
 try:
 return json5.loads(raw)
 except Exception as exc:
 raise ConfigError(f"Edited section is not valid JSON5: {exc}") from exc
 finally:
 try:
 os.unlink(temp_name)
 except FileNotFoundError:
 pass

 def restore_backup(self, backup_path: Path) -> None:
 if not backup_path.exists():
 raise ConfigError(f"Backup not found: {backup_path}")
 raw = backup_path.read_text(encoding="utf-8")
 try:
 candidate = json5.loads(raw)
 except Exception as exc:
 raise ConfigError(f"Backup file is not valid JSON5: {exc}") from exc
 self.show_diff(candidate)
 if not self.confirm(f"Restore {backup_path.name}?"):
 print("Restore cancelled.")
 return
 self.write_candidate(candidate, note=f"restored from {backup_path.name}")

 def list_backups(self) -> List[Path]:
 return sorted(self.backup_dir.glob("openclaw.json.*.bak"), reverse=True)

 def validate_current(self) -> None:
 ok, message = self.validate_candidate(self.config)
 print(message)
 if not ok:
 raise ConfigError("Current config is invalid.")

 def apply_and_save(self, candidate: Any, note: str) -> None:
 self.show_diff(candidate)
 if not self.confirm("Save this change?"):
 print("Cancelled.")
 return
 self.write_candidate(candidate, note=note)


def print_help() -> None:
 print(
 """
Commands:
 help Show this help
 roots Show top-level sections
 tree [path] [depth] Show a section tree (default depth: 2)
 show [path] Print a section as JSON
 edit <path> Edit a whole section in $EDITOR
 add <path> Add/replace a section in $EDITOR
 set <path> <json5> Replace a section with inline JSON5
 delete <path> Delete a section or array item
 validate Validate the current config
 backup Create a manual backup now
 backups List backups
 restore <backup-file-or-name> Restore a backup after validation
 reload Reload from disk
 quit | exit Exit

Path examples:
 channels.telegram
 agents.defaults.model
 agents.list[0]
 agents.defaults.models["openai/gpt-5.4"]

Notes:
 - Writes are validated before save.
 - A backup is created before every write.
 - The file is rewritten in normalized JSON (valid JSON5), so comments and
 custom formatting are not preserved.
""".strip()
 )


def resolve_backup_arg(app: OpenClawConfigApp, raw: str) -> Path:
 candidate = Path(raw).expanduser()
 if candidate.exists():
 return candidate.resolve()
 backup = app.backup_dir / raw
 if backup.exists():
 return backup.resolve()
 raise ConfigError(f"Backup not found: {raw}")


def main(argv: Sequence[str]) -> int:
 config_arg = None
 if len(argv) > 1:
 config_arg = argv[1]

 try:
 app = OpenClawConfigApp(expand_config_path(config_arg))
 except Exception as exc:
 print(f"Startup error: {exc}", file=sys.stderr)
 return 1

 print(f"OpenClaw section editor")
 print(f"Config: {app.config_path}")
 print(f"Backups: {app.backup_dir}")
 print(f"Editor: {app.editor}")
 print("Type 'help' for commands.")

 while True:
 try:
 line = input("ocfg> ").strip()
 except (EOFError, KeyboardInterrupt):
 print()
 return 0

 if not line:
 continue

 try:
 parts = shlex.split(line)
 except ValueError as exc:
 print(f"Parse error: {exc}")
 continue

 cmd = parts[0].lower()
 args = parts[1:]

 try:
 if cmd in {"quit", "exit"}:
 return 0

 elif cmd == "help":
 print_help()

 elif cmd == "roots":
 value = app.config
 if not isinstance(value, dict):
 print("Root config is not an object.")
 elif not value:
 print("Config is empty.")
 else:
 for key in value.keys():
 print(key)

 elif cmd == "tree":
 path = args[0] if args else ""
 depth = int(args[1]) if len(args) > 1 else 2
 value = app.get_value(parse_path(path)) if path else app.config
 app.print_tree(value, max_depth=depth)

 elif cmd == "show":
 path = args[0] if args else ""
 app.print_value(parse_path(path))

 elif cmd in {"edit", "add"}:
 if not args:
 raise ConfigError(f"Usage: {cmd} <path>")
 tokens = parse_path(args[0])
 value = app.edit_section_in_editor(tokens)
 candidate = app.set_value(tokens, value)
 app.apply_and_save(candidate, note=f"edited {format_path(tokens)}")

 elif cmd == "set":
 if len(args) < 2:
 raise ConfigError("Usage: set <path> <json5>")
 tokens = parse_path(args[0])
 remainder = line[len(parts[0]) :].lstrip()
 split_remainder = remainder.split(None, 1)
 if len(split_remainder) != 2:
 raise ConfigError("Usage: set <path> <json5>")
 raw_value = split_remainder[1]
 try:
 value = json5.loads(raw_value)
 except Exception as exc:
 raise ConfigError(f"Inline value is not valid JSON5: {exc}") from exc
 candidate = app.set_value(tokens, value)
 app.apply_and_save(candidate, note=f"set {format_path(tokens)}")

 elif cmd == "delete":
 if len(args) != 1:
 raise ConfigError("Usage: delete <path>")
 tokens = parse_path(args[0])
 candidate = app.delete_value(tokens)
 app.apply_and_save(candidate, note=f"deleted {format_path(tokens)}")

 elif cmd == "validate":
 app.validate_current()

 elif cmd == "backup":
 path = app.create_backup()
 print(path)

 elif cmd == "backups":
 backups = app.list_backups()
 if not backups:
 print("No backups found.")
 else:
 for item in backups:
 print(item)

 elif cmd == "restore":
 if len(args) != 1:
 raise ConfigError("Usage: restore <backup-file-or-name>")
 backup = resolve_backup_arg(app, args[0])
 app.restore_backup(backup)

 elif cmd == "reload":
 app.reload()
 print("Reloaded from disk.")

 else:
 print(f"Unknown command: {cmd}")
 print("Type 'help' for commands.")

 except ConfigError as exc:
 print(f"Error: {exc}")
 except ValueError as exc:
 print(f"Error: {exc}")
 except Exception as exc:
 print(f"Unexpected error: {exc}")

 return 0


if __name__ == "__main__":
 raise SystemExit(main(sys.argv))
