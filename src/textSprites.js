import * as THREE from 'three';

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

export function createTextSprite(text, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = options.width ?? 512;
  canvas.height = options.height ?? 256;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.scale.set(options.scaleX ?? 3.2, options.scaleY ?? 1.6, 1);
  sprite.userData.labelState = { canvas, texture, options };

  updateTextSprite(sprite, text, options);
  return sprite;
}

export function updateTextSprite(sprite, text, options = {}) {
  const state = sprite.userData.labelState;
  const canvas = state.canvas;
  const mergedOptions = { ...state.options, ...options };
  const context = canvas.getContext('2d');
  const lines = Array.isArray(text) ? text : `${text}`.split('\n');

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = mergedOptions.background ?? 'rgba(7, 12, 18, 0.82)';
  drawRoundedRect(context, 12, 12, canvas.width - 24, canvas.height - 24, 24);
  context.fill();

  context.strokeStyle = mergedOptions.border ?? 'rgba(255,255,255,0.35)';
  context.lineWidth = 6;
  context.stroke();

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = mergedOptions.color ?? '#f5f0d8';

  const fontSize = mergedOptions.fontSize ?? 48;
  context.font = `700 ${fontSize}px "Trebuchet MS", sans-serif`;

  const lineHeight = mergedOptions.lineHeight ?? fontSize + 10;
  const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    context.fillText(line, canvas.width / 2, startY + index * lineHeight);
  });

  state.texture.needsUpdate = true;
}

