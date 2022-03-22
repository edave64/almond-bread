/**
 * @param {MessageEvent<{rMin: number, rMax: number, iMin: number, iMax: number, maxVal: number, maxIter: number, image: ImageData}>} request
 */
onmessage = function (request) {
	const data = request.data;

	// asmjs heaps need a power of two as its heap size
	const heap = new ArrayBuffer(getNextPowerOfTwo(data.image.data.byteLength));
	const {mandelbrot} = MandelbrotAsmModule(globalThis, null, heap);
	mandelbrot(data.rMin, data.rMax, data.iMin, data.iMax, data.maxVal, data.maxIter, data.image.height, data.image.width);
	data.image.data.set(new Uint8ClampedArray(heap).slice(0, data.image.data.byteLength));
	postMessage(data);
};

function getNextPowerOfTwo(v) {
	// https://graphics.stanford.edu/~seander/bithacks.html#RoundUpPowerOf2
	v--;
	v |= v >> 1;
	v |= v >> 2;
	v |= v >> 4;
	v |= v >> 8;
	v |= v >> 16;
	v++;
	return v;
}

function MandelbrotAsmModule(stdlib, foreign, heap) {
	"use asm";

	var imul = stdlib.Math.imul;
	var buf = new stdlib.Uint8Array(heap)

	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} xadd
	 * @param {number} yadd
	 * @param {number} maxVal
	 * @param {number} max_iter
	 * @return {number}
	 */
	function julia(x, y, xadd, yadd, maxVal, max_iter) {
		x = +x;
		y = +y;
		xadd = +xadd;
		yadd = +yadd;
		maxVal = +maxVal;
		max_iter = max_iter | 0;

		var i = 0;
		var xx = 0.0;
		var yy = 0.0;
		var xy = 0.0;
		var val = 0.0;
		i = max_iter | 0;
		xx = x * x;
		yy = y * y;
		xy = x * y;
		val = xx + yy;

		// Skips based on https://www.shadertoy.com/view/lsX3W4
		// skip computation inside M1 - http://iquilezles.org/www/articles/mset_1bulb/mset1bulb.htm
		if (256.0 * val * val - 96.0 * val + 32.0 * x - 3.0 < 0.0) return max_iter | 0;
		// skip computation inside M2 - http://iquilezles.org/www/articles/mset_2bulb/mset2bulb.htm
		if (16.0 * (val + 2.0 * x + 1.0) - 1.0 < 0.0) return max_iter | 0;

		while ((val <= maxVal) & ((i | 0) > 0)) {
			i = (i - 1) | 0;
			x = xx - yy + xadd;
			y = xy + xy + yadd;
			xx = x * x;
			yy = y * y;
			xy = x * y;
			val = xx + yy;
		}

		return (max_iter - i) | 0;
	}

	/**
	 * @param {number} iterationen
	 * @param {number} max_iter
	 * @returns
	 */
	function pickColor(iterationen, max_iter) {
		iterationen = iterationen | 0;
		max_iter = max_iter | 0;
		var frac = 0.0;
		var maxColor = 16777215.0;
		var color = 0.0;
		frac = +(iterationen | 0) / +(max_iter | 0);
		color = maxColor * frac;

		return ~~(maxColor - color) | 0;
	}

	/**
	 *
	 * @param {number} rMin
	 * @param {number} rMax
	 * @param {number} iMin
	 * @param {number} iMax
	 * @param {number} maxVal
	 * @param {number} maxIter
	 * @param {number} height
	 * @param {number} width
	 */
	function mandelbrot(rMin, rMax, iMin, iMax, maxVal, maxIter, height, width) {
		rMin = +rMin;
		rMax = +rMax;
		iMin = +iMin;
		iMax = +iMax;
		maxVal = +maxVal;
		maxIter = maxIter | 0;
		height = height | 0;
		width = width | 0;

		var reSpan = 0.0;
		var imSpan = 0.0;
		var color = 0;
		var iterations = 0;
		var x = 0;
		var y = 0;
		var i = 0.0;
		var r = 0.0;
		var pxOffset = 0;

		reSpan = rMax - rMin;
		imSpan = iMax - iMin;

		for (y = 0; (y | 0) < (height | 0); y = (y + 1) | 0) {
			i = iMin + imSpan * +(y | 0) / +(height | 0);

			for (x = 0; (x | 0) < (width | 0); x = (x + 1) | 0) {
				r = rMin + reSpan * +(x | 0) / +(width | 0);

				iterations = julia(r, i, r, i, maxVal, maxIter) | 0;
				color = pickColor(iterations, maxIter) | 0;
				pxOffset = (imul(y, width) + x) << 2;

				buf[pxOffset] = (color & 0xFF0000) >> 16;
				buf[(pxOffset + 1) | 0] = (color & 0x00FF00) >> 8;
				buf[(pxOffset + 2) | 0] = color & 0x0000FF;
				buf[(pxOffset + 3) | 0] = 255;
			}
		}
	}

	return {
		mandelbrot: mandelbrot
	}
}
