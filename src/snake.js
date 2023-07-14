import { device, context, canvasFormat } from "./context";
import cellShader from "./shaders/cell-shader.wgsl?raw";
import simulationShader from "./shaders/simulation-shader.wgsl?raw";

import snakeShader from "./shaders/snake-shader.wgsl?raw";

let step = 0;
const GRID_SIZE = 32;
const WORKGROUP_SIZE = 8;

const vertexBufferLayout = {
  arrayStride: 8,
  attributes: [
    {
      format: "float32x2",
      offset: 0,
      shaderLocation: 0, // Position. Matches @location(0) in the @vertex shader.
    },
  ],
};

const vertices = new Float32Array([
  -0.8, -0.8, 0.8, -0.8, 0.8, 0.8,

  -0.8, -0.8, 0.8, 0.8, -0.8, 0.8,
]);

const vertexBuffer = device.createBuffer({
  label: "Cell vertices",
  size: vertices.byteLength,
  usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(vertexBuffer, 0, vertices);

// Create a uniform buffer that describes the grid.
const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);
const uniformBuffer = device.createBuffer({
  label: "Grid Uniforms",
  size: uniformArray.byteLength,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

// Create an array representing the active state of each cell.
const cellStateArray = new Uint32Array(GRID_SIZE * GRID_SIZE);

const directionArray = new Uint32Array(1);
const lengthArray = new Uint32Array(1);
const randompoinArray = new Uint32Array(1);

// Create two storage buffers to hold the cell state.
const cellStateStorage = [
  device.createBuffer({
    label: "Cell State A",
    size: cellStateArray.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  }),
  device.createBuffer({
    label: "Cell State B",
    size: cellStateArray.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  }),
];

const snakeLengthStorage = device.createBuffer({
  label: "Snake Length",
  size: directionArray.byteLength,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const snakeDirectionStorage = device.createBuffer({
  label: "Snake Direction",
  size: directionArray.byteLength,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

const randompoinStorage = device.createBuffer({
  label: "Random Point",
  size: randompoinArray.byteLength,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
});

// Set each cell to a random state, then copy the JavaScript array into
// the storage buffer.
// for (let i = 0; i < cellStateArray.length; ++i) {
//   cellStateArray[i] = Math.random() > 0.6 ? 1 : 0;
// }

directionArray[0] = 0;
lengthArray[0] = 4;

cellStateArray[0] = 4;
cellStateArray[1] = 3;
cellStateArray[2] = 2;
cellStateArray[3] = 1;
device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);
device.queue.writeBuffer(snakeDirectionStorage, 0, directionArray);
device.queue.writeBuffer(snakeLengthStorage, 0, lengthArray);

let prevDirection = 0;

export function setDirection(direction) {
  if (
    (direction === 0 || direction === 2) &&
    (prevDirection === 2 || prevDirection === 0)
  )
    return;
  if (
    (direction === 1 || direction === 3) &&
    (prevDirection === 1 || prevDirection === 3)
  )
    return;

  directionArray[0] = direction;
  prevDirection = direction;
  device.queue.writeBuffer(snakeDirectionStorage, 0, directionArray);
}

// get random number between 0 and GRID_SIZE
function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

// Create the bind group layout and pipeline layout.
const bindGroupLayout = device.createBindGroupLayout({
  label: "Cell Bind Group Layout",
  entries: [
    {
      binding: 0,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
      buffer: {}, // Grid uniform buffer
    },
    {
      binding: 1,
      visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
      buffer: { type: "read-only-storage" }, // Cell state input buffer
    },
    {
      binding: 2,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "storage" }, // Cell state output buffer
    },
    {
      binding: 3,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "storage" }, // Cell length
    },
    {
      binding: 4,
      visibility: GPUShaderStage.COMPUTE,
      buffer: { type: "storage" }, // Cell direction
    },
  ],
});

const pipelineLayout = device.createPipelineLayout({
  label: "Cell Pipeline Layout",
  bindGroupLayouts: [bindGroupLayout],
});

// Create the shader that will render the cells.
const cellShaderModule = device.createShaderModule({
  label: "Cell shader",
  code: cellShader,
});

// Create a pipeline that renders the cell.
const cellPipeline = device.createRenderPipeline({
  label: "Cell pipeline",
  layout: pipelineLayout,
  vertex: {
    module: cellShaderModule,
    entryPoint: "vertexMain",
    buffers: [vertexBufferLayout],
  },
  fragment: {
    module: cellShaderModule,
    entryPoint: "fragmentMain",
    targets: [
      {
        format: canvasFormat,
      },
    ],
  },
});

// Create the compute shader that will process the game of life simulation.
const simulationShaderModule = device.createShaderModule({
  label: "Snake shader",
  code: snakeShader,
});

// Create a compute pipeline that updates the game state.
const simulationPipeline = device.createComputePipeline({
  label: "Simulation pipeline",
  layout: pipelineLayout,
  compute: {
    module: simulationShaderModule,
    entryPoint: "computeMain",
  },
});

const bindGroups = [
  device.createBindGroup({
    label: "Cell renderer bind group A",
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: uniformBuffer },
      },
      {
        binding: 1,
        resource: { buffer: cellStateStorage[0] },
      },
      {
        binding: 2,
        resource: { buffer: cellStateStorage[1] },
      },
      {
        binding: 3,
        resource: { buffer: snakeLengthStorage },
      },
      {
        binding: 4,
        resource: { buffer: snakeDirectionStorage },
      },
    ],
  }),
  device.createBindGroup({
    label: "Cell renderer bind group B",
    layout: bindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: { buffer: uniformBuffer },
      },
      {
        binding: 1,
        resource: { buffer: cellStateStorage[1] },
      },
      {
        binding: 2,
        resource: { buffer: cellStateStorage[0] },
      },
      {
        binding: 3,
        resource: { buffer: snakeLengthStorage },
      },
      {
        binding: 4,
        resource: { buffer: snakeDirectionStorage },
      },
    ],
  }),
];

// device.queue.writeBuffer(snakeDirectionStorage, 0, directionArray[0]);

export const updateSnake = async () => {
  const encoder = device.createCommandEncoder();

  // Start a compute pass
  const computePass = encoder.beginComputePass();
  computePass.setPipeline(simulationPipeline);
  computePass.setBindGroup(0, bindGroups[step % 2]);
  const workgroupCount = Math.ceil(GRID_SIZE / WORKGROUP_SIZE);
  computePass.dispatchWorkgroups(workgroupCount, workgroupCount);
  computePass.end();

  step++; // Increment the step count
  // Start a render pass
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: context.getCurrentTexture().createView(),
        loadOp: "clear",
        clearValue: { r: 0, g: 0, b: 0.2, a: 0 },
        storeOp: "store",
      },
    ],
  });

  // Draw the grid.
  pass.setPipeline(cellPipeline);
  pass.setBindGroup(0, bindGroups[step % 2]); // Updated!
  pass.setVertexBuffer(0, vertexBuffer);
  pass.draw(vertices.length / 2, GRID_SIZE * GRID_SIZE);

  // End the render pass and submit the command buffer
  pass.end();

  device.queue.submit([encoder.finish()]);
};
