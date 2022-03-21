/**
 * @param {MessageEvent<{rMin: number, rMax: number, iMin: number, iMax: number, maxVal: number, maxIter: number, image: ImageData}>} request
 */
onmessage = function (request) {
	const data = request.data;
	mandelbrot(data.rMin, data.rMax, data.iMin, data.iMax, data.maxVal, data.maxIter, data.image);
	postMessage(data);
};

function MandelbrotAsmModule(stdlib, foreign, heap) {
	"use asm";

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
		iterationen = +iterationen;
		max_iter = +max_iter;
		var frac = 0.0;
		var maxColor = 16777215.0;
		var color = 0.0;
		frac = iterationen / max_iter;
		color = maxColor * frac;

		return ~~(maxColor - color) | 0;
	}

	return {
		julia: julia,
		pickColor: pickColor,
	}
}

const {julia, pickColor} = MandelbrotAsmModule(globalThis, null, null);

/**
 *
 * @param {number} rMin
 * @param {number} rMax
 * @param {number} iMin
 * @param {number} iMax
 * @param {number} maxVal
 * @param {number} maxIter
 * @param {ImageData} image
 */
function mandelbrot(rMin, rMax, iMin, iMax, maxVal, maxIter, image) {
	const bitmap = image.data;
	const reSpan = rMax - rMin;
	const imSpan = iMax - iMin;

	for (let y = 0; y < image.height; ++y) {
		const i = iMin + imSpan * y / image.height

		for (let x = 0; x < image.width; ++x) {
			const r = rMin + reSpan * x / image.width

			const iterations = julia(r, i, r, i, maxVal, maxIter)
			const color = pickColor(iterations, maxIter)
			const pxOffset = (y * image.width + x) * 4;

			bitmap[pxOffset] = (color & 0xFF0000) >> 16;
			bitmap[pxOffset + 1] = (color & 0x00FF00) >> 8;
			bitmap[pxOffset + 2] = color & 0x0000FF;
			bitmap[pxOffset + 3] = 255;
		}
	}

	return bitmap;
}
