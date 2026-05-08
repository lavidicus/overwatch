---
date: 2026-05-07
tags: zfs, migration, vm, lesson
category: learning
---

# ZFS Stream Format Lesson

## What broke / what went wrong
VM 231 migration failed because I assumed ZFS stream format was equivalent to raw disk image. The partition table was missing.

## What I learned
ZFS stream format is a ZFS-specific format, not a raw disk image. It needs to be received into a ZFS dataset or converted to raw format before use.

## What I'll do differently
Always verify the format of backup files before attempting restoration. Use `zfs receive` for ZFS streams, not raw disk tools.
