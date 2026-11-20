import QRCode from 'qrcode';
import { formatBRL, getMagicLink } from './format';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Gera e baixa um cartão PNG elegante pronto para enviar no WhatsApp.
 */
export async function downloadQrCardPng(params: {
  userId: string;
  displayName: string;
  accessToken: string;
  accentColor: string;
  budget?: number;
}): Promise<void> {
  const { userId, displayName, accessToken, accentColor, budget = 150 } = params;
  const magicLink = getMagicLink(accessToken);

  const width = 720;
  const height = 920;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Falha ao criar imagem do QR Code.');

  // Fundo creme quente
  ctx.fillStyle = '#FAF7F2';
  ctx.fillRect(0, 0, width, height);

  // Faixa superior decorativa
  ctx.fillStyle = accentColor || '#B83B35';
  ctx.fillRect(0, 0, width, 18);

  // Detalhe dourado
  ctx.fillStyle = '#C8963E';
  ctx.fillRect(0, 18, width, 6);

  // Título
  ctx.fillStyle = '#1F1D1A';
  ctx.textAlign = 'center';
  ctx.font = 'bold 34px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Amigo Secreto da Família', width / 2, 92);

  // Subtítulo com nome
  ctx.fillStyle = '#6B655D';
  ctx.font = '600 22px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Acesso exclusivo e secreto de', width / 2, 146);

  // Pill com nome
  const pillW = 360;
  const pillH = 62;
  const pillX = (width - pillW) / 2;
  const pillY = 168;
  ctx.fillStyle = accentColor || '#B83B35';
  roundRect(ctx, pillX, pillY, pillW, pillH, 31);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 30px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(displayName, width / 2, pillY + 41);

  // Cartão branco do QR Code
  const qrBoxSize = 460;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = 266;
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 32);
  ctx.fill();

  ctx.strokeStyle = '#E7E0D5';
  ctx.lineWidth = 3;
  roundRect(ctx, qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 32);
  ctx.stroke();

  // Gera o QR Code em um canvas temporário
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, magicLink, {
    width: 396,
    margin: 1,
    color: {
      dark: '#1F1D1A',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M',
  });

  ctx.drawImage(qrCanvas, qrBoxX + 32, qrBoxY + 32, 396, 396);

  // Instruções inferiores
  ctx.fillStyle = '#1F1D1A';
  ctx.font = 'bold 24px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Aponte a câmera do celular para entrar', width / 2, 785);

  ctx.fillStyle = '#6B655D';
  ctx.font = '500 19px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText('Não compartilhe este QR Code com ninguém da família', width / 2, 824);

  ctx.fillStyle = '#9C9488';
  ctx.font = '500 16px "Plus Jakarta Sans", Arial, sans-serif';
  ctx.fillText(`Orçamento combinado: ${formatBRL(budget)}`, width / 2, 870);

  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `qrcode-amigo-secreto-${userId}.png`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
