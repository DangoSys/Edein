import { useState } from 'react';
import init, { hello_world, greet } from '../pkg/edein_wasm.js';

let ready = false;

async function ensureReady() {
  if (!ready) {
    await init();
    ready = true;
  }
}

export function App() {
  const [name, setName] = useState('');
  const [output, setOutput] = useState('');

  async function onHello() {
    await ensureReady();
    setOutput(hello_world());
  }

  async function onGreet() {
    if (!name) {
      throw new Error('name must not be empty');
    }
    await ensureReady();
    setOutput(greet(name));
  }

  return (
    <main>
      <button onClick={onHello}>hello world</button>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="enter name"
      />
      <button onClick={onGreet}>greet</button>
      <div>{output}</div>
    </main>
  );
}
