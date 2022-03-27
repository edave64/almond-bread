const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl');

if (!gl) {
  alert('Unable to initialize WebGL. Your browser or machine may not support it.');
}

// If we don't have a GL context, give up now

// Vertex shader program

const vsSource = `
  attribute vec4 aVertexPosition;
  attribute vec4 aVertexColor;

  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying lowp vec4 vColor;

  void main(void) {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vColor = aVertexColor;
  }
`;

// Fragment shader program

const fsSource = `
  varying lowp vec4 vColor;
  uniform highp vec2 uResolution;
  uniform highp vec2 uRSpan;
  uniform highp vec2 uISpan;
  uniform highp float uMaxValue;
  uniform int uMaxIter;

  highp vec4 pickColor(highp float iterationen) {
    highp float frac = iterationen / float(uMaxIter);
    highp float color = 16777215.0 - 16777215.0 * frac;
    
    highp float red = floor(color/65536.0);
    color -= red * 65536.0;
    
    highp float green = floor(color/256.0);
    color -= green * 256.0;
    
    return vec4(red / 255.0, green / 255.0, color / 255.0, 1.0);
  }

  highp float julia(highp float x, highp float y, highp float xadd, highp float yadd) {
    int gi = 0;
    highp float xx = x * x;
    highp float yy = y * y;
    highp float xy = x * y;
    highp float val = xx + yy;
  
    // Skips based on https://www.shadertoy.com/view/lsX3W4
    // skip computation inside M1 - http://iquilezles.org/www/articles/mset_1bulb/mset1bulb.htm
    if (256.0 * val * val - 96.0 * val + 32.0 * x - 3.0 < 0.0) return float(uMaxIter);
    // skip computation inside M2 - http://iquilezles.org/www/articles/mset_2bulb/mset2bulb.htm
    if (16.0 * (val + 2.0 * x + 1.0) - 1.0 < 0.0) return float(uMaxIter);
  
    for (int i=0;i<=1000;i++) {
      gi = i;
      x = xx - yy + xadd;
      y = xy + xy + yadd;
      xx = x * x;
      yy = y * y;
      xy = x * y;
      val = xx + yy;
      if (val >= uMaxValue) {
        break;
      }
    }
  
    return float(gi);
  }

  void main() {
    // Normalize the pixel and mouse positions to the maximum scale dimension
    highp vec2 rel_pos = gl_FragCoord.xy / uResolution;
    rel_pos[1] = 1.0 - rel_pos[1];
    highp float r = uRSpan[0] + (uRSpan[1] - uRSpan[0]) * rel_pos.x;
    highp float i = uISpan[0] + (uISpan[1] - uISpan[0]) * rel_pos.y;
    gl_FragColor = pickColor(julia(r, i, r, i));
  }
`;

// Initialize a shader program; this is where all the lighting
// for the vertices and so forth is established.
const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

// Collect all the info needed to use the shader program.
// Look up which attributes our shader program is using
// for aVertexPosition, aVertexColor and also
// look up uniform locations.

const programInfo = {
  program: shaderProgram,
  attribLocations: {
    vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
    vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
    modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
    uResolution: gl.getUniformLocation(shaderProgram, 'uResolution'),
    uRSpan: gl.getUniformLocation(shaderProgram, 'uRSpan'),
    uISpan: gl.getUniformLocation(shaderProgram, 'uISpan'),
    uMaxIter: gl.getUniformLocation(shaderProgram, 'uMaxIter'),
    uMaxValue: gl.getUniformLocation(shaderProgram, 'uMaxValue'),
  },
};

// Here's where we call the routine that builds all the
// objects we'll be drawing.
const buffers = initBuffers(gl);

/**
 * @param {{rMin: number, rMax: number, iMin: number, iMax: number, maxVal: number, maxIter: number, height: number, width: number }} drawData
 */
export function render (drawData) {
    canvas.width = drawData.width;
    canvas.height = drawData.height;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    drawScene(gl, programInfo, buffers, drawData);

    return canvas;
}

main();

//
// Start here
//
function main() {
  /** @type {HTMLCanvasElement} */
  const canvas = document.querySelector('#glcanvas');

  // Draw the scene
}

//
// initBuffers
//
// Initialize the buffers we'll need. For this demo, we just
// have one object -- a simple two-dimensional square.
//
function initBuffers(gl) {

  // Create a buffer for the square's positions.

  const positionBuffer = gl.createBuffer();

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Now create an array of positions for the square.

  const positions = [
     1.0,  1.0,
    -1.0,  1.0,
     1.0, -1.0,
    -1.0, -1.0,
  ];

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  // Now set up the colors for the vertices

  var colors = [
    1.0,  1.0,  1.0,  1.0,    // white
    1.0,  0.0,  0.0,  1.0,    // red
    0.0,  1.0,  0.0,  1.0,    // green
    0.0,  0.0,  1.0,  1.0,    // blue
  ];

  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  return {
    position: positionBuffer,
    color: colorBuffer,
  };
}

/**
 * Draw the scene.
 * @param {WebGLRenderingContext} gl 
 * @param {*} programInfo 
 * @param {*} buffers 
 * @param {{rMin: number, rMax: number, iMin: number, iMax: number, maxVal: number, maxIter: number }} drawData
 */
function drawScene(gl, programInfo, buffers, drawData) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
  gl.clearDepth(1.0);                 // Clear everything
  gl.enable(gl.DEPTH_TEST);           // Enable depth testing
  gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

  // Clear the canvas before we start drawing on it.

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Create a perspective matrix, a special matrix that is
  // used to simulate the distortion of perspective in a camera.
  // Our field of view is 45 degrees, with a width/height
  // ratio that matches the display size of the canvas
  // and we only want to see objects between 0.1 units
  // and 100 units away from the camera.

  const fieldOfView = 18 * Math.PI / 180;   // in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  const projectionMatrix = mat4.create();

  // note: glmatrix.js always has the first argument
  // as the destination to receive the result.
  mat4.perspective(projectionMatrix,
                   fieldOfView,
                   1,
                   zNear,
                   zFar);

  // Set the drawing position to the "identity" point, which is
  // the center of the scene.
  const modelViewMatrix = mat4.create();

  // Now move the drawing position a bit to where we want to
  // start drawing the square.

  mat4.translate(modelViewMatrix,     // destination matrix
                 modelViewMatrix,     // matrix to translate
                 [-0.0, 0.0, -6.0]);  // amount to translate

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute
  {
    const numComponents = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition);
  }

  // Tell WebGL how to pull out the colors from the color buffer
  // into the vertexColor attribute.
  {
    const numComponents = 4;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        numComponents,
        type,
        normalize,
        stride,
        offset);
    gl.enableVertexAttribArray(
        programInfo.attribLocations.vertexColor);
  }

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  // Set the shader uniforms

  gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix);
  gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix);
  gl.uniform2f(programInfo.uniformLocations.uResolution, gl.canvas.width, gl.canvas.height);
  gl.uniform2f(programInfo.uniformLocations.uRSpan, drawData.rMin, drawData.rMax);
  gl.uniform2f(programInfo.uniformLocations.uISpan, drawData.iMin, drawData.iMax);
  gl.uniform1i(programInfo.uniformLocations.uMaxIter, drawData.maxIter);
  gl.uniform1f(programInfo.uniformLocations.uMaxValue, drawData.maxVal);

  {
    const offset = 0;
    const vertexCount = 4;
    gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
  }
}

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

