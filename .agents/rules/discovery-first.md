---
description: Read the code and its conventions before changing anything
alwaysApply: true
---

# Discovery first

Before modifying code you MUST:

1. Read the files you intend to change, all the way through.
2. Read the instruction file for the package if it has one.
3. Read an adjacent file that already does something similar, and follow its shape.
4. Read the example feature end to end if you are adding a feature, because it is the pattern
   the repository expects new work to copy.

Never assume a convention. A change that looks right in isolation and contradicts the
surrounding code costs more to untangle than it saved, and the next agent to touch either file
inherits the contradiction.

When a change spans layers, read the layer boundaries it crosses before writing in any of them.
Most rework in a layered repository comes from a change made at the wrong altitude.
