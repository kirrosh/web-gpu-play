const canvas = document.querySelector("canvas");

// WebGPU device initialization
if (!navigator.gpu) {
  throw new Error("WebGPU not supported on this browser.");
}

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) {
  throw new Error("No appropriate GPUAdapter found.");
}

export const device = await adapter.requestDevice();

// Canvas configuration
export const context = canvas.getContext("webgpu");
export const canvasFormat = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device: device,
  format: canvasFormat,
});
