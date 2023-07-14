    struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) cell: vec2f,
      };

      @group(0) @binding(0) var<uniform> grid: vec2f;
      @group(0) @binding(1) var<storage> cellState: array<u32>;

      @vertex
      fn vertexMain(@location(0) position: vec2f,
                    @builtin(instance_index) instance: u32) -> VertexOutput {
        var output: VertexOutput;

        let i = f32(instance);
        let cell = vec2f(i % grid.x, floor(i / grid.x));

        var scale = 0.0;
        if (cellState[instance] > 0) {
          scale = 1.0;
        }
        let cellOffset = cell / grid * 2;
        let gridPos = (position*scale+1) / grid - 1 + cellOffset;

        output.position = vec4f(gridPos, 0, 1);
        output.cell = cell / grid;
        return output;
      }

      @fragment
      fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
        return vec4f(input.cell, 1.0 - input.cell.x, 1);
      }
    