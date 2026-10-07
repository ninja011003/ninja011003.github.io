import { gaussian, mulberry32 } from './rng'

// A tiny fully-connected network with a softmax output, trained by
// full-batch gradient descent on cross-entropy loss.
export class MLP {
  constructor(sizes, activation = 'tanh', seed = 1) {
    this.sizes = sizes
    this.activation = activation
    const r = mulberry32(seed)
    this.W = []
    this.b = []
    for (let l = 0; l < sizes.length - 1; l++) {
      const nin = sizes[l]
      const scale = Math.sqrt((activation === 'relu' ? 2 : 1) / nin)
      this.W.push(Array.from({ length: sizes[l + 1] }, () => Array.from({ length: nin }, () => gaussian(r) * scale)))
      this.b.push(new Array(sizes[l + 1]).fill(0))
    }
  }

  f(z) {
    return this.activation === 'relu' ? Math.max(0, z) : Math.tanh(z)
  }

  // derivative expressed in terms of the activation value
  df(a) {
    return this.activation === 'relu' ? (a > 0 ? 1 : 0) : 1 - a * a
  }

  forward(input) {
    const acts = [input]
    let a = input
    const L = this.W.length
    for (let l = 0; l < L; l++) {
      const W = this.W[l]
      const b = this.b[l]
      const z = W.map((row, j) => row.reduce((s, w, i) => s + w * a[i], b[j]))
      if (l === L - 1) {
        const m = Math.max(...z)
        const e = z.map((v) => Math.exp(v - m))
        const s = e.reduce((p, q) => p + q, 0)
        a = e.map((v) => v / s)
      } else {
        a = z.map((v) => this.f(v))
      }
      acts.push(a)
    }
    return acts
  }

  predict(x, y) {
    const acts = this.forward([x, y])
    return acts[acts.length - 1][1]
  }

  step(data, lr, l2 = 0) {
    const L = this.W.length
    const gW = this.W.map((W) => W.map((row) => row.map(() => 0)))
    const gb = this.b.map((b) => b.map(() => 0))
    let loss = 0
    let correct = 0

    for (const p of data) {
      const acts = this.forward([p.x, p.y])
      const out = acts[L]
      loss -= Math.log(Math.max(out[p.c], 1e-9))
      if ((out[1] > 0.5 ? 1 : 0) === p.c) correct++
      let delta = out.map((o, k) => o - (k === p.c ? 1 : 0))
      for (let l = L - 1; l >= 0; l--) {
        const prev = acts[l]
        for (let j = 0; j < delta.length; j++) {
          gb[l][j] += delta[j]
          for (let i = 0; i < prev.length; i++) gW[l][j][i] += delta[j] * prev[i]
        }
        if (l > 0) {
          const next = new Array(prev.length)
          for (let i = 0; i < prev.length; i++) {
            let s = 0
            for (let j = 0; j < delta.length; j++) s += this.W[l][j][i] * delta[j]
            next[i] = s * this.df(prev[i])
          }
          delta = next
        }
      }
    }

    const n = data.length
    for (let l = 0; l < L; l++) {
      for (let j = 0; j < this.W[l].length; j++) {
        this.b[l][j] -= (lr * gb[l][j]) / n
        for (let i = 0; i < this.W[l][j].length; i++) {
          this.W[l][j][i] -= lr * (gW[l][j][i] / n + l2 * this.W[l][j][i])
        }
      }
    }
    return { loss: loss / n, acc: correct / n }
  }
}
