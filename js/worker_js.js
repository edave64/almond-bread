/**
 * @param {MessageEvent<{rMin: number, rMax: number, iMin: number, iMax: number, maxVal: number, maxIter: number, image: ImageData}>} request
 */
onmessage = function (request) {
	const data = request.data;
	mandelbrot(data.rMin, data.rMax, data.iMin, data.iMax, data.maxVal, data.maxIter, data.image);
	postMessage(data);
};

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

/**
 * @param {number} iterationen
 * @param {number} max_iter
 * @returns
 */
function pickColor(iterationen, max_iter) {
	const frac = iterationen / max_iter;
	const maxColor = 0xFFFFFF;
	const color = 0 | (maxColor * frac);

	return maxColor - color;
}

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

	let i = max_iter
	let xx = x * x
	let yy = y * y
	let xy = x * y
	let val = xx + yy

	// Skips based on https://www.shadertoy.com/view/lsX3W4
	// skip computation inside M1 - http://iquilezles.org/www/articles/mset_1bulb/mset1bulb.htm
	if (256.0 * val * val - 96.0 * val + 32.0 * x - 3.0 < 0.0) return max_iter;
	// skip computation inside M2 - http://iquilezles.org/www/articles/mset_2bulb/mset2bulb.htm
	if (16.0 * (val + 2.0 * x + 1.0) - 1.0 < 0.0) return max_iter;

	while (val <= maxVal && i > 0) {
		i = i - 1
		x = xx - yy + xadd
		y = xy + xy + yadd
		xx = x * x
		yy = y * y
		xy = x * y
		val = xx + yy
	}

	return max_iter - i;
}