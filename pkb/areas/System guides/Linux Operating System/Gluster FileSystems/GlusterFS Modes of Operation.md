# GlusterFS Modes of Operation

Last edited time: April 25, 2023 11:25 PM
Owner: Jeremy Ingalls

# Introduction

This page describes in detail the different modes and how they would work in a hypothetical network with 3 systems of differing sizes. Provides the positive and negative implications for using each mode in this configuration. 

## GlusterFS has three modes of operation:

## Distributed mode

In distributed mode, GlusterFS does not replicate data, but instead splits files and directories across multiple bricks, which are storage devices. This mode is useful for large files that need to be distributed across multiple systems. In a hypothetical network with three systems of differing sizes, distributed mode would split the files across the three systems. The positive implication of using distributed mode is that it provides a high level of performance, as files can be accessed from any of the systems. The negative implication is that if one system fails, the data stored on that system will be lost.

## Replicated mode

In replicated mode, GlusterFS replicates data across multiple bricks, which provides redundancy in case of a system failure. In a hypothetical network with three systems of differing sizes, replicated mode would replicate data across all three systems. The positive implication of using replicated mode is that it provides data redundancy, which means that if one system fails, the data can still be accessed from another system. The negative implication is that replicated mode has a higher storage overhead than distributed mode.

## Distributed Replicated mode

Distributed replicated mode is a combination of distributed and replicated modes. In this mode, GlusterFS replicates data across multiple bricks, but splits the files and directories across the replicas. In a hypothetical network with three systems of differing sizes, distributed replicated mode would split the files across the three systems and replicate the data across all three systems. The positive implication of using distributed replicated mode is that it provides both performance and data redundancy. The negative implication is that it has a higher storage overhead than distributed mode.