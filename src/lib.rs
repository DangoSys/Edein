use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn hello_world() -> String {
  "Hello, world!".to_string()
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
  if name.is_empty() {
    panic!("name must not be empty");
  }
  format!("Hello, {}!", name)
}
