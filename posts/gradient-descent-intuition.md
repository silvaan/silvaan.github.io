---
title: "Gradient descent: learning rate is everything"
description: "A one-parameter playground for the algorithm that trains every neural network, and a feel for when it diverges."
date: 2026-06-24
category: "Deep Learning"
tags: ["optimization", "gradient-descent", "deep-learning"]
---

Almost every neural network is trained by the same humble update rule:

```text
x ← x − η · ∇f(x)
```

Take the gradient, step in the opposite direction, repeat. The single most
important knob is the **learning rate** $\eta$.

## Three regimes

- **Too small:** you crawl toward the minimum and waste compute.
- **Just right:** smooth, fast convergence.
- **Too large:** you overshoot, oscillate, and eventually diverge.

The boundary between "just right" and "too large" depends on the curvature of
the loss. For a quadratic bowl $f(x) = \tfrac{1}{2}x^2$, anything with
$\eta \ge 2$ diverges.

## See it move

Open the [gradient descent simulator](/simulations/deep-learning/gradient-descent),
pick the convex bowl, and slowly raise the learning rate past 1. Watch the
iterates start to bounce across the valley before flying off. Then try the
**double well**, where the *starting point* decides which minimum you fall
into. That's non-convexity in a nutshell.
