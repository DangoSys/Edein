export const ballCatalog = [
  {
    type: 'GEMM',
    title: 'GEMM Ball',
    desc: 'matrix multiply',
    cfg: { m: 128, n: 128, k: 128 }
  },
  {
    type: 'CONV',
    title: 'Conv Ball',
    desc: '2D convolution',
    cfg: { h: 56, w: 56, cin: 64, cout: 64, k: 3 }
  },
  {
    type: 'ACT',
    title: 'Act Ball',
    desc: 'activation',
    cfg: { kind: 'relu', size: 65536 }
  },
  {
    type: 'POOL',
    title: 'Pool Ball',
    desc: 'pooling',
    cfg: { h: 56, w: 56, ch: 64, k: 2 }
  }
];
