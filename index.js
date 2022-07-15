// z = seed
z = new Date % 256
// p = player x
// f = mirror x
p = f = 3
// o = pointer event coordinate
// q = player y
// g = mirror y
o = q = g = 0
// s = scenes
s = []

/**
 * Set the fill color
 * @param {string} i
 */
Z = (i, j, k) => c.fillStyle = i

/**
 * Returns the fractional part of a number
 * Note ~~ cannot be used instead of floor since it does
 * not handle negative numbers in the same way:
 * Math.floor(-10.2) is -11 while ~~(-10.2) is -10
 * @param {number} i
 * @returns {number}
 */
F = (i, j, k) => i - Math.floor(i)

/**
 * Linear conversion of range to 0-1
 * @param {number} i value
 * @param {number} j min
 * @param {number} k max
 * @returns {number}
 */
C = (i, j, k) => ((i - j) / (k - j))

/**
 * Returns a random number between 0 and 1
 * @param {number} i
 * @returns {number}
 */
// (R)andom
R = (i, j, k) => F(Math.sin(i) * 1e3)

/**
 * Returns a value between 0 and 1 based on a weight
 * @param {number} i
 * @returns {number}
 */
// Smoothstep (I)nterpolation (Hermite)
I = (i, j, k) => i * i * (3 - 2 * i)

/**
 * Linear interpolate between two values
 * @param {number} i value a
 * @param {number} j value b
 * @param {number} k a value between 0 and 1
 * @returns {number}
 */
L = (i, j, k) => (j - i) * k + i

/**
 * Hash function for use with value noise
 * @param {number} i x
 * @param {number} j y
 * @returns {number}
 */
H = (i, j, k) => R(~~i + z + R(~~j))

/**
 * Value noise
 * Note, usually x and y would be converted to ints 
 * and passed to the hashing function. However, to
 * save bytes int conversion has been moved to H()
 * ix = ~~x
 * iy = ~~y
 * @param {number} i x
 * @param {number} j y
 * @returns {number}
 */
N = (i, j, k) => L(
    L(H(i, j), H(i + 1, j), I(F(i))),
    L(H(i, j + 1), H(i + 1, j + 1), I(F(i))),
    I(F(j))
  )

/**
 * Add tiles to the scene
 * @param {number} i row offset
 */
S = (i, j, k) => {
  // Use single loop to save bytes
  for (_ = 0; _ < 280; _++) {
    // Grid is 7x40
    x = _ % 7
    y = ~~(_ / 7) + i
    // Noise frequency is 2. Halve the divisor instead of multiplying by frequency.
    // i.e. 2 * (x / 7) becomes x / 3.5 and 2 * (x / 40) is x / 20
    $ = N(x / 3.5, y / 20)
    // Set value to 0.5 if it is outside of 0–0.2 or 0.8–1
    s.push([x, y, $ > 0.2 && $ < 0.8 ? 0.5 : $])
  }
}

/**
 * Draw player
 * @param {number} i x
 * @param {number} j y
 */
P = (i, j, k) => {
  c.beginPath()
  // IRL c.moveTo(i, j) would be used as the first instruction,
  // however misusing `lineTo` is better for packing
  c.lineTo(i, j)
  c.lineTo(i + 0.5, j + 1)
  c.lineTo(i + 1, j)
  c.fill()
}

/**
 * Draw cell
 * @param {number} i x
 * @param {number} j y
 */
D = (i, j, k) => c.fillRect(i, j, 1, 1)

// Set canvas size
a.width = a.height = 600
a.style.maxWidth = '100%'

// Draw background
Z("#444")
c.fillRect(0, 0, 600, 600)

// Apply baked isometric transform
// Obtained by:
// w = 24
// c.translate(300, 300)
// c.scale(w, w / 2)
// c.rotate(45 * Math.PI / 180)
// c.getTransform()
// Or:
// $ = 45 * Math.PI / 180;
// c.transform(Math.cos($) * w, Math.sin($) * w / 2, -Math.sin($) * w, Math.cos($) * w / 2, 300, 300)
// Values can then be simplified to:
c.transform(17, 8.5, -17, 8.5, 300, 300)

