---
title: "Riemann sums, and what 'area under the curve' really means"
description: "Building the definite integral from rectangles, and why midpoint sums converge so much faster."
date: 2026-06-20
category: "Calculus"
tags: ["integration", "limits", "calculus"]
---

The definite integral is defined as a limit of sums. We chop the interval
$[a, b]$ into $n$ pieces, build a rectangle on each, add up their areas, and ask
what happens as $n \to \infty$.

## The setup

With a uniform partition of width $h = (b - a) / n$, a Riemann sum is

```text
S_n = Σ  f(x_i*) · h        for i = 0 … n-1
```

where $x_i^*$ is some sample point inside the $i$-th subinterval. Choosing the
**left** endpoint, **right** endpoint, or **midpoint** gives different
approximations that all converge to the same integral.

## Why midpoint wins

Left and right sums have error that shrinks like $O(1/n)$. The midpoint and
trapezoid rules cancel the leading error term, so they shrink like $O(1/n^2)$,
dramatically faster.

Don't take my word for it. Open the
[Riemann sums simulator](/simulations/calculus/riemann-sum), switch between methods,
and watch the error column as you drag $n$. Midpoint with 12 rectangles often
beats left sums with 100.
