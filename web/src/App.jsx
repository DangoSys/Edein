import React, { useEffect, useState } from 'react';

export function App() {
  const [err, setErr] = useState(null);
  const [wasm, setWasm] = useState(null);
  const [name, setName] = useState('');
  const [output, setOutput] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('../pkg/edein_wasm.js');
        await mod.default();
        if (!cancelled) setWasm(mod);
      } catch (e) {
        if (!cancelled) setErr(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function onHello() {
    setOutput(wasm.hello_world());
  }

  function onGreet() {
    if (!name) {
      throw new Error('name must not be empty');
    }
    setOutput(wasm.greet(name));
  }

  if (err) {
    return (
      <pre style={{ color: 'crimson', whiteSpace: 'pre-wrap' }}>
        {String(err)}
      </pre>
    );
  }

  if (!wasm) {
    return <div>loading wasm…</div>;
  }

  return (
    <main>
      <button type="button" onClick={onHello}>
        hello world
      </button>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="enter name"
      />
      <button type="button" onClick={onGreet}>
        greet
      </button>
      <div>{output}</div>
    </main>
  );
}
