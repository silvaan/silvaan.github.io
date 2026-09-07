# Next simulations

Queued, not started. Each entry says what the page is for, what goes on the
canvas, and the one moment that has to land. Anything not on this list is not
next.

---

## Image Representation

**Area:** computer vision · slug `image-representation`

Before any filter, before any network: what a picture actually is once it is in
memory.

**Canvas.** One photograph on the left. On the right the same photograph as the
thing it really is: a grid of numbers, with the zoom deep enough that individual
values are readable. Between them a magnifier that follows the pointer, so the
patch under it appears as numbers at the same moment it is a picture.

**Controls.** Zoom, the channel shown (all, red, green, blue, or a single grey),
bit depth from eight bits down to one, and a switch between viewing the values
as brightness and as bare numbers.

**The moment.** Drop the bit depth. At eight bits nothing changes, at four the
sky bands, at one the photograph becomes a stencil, and the point that a picture
is only ever a quantised measurement lands without being argued. The second
moment is the channel split: three grey pictures that mean nothing separately
and a colour photograph together.

**Notes.** This is the page every other vision page should be able to point at,
so it should stay small and never mention convolution.

---

## Connected Components

**Area:** computer vision · slug `connected-components`

Thresholding gives you white and black. Deciding which whites are the *same
object* is a separate question, and the answer is one pass of a union-find.

**Canvas.** A binary picture on the left, made by thresholding a photograph or
by drawing straight onto it. On the right the same picture with every component
in its own colour, labelled and counted. Underneath, the union-find forest as
it is built, so a merge is visible as two trees joining.

**Controls.** The threshold, four-connectivity against eight-connectivity, a
minimum component size, and a transport that runs the scan pixel by pixel.

**The moment.** Switch between four and eight neighbours on a picture with a
diagonal touch. The count changes, sometimes dramatically, because "connected"
was never a property of the picture but a definition you chose. The second
moment is watching two labels merge halfway down the scan, which is why the
naive two-pass version needs the union-find at all.

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

**Area:** deep learning · slug `vanishing-gradients`

What happens to the gradient during training, and what the standard fixes
actually fix. This is where residual connections earn their place, so it
absorbs the old Residual Connections page rather than sitting beside it.

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

---

## Attention

**Area:** deep learning · slug `attention`

Taken down for a rebuild. The old page split the mechanism across two
simulations, one for the soft lookup and one for self-attention, and neither
was worth the length on its own.

**Canvas.** One sentence. A query token, every other token as a key, the score
for each, the softmax that turns scores into weights, and the blend that comes
out. All four on the same row so the pipeline reads left to right, with the
attention matrix underneath as the same thing done for every token at once.

**Controls.** Which token is asking, the temperature, causal masking on or off,
and a switch between the mechanism on abstract keys and the same mechanism on a
real sentence.

**The moment.** Move the query and watch one row of the matrix light up. The
matrix is not a new idea; it is the row you were just looking at, repeated for
every token. The second moment is masking: half the matrix goes dark and the
sentence can only look backwards.

**Notes.** One page, not two. Queries, keys and values as projections of the
same X belong here as a toggle, not as a separate simulation.

---

## Recurrence and Memory

**Area:** deep learning · slug `recurrence`

Also taken down for a rebuild. The idea is right and the page never made the
decay visible enough to feel.

**Canvas.** A sequence running left to right, one hidden state carried along it,
and the influence of the first input on every later step drawn as a fading
trail. Beneath it the same quantity as a number on a log axis, which is a
straight line whose slope is the recurrent weight.

**Controls.** The recurrent weight, the sequence length, and a switch between a
plain multiplicative state and an additive gate.

**The moment.** Set the weight below one and watch the trail vanish within a
dozen steps; set it above one and watch it swamp everything. Then switch on the
gate: the trail stays flat for hundreds of steps, because an addition does not
compound the way a multiplication does. It is the same argument as the residual
connection, in time rather than in depth, and the two pages should say so.
