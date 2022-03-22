/** @type {HTMLCanvasElement} */
var canvas;

document.body.replaceChildren(
	canvas = document.createElement('canvas')
)

const ctx = canvas.getContext('2d');

const baseReMin = -2;
const baseImMin = -1.12;
const baseReMax = 0.47;
const baseImMax = 1.12;
const baseMaxBetrag = 2 * 2;
const baseIter = 1000;

const zoomFactor = 0.9;

let curReMin = baseReMin;
let curImMin = baseImMin;
let curReMax = baseReMax;
let curImMax = baseImMax;
let curMaxBetrag = baseMaxBetrag;
let curIter = baseIter;

const worker = location.search.includes("asm") ? new Worker("js/worker_asm.js") : new Worker("js/worker_js.js");

/**
 * @type {{rMin: number, rMax: number, iMin: number, iMax: number, maxVal: number, maxIter: number, image: ImageBitmap}}
 */
lastDrawn = null;
let queuedDraw = null;
let busy = false;
let time = 0;

function redraw() {
	const drawData = {
		...aspectRatioFix(),
		maxVal: curMaxBetrag,
		maxIter: curIter,
		image: ctx.createImageData(canvas.width * aa, canvas.height * aa)
	};

	if (busy) {
		queuedDraw = drawData;
		return;
	}

	time = Date.now();
	worker.postMessage(drawData);
	busy = true;
}

worker.addEventListener('message', async function (e) {
	const bitmap = await createImageBitmap(e.data.image);
	lastDrawn = e.data;
	lastDrawn.image = bitmap;
	requestAnimationFrame(render);

	console.log("Took:" + (Date.now() - time));
	if (queuedDraw) {
		time = Date.now();
		worker.postMessage(queuedDraw);
		queuedDraw = null;
	} else {
		busy = false;
	}
});

function render() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	if (!lastDrawn) return;

	const {rMin, rMax, iMin, iMax} = aspectRatioFix();

	const rOffset = lastDrawn.rMin - rMin;
	const rWidth = lastDrawn.rMax - lastDrawn.rMin;
	const iOffset = lastDrawn.iMin - iMin;
	const iWidth = lastDrawn.iMax - lastDrawn.iMin;

	const rRatio = canvas.width / (rMax - rMin);
	const iRatio = canvas.height / (iMax - iMin);

	ctx.drawImage(lastDrawn.image, rOffset * rRatio, iOffset * iRatio, rWidth * rRatio, iWidth * iRatio);
	if (busy) {
		ctx.font = "bold 32px sans-serif"
		ctx.lineWidth = 4;
		ctx.strokeStyle = "#FFFFFF"
		ctx.strokeText("Calculating...", 8, 34);
		ctx.fillText("Calculating...", 8, 34)
	}
}

window.addEventListener('wheel', (e) => {
	const factor = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;

	const wheelPosX = e.pageX / canvas.width;
	const wheelPosY = e.pageY / canvas.height;

	const iSpan = (curImMax - curImMin);
	const rSpan = (curReMax - curReMin);

	const rCenter = curReMin + rSpan * wheelPosX;
	const iCenter = curImMin + iSpan * wheelPosY;

	curImMax = iCenter + (curImMax - iCenter) * factor;
	curImMin = iCenter - (iCenter - curImMin) * factor;
	curReMax = rCenter + (curReMax - rCenter) * factor;
	curReMin = rCenter - (rCenter - curReMin) * factor;

	redraw();
	requestAnimationFrame(render);
});

let dragging = false;
let dragStartMinI = 0;
let dragStartMaxI = 0;
let dragStartMinR = 0;
let dragStartMaxR = 0;
let dragStartX = 0;
let dragStartY = 0;
const aaMatch = location.search.match(/[?&]aa=(\d+)/);
const aa = aaMatch ? +aaMatch[1] : 1;

window.addEventListener('mousedown', (e) => {
	dragging = true;

	const v = aspectRatioFix();

	dragStartMinI = v.iMin;
	dragStartMaxI = v.iMax;
	dragStartMinR = v.rMin;
	dragStartMaxR = v.rMax;
	dragStartX = e.pageX;
	dragStartY = e.pageY;
});

window.addEventListener('mousemove', (e) => {
	if (!dragging) return;

	const rRatio = canvas.width / (dragStartMaxR - dragStartMinR);
	const iRatio = canvas.height / (dragStartMaxI - dragStartMinI);

	const rDiff = (dragStartX - e.pageX) / rRatio;
	const iDiff = (dragStartY - e.pageY) / iRatio;

	curReMin = dragStartMinR + rDiff;
	curReMax = dragStartMaxR + rDiff;
	curImMin = dragStartMinI + iDiff;
	curImMax = dragStartMaxI + iDiff;

	redraw();
	requestAnimationFrame(render);
});

window.addEventListener('mouseup', (e) => {
	dragging = false;
});

window.addEventListener('mouseleave', (e) => {
	dragging = false;
});

function aspectRatioFix() {
	let rMin = curReMin;
	let rMax = curReMax;
	let iMin = curImMin;
	let iMax = curImMax;

	const aspectRatio = canvas.width / canvas.height;
	let reSpan = rMax - rMin;
	const reCenter = (rMax + rMin) / 2;
	let imSpan = iMax - iMin;
	const imCenter = (iMax + iMin) / 2;
	const reImRatio = reSpan / imSpan;

	if (aspectRatio > reImRatio) {
		reSpan = imSpan * aspectRatio;
		rMin = reCenter - (reSpan / 2);
		rMax = rMin + reSpan;
	} else {
		imSpan = reSpan / aspectRatio;
		iMin = imCenter - (imSpan / 2);
		iMax = iMin + imSpan;
	}

	return {rMin, rMax, iMin, iMax}
}

function resized() {
	dragging = false;
	canvas.height = canvas.offsetHeight;
	canvas.width = canvas.offsetWidth;
	redraw();
	requestAnimationFrame(render);
}

window.addEventListener('resize', resized)
resized();
