
const QRCodeCanvas = require('qrcode-canvas');

async function generateQRCode(orderId, item, itemIndex) {
    //replace with your url
    const qrData = `https://example.com/order/${orderId}/item/${itemIndex}`;

    // Generate QR Code Canvas
    const qrCode = new QRCodeCanvas();
    
    // Configure QR Code options if needed
    qrCode.addData(qrData);
    qrCode.make();

    // Return the QR Code Canvas object
    return qrCode;
}



module.exports = generateQRCode;
