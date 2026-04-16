export const ballCatalog = [
  {
    type: 'VecBall',
    title: 'Vec Ball',
    desc: 'vector ops',
    cfg: { lanes: 16, width: 128 }
  },
  {
    type: 'ReluBall',
    title: 'Relu Ball',
    desc: 'activation',
    cfg: { size: 65536 }
  },
  {
    type: 'TransposeBall',
    title: 'Transpose Ball',
    desc: 'matrix transpose',
    cfg: { h: 64, w: 64 }
  },
  {
    type: 'Im2colBall',
    title: 'Im2col Ball',
    desc: 'im2col transform',
    cfg: { h: 56, w: 56, k: 3 }
  },
  {
    type: 'SystolicArrayBall',
    title: 'Systolic Array',
    desc: 'systolic array',
    cfg: { m: 128, n: 128, k: 128 }
  },
  {
    type: 'QuantBall',
    title: 'Quant Ball',
    desc: 'quantization',
    cfg: { bits: 8, size: 32768 }
  },
  {
    type: 'DequantBall',
    title: 'Dequant Ball',
    desc: 'dequantization',
    cfg: { bits: 8, size: 32768 }
  },
  {
    type: 'GemminiBall',
    title: 'Gemmini Ball',
    desc: 'gemmini compute',
    cfg: { pe: 16, banks: 8 }
  },
  {
    type: 'TraceBall',
    title: 'Trace Ball',
    desc: 'trace/debug',
    cfg: { depth: 1024 }
  }
];