// (T)ick
// i = timestamp
T = (i, j, k) => {
  // Calculate delta
  // 1e3 is shorter than 1000
  l = (i - t) / 1e3
  t = i
  // Set "base" player and mirror speeds
  v = e = l * 50

  // Basic hit detection
  for ([i, j, k] of s) {
    // Check for collisions and set player and mirror speeds
    // Note, 0.5 is "no friction", i.e. 1.5 - 0.5 results in a
    // multiplier of 1. The value (k) of the fastest boost tile
    // is 0, which results in a boost of 1.5.
    // Player
    if (p == i && ~~q == j) {
      v *= 1.5 - k
    }
    // Mirror
    if (f == i && ~~g == j) {
      e *= 1.5 - k
    }
  }

  // Update camera position
  c.translate(0, -v)

  // Update player's vertical position
  q += v

  // Update mirror's vertical position
  g += e

  // Handle player input
  if (o == 37 || o == 39) {
    // Left
    if (o == 37) {
      p--
      f++
    }
    // Right
    if (o == 39) {
      p++
      f--
    }
    // Clamp value between 0 and 6
    // Equal to Math.min(Math.max(p, 0), 6)
    p = p < 0 ? 0 : p > 6 ? 6 : p
    f = f < 0 ? 0 : f > 6 ? 6 : f
    o = 0
  }

  // Add the more tiles as the camera approaches the end of the scene
  // Note, q (player y) can be used as a proxy for the camera position
  if (q > m) {
    S(m += 40)
    // Limit the max size of the array to three "scenes" (40 x 3 = 120)
    s = m % 120 ? s : s.slice(-840)
  }

  // Draw tiles
  for ([i, j, k] of s) {
    Z("#000")
    // Set fill color using the value (k) of the tile
    // h is 120 (< 0.2) or 0
    // l is 0–50% and is computed using linear conversion of the range, e.g. 0–0.2 for "boost"
    // Boost tile
    if (k < 0.2) {  
      Z(`hsl(120, 100%, ${C(k, 0.2, 0) * 50}%)`)
    }
    // Slow tile
    if (k > 0.8) {
      Z(`hsl(0, 100%, ${C(k, 0.8, 1) * 50}%)`)
    }
    // Draw tile
    D(i, j)
  }  

  // Draw mirror
  Z("#0ff")
  P(f, g)

  // Draw player
  Z("#fff")
  P(p, q)

  // Get current transform
  n = c.getTransform()
  // Check for winning or losing state by converting
  // mirror position to screen coordinates.
  // Lose
  // Mirror is off screen (left)
  // Add buffer of 3 * w so there's a chance to "come back"
  _ = f * n.a + g * n.c + n.e < -72
  // Win
  // Mirror is off screen (right)
  $ = f * n.a + g * n.c + n.e > 672
  
  if (_ || $) {
    c.translate(0, q)
    // Rotate 90 degrees
    // Equivalent to:
    // c.rotate(-90 * Math.PI / 180)
    c.rotate(-1.57)
    c.translate(0, -q)
    c.fillText(_ ? "LOSE" : "WIN", -8, q - 1)
  } else {
    requestAnimationFrame(T)
  }
}

// Add scene
// m = tile offset
S(m = 0)
// Start loop
// t = time
T(t = 0)

// Events
// Mouse and touch
a.onpointerdown = (i, j, k) => o = i.offsetX < 300 ? 37 : 39
// Keyboard
// `which` is deprecated, but it's shorter than using `code` which
// returns readable key names.
onkeydown = (i, j, k) => o = i.which

// Ideally there would be a nice way to restart the game...
// if (o == 82) {
//   location.reload()
// }