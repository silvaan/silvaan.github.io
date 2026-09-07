# Next simulations

Queued, not started. Each entry says what the page is for, what goes on the
canvas, and the one moment that has to land. Anything not on this list is not
next.

---

## Variational Autoencoder

**Area:** deep learning · slug `vae` · sits beside
[Autoencoder](src/pages/simulations/deep-learning/autoencoder.astro)

An autoencoder learns a code. A variational autoencoder learns a code you can
sample from, and the whole difference is that the encoder returns a blob rather
than a point.

**Canvas.** Input on the left, the two-dimensional latent space in the middle,
the reconstruction on the right. Every input becomes an ellipse in the latent
space, not a dot: centre `μ`, size `σ`. A sample is drawn from that ellipse and
decoded. A faint unit circle marks the prior. Below the latent space, the
decoded output for a grid of latent points, so the space can be read as a map.

**Controls.** The KL weight `β`, the latent noise on or off, which input is
being encoded, and a button that samples from the prior instead of from an
input.

**The moment.** Slide `β` to zero and it becomes an ordinary autoencoder: the
ellipses shrink to points, the reconstruction sharpens, and the space between
the points decodes to nothing at all. Raise `β` and the ellipses swell until
they overlap and every input decodes to the same blur. Somewhere in between the
space is both full and organised, which is the only reason you can sample from
it. The reparameterisation trick is worth showing explicitly as
`z = μ + σ ⊙ ε`, with `ε` visible as the thing that carries the randomness so
the gradient does not have to.

**Notes.** Ship a small pre-trained decoder the way the MNIST pages do rather
than training in the browser. Two latent dimensions, so the space is the page.

---

## Generative Adversarial Network

**Area:** generative AI · slug `gan`

Two networks with opposite jobs, and the picture is the fight between them.

**Canvas.** A two-dimensional data distribution on the left, drawn as a cloud
of real points, with the generator's samples over the top in a second colour.
The discriminator's opinion drawn underneath as a shaded field: bright where it
says real, dark where it says fake. On the right, the two losses over time on
one axis.

**Controls.** Which target distribution (a ring, two moons, a grid of modes),
how many discriminator steps per generator step, the learning rates, and a
reset.

**The moment.** Mode collapse. Pick the grid of modes and watch the generator
find one of them, pile everything onto it, and abandon the rest, while its loss
looks perfectly healthy. Then the discriminator catches up, the generator moves
to a different mode, and the whole thing cycles without converging. The second
moment is the balance: give the discriminator too many steps and the generator
gets no gradient at all, because a perfect discriminator is a flat one.

**Notes.** Tiny networks, trained live in the page, two dimensions throughout.
This one has to be watched over time, so the loss trace matters as much as the
scatter.

---

## Vanishing and Exploding Gradients

**Area:** deep learning · slug `vanishing-gradients` · ties together
[Initialisation](src/pages/simulations/deep-learning/initialisation.astro),
[Normalisation](src/pages/simulations/deep-learning/normalisation.astro) and
[Residual](src/pages/simulations/deep-learning/residual.astro)

Weight Initialisation shows the scale at the start of training. This one shows
what happens to the gradient during it, and what the three standard fixes
actually fix.

**Canvas.** A deep stack drawn as a column of layers. The gradient arriving at
each layer drawn as a bar, on a log axis, so a hundred layers of decay is
visible as a straight line. Beside it, the same network's training loss over a
few hundred steps, so a network that cannot train is seen failing to train
rather than merely asserted to.

**Controls.** Depth, activation, and three toggles that can be combined:
residual connections, normalisation, and gradient clipping. Plus the
initialisation scale, so the failure can be induced on purpose.

**The moment.** Turn depth up with everything off. The gradient reaching the
first layer falls by orders of magnitude per layer and the early layers never
move, so the loss stalls at a level that has nothing to do with the problem.
Switch on residual connections and the bar chart goes flat immediately, because
the identity path carries the gradient through untouched. That is the whole
argument for residual networks in one toggle.

**Notes.** Recurrent depth is the same phenomenon in time rather than in space,
so it should link to
[Recurrence](src/pages/simulations/deep-learning/recurrence.astro), and the
exploding half is where clipping earns its place.
