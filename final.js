const PDFDocument = require('pdfkit');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const order = require('./eventItemsNoResponse');
const multiple = require('./multipleTickets'); // this is the json converted to js object 
const QRCode = require('qrcode');


async function generatePDF(data, filename) {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const tickets = (data.event && data.event.tickets) ? data.event.tickets : [];
    const product = (data.product && data.product.tickets) ? data.product.tickets : [];
    const items = data.items || [];

    const availableTickets = tickets.length > 0 ? tickets : product;
    const maxLength = Math.max(availableTickets.length, items.length);

    // Check if the JSON has event or products
    let eventCheck = (data.event && data.event.tickets && data.event.tickets.length > 0);
    let productsCheck = (data.product && data.product.tickets && data.product.tickets.length > 0);

    // Log availability checks
    console.log(eventCheck ? 'Event is available' : 'Event is not available');
    console.log(productsCheck ? 'Products are available' : 'Products are not available');

    doc.pipe(fs.createWriteStream(filename));

    try {
        // Printing summary page
        await generateSummaryPage(doc, data);

        // Add new page
        doc.addPage({
            size: [595.28, 841.89 * 1.2],
            margin: 50
        });

        // Desired Page
        for (let i = 0; i < maxLength; i++) {
            // Generate ticket content if tickets are available
            if (eventCheck && i < tickets.length) {
                createEvent(doc, data);
                await generateImage(doc, data);
                doc.moveDown(0.3);
                generateHR(doc);
                doc.moveDown(0.3);
                generateTicket(doc, data, i);
                doc.moveDown(0.3);
                generateHR(doc);
                doc.moveDown(0.3);
            }

            // Generate product content if products are available
            if (productsCheck && i < product.length) {
                createProduct(doc, data);
                await generateImage(doc, data);
                doc.moveDown(0.3);
                generateHR(doc);
                doc.moveDown(0.3);
                generateProduct(doc, data, i);
                doc.moveDown(0.3);
                generateHR(doc);
                doc.moveDown(0.3);
            }

            // Generate item content immediately after the ticket or product
            if (i < items.length) {
                if (eventCheck) {
                    createItems(doc, data, i);
                }
                if (productsCheck) {
                    createProductItems(doc, data, i);
                }
            }

            // QR Code generation and centering
            const qrCodeDataURL = await QRCode.toDataURL('https://google.com');
            const qrImageSize = 75;
            const pageWidth = doc.page.width;
            const x = (pageWidth - qrImageSize) / 2;
            doc.image(qrCodeDataURL, x, doc.y, {
                fit: [qrImageSize, qrImageSize]
            });

            // Seller image
            let url = 'logo.png';
            createSellerImage(doc, url);

            // Create Static Data
            createStaticData(doc, data);

            if (i < maxLength - 1) {
                doc.addPage();
            }
        }

        // Finalize the PDF file
        doc.end();

        return doc;
    } catch (err) {
        console.error(`Error: ${err.message}`);
        doc.end();
    }
}




/**
 * @async
 * @param {string} url 
 * @returns {Promise<Buffer>} 
 * @throws {Error} 
*/

async function fetchImageBuffer(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
}


/**
 * Downloads an image from a given URL and saves it to a specified file path.
 *
 * @async
 * @param {string} url 
 * @param {string} filepath 
 * @returns {Promise<void>}
 * @throws {Error} 
 */

async function downloadImage(url, filepath) {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
    });

    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

/**
 * Downloads an image from a URL and inserts it into a PDF document at a specified position.
 *
 * @async
 * @param {PDFDocument} doc 
 * @param {Object} data 
 * @param {string} data.items[0].image 
 * @returns {Promise<void>}
 * @throws {Error} 
*/

async function generateImage(doc, data) {
    const imageUrl = data.items[0].image;
    const imagePath = path.join(__dirname, 'temp_image.png');
    try {

        await downloadImage(imageUrl, imagePath);

        const imageWidth = 100;
        const pageWidth = doc.page.width;
        const rightMargin = 40;
        const xPosition = pageWidth - imageWidth - rightMargin;
        const yPosition = 40;

        doc.image(imagePath, xPosition, yPosition, { width: imageWidth });
    } catch (error) {
        console.error('Error downloading or placing the image:', error);
    } finally {
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }
}


/**
 * @param {PDFDocument} doc 
 * @param {Object} data 
 * @param {string} data.event.images[0] 
*/
async function generateEventImage(doc, data) {
    const imageUrl = data.event.images[0];
    const imagePath = path.join(__dirname, 'temp_image.png');
    try {

        await downloadImage(imageUrl, imagePath);

        const imageWidth = 100;
        const pageWidth = doc.page.width;
        const rightMargin = 40;
        const xPosition = pageWidth - imageWidth - rightMargin;
        const yPosition = 120;

        doc.image(imagePath, xPosition, yPosition, { width: imageWidth });
        doc.moveDown(0.5);
    } catch (error) {
        console.error('Error downloading or placing the image:', error);
    } finally {
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }
}


/**
 * Generates a summary page in a PDF document, including headers, event details, customer information, and invoice table.
 *
 * @async
 * @param {PDFDocument} doc 
 * @param {Object} data 
 * @param {Object} [data.event] 
 * @returns {Promise<void>} 
 * @throws {Error} 
*/

async function generateSummaryPage(doc, data) {
    generateSummaryHeader(doc, data);
    if ('event' in data) {
        doc.moveDown(3);
        createEventSummary(doc, data);
        await generateEventImage(doc, data);
        doc.moveDown(5);
    }
    generateCustomerInformation(doc, data);
    generateInvoiceTable(doc, data);
    generateSummaryFooter(doc);
}


/**
 * Generates the header section of the summary page in a PDF document.
 *
 * @param {PDFDocument} doc
 * @param {Object} invoice 
 * @param {Object} invoice.header
 * @param {string} invoice.header.application 
 * @param {string} invoice.header.business 
 * @param {string} invoice.header.businessCity 
 * @param {string} invoice.header.businessWebsite 
*/
function generateSummaryHeader(doc, invoice) {
    doc
        .image("logo.png", 50, 45, { width: 50 })
        .fillColor("#444444")
        .fontSize(20)
        .text(invoice.header.application, 110, 57)
        .fontSize(10)
        .text(invoice.header.business, 200, 50, { align: "right" })
        .text(invoice.header.businessCity, 200, 65, { align: "right" })
        .text(invoice.header.businessWebsite, 200, 80, { align: "right" })
        .moveDown();
}


/**
 * @param {PDFDocument} doc
 * @param {Object} invoice
 * @param {Object} invoice.header
 * @param {string} invoice.header.orderId
 * @param {string} invoice.header.orderDate
 * @param {string} invoice.header.customerEmail
 * @param {string} invoice.header.seller
 * @param {Object} [invoice.event]
 * @param {string} [invoice.event.name]
 * @param {number} [invoice.event.start]
*/

function generateCustomerInformation(doc, invoice) {
    let customerInformationTop = doc.y + 20;

    doc
        .fillColor("#444444")
        .fontSize(20)
        .text("Order Confirmation", 53, customerInformationTop);

    generateHr(doc, customerInformationTop + 25);

    customerInformationTop += 40;
    const timeZone = "America/New_York";

    // Convert orderDate to Date object if it is not already
    let orderDate = new Date(invoice.header.orderDate);
    if (isNaN(orderDate)) {
        console.error('Invalid orderDate:', invoice.header.orderDate);
        orderDate = new Date(); // Fallback to current date if invalid
    }

    const orderDateString = orderDate.toLocaleDateString("en-us", {
        day: "numeric",
        month: "short",
        timeZone: timeZone,
    });

    const orderTimeString = orderDate.toLocaleTimeString("en-us", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: timeZone,
        hour12: true,
    });

    const orderDateTime = `${orderDateString} at ${orderTimeString} EST`;
    let eventName = "";
    let eventDateTime = "";

    const event = invoice.event || null;
    if (event !== null) {
        eventName = event.name;
        const eventStart = event.start;
        const eventStartDateTime = new Date(0);
        eventStartDateTime.setUTCMilliseconds(eventStart * 1000);

        const dateString = eventStartDateTime.toLocaleDateString("en-us", {
            day: "numeric",
            month: "short",
            timeZone: timeZone,
        });

        const timeString = eventStartDateTime.toLocaleTimeString("en-us", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: timeZone,
            hour12: true,
        });

        eventDateTime = `${dateString} at ${timeString} EST`;
    }

    let customerEmail = invoice.header.customerEmail;
    if (customerEmail.length > 25) {
        customerEmail = customerEmail.slice(0, 25) + "...";
    }

    doc
        .fontSize(10)
        .text("Order Id:", 50, customerInformationTop)
        .font("Helvetica-Bold")
        .text(invoice.header.orderId.slice(-7), 150, customerInformationTop)
        .font("Helvetica")
        .text("Order Date:", 50, customerInformationTop + 15)
        .text(orderDateTime, 150, customerInformationTop + 15)
        .text("Email:", 50, customerInformationTop + 30)
        .text(customerEmail, 150, customerInformationTop + 30)
        .font("Helvetica-Bold")
        .text(invoice.header.seller, 300, customerInformationTop)
        .font("Helvetica")
        .text(eventName, 300, customerInformationTop + 15)
        .text(eventDateTime, 300, customerInformationTop + 30)
        .moveDown();

    generateHr(doc, customerInformationTop + 52);
}


/**
 * Draws a horizontal line (horizontal rule) on the PDF document.
 *
 * @param {PDFDocument} doc 
 * @param {number} y 
*/

function generateHr(doc, y) {
    doc
        .strokeColor("#000000")
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}

/**
 * Generates a row in a table on the PDF document.
 *
 * @param {PDFDocument} doc 
 * @param {number} y 
 * @param {string} itemName 
 * @param {string} unitCost 
 * @param {string} quantity 
 * @param {string} lineTotal 
*/

function generateTableRow(doc, y, itemName, unitCost, quantity, lineTotal) {
    const startX = 50;
    const spacing = 120;

    doc.font("Helvetica");
    doc.text(itemName, startX, y);
    doc.text(unitCost, startX + spacing, y, { align: "center" });
    doc.text(quantity, startX + 2 * spacing, y, { align: "center" });
    doc.text(lineTotal, startX + 3 * spacing, y, { align: "right" });
}


/**
 * Generates the footer section of the summary page in the PDF document.
 *
 * @param {PDFDocument} doc 
*/

function generateSummaryFooter(doc) {
    doc
        .fontSize(10)
        .text(
            "Thank you for your business.",
            50,
            750,
            { align: "center", width: 500 },
        );
}



/**
 * Displays the order date and end date in the PDF document.
 *
 * @param {PDFDocument} doc
 * @param {Object} data 
 * @param {Object} data.header 
 * @param {string} data.header.orderDate 
 * @param {string} data.header.end 
 * @param {number} [leftMargin=60] 
*/
function showDate(doc, data, leftMargin = 60) {
    const orderDate = new Date(data.header.orderDate).toLocaleDateString();
    const endDate = new Date(data.header.end).toLocaleDateString();

    const spaceBetween = ' '.repeat(3);

    doc.moveDown(0.3);
    doc.fontSize(15)
        .text(`${orderDate}${spaceBetween}>${spaceBetween} ${endDate}`, { align: 'left' });
    doc.moveDown(0.2);
}

/**
 * Draws a horizontal line (horizontal rule) on the PDF document.
 *
 * @param {PDFDocument} doc 
 * @param {number} [startX=55] 
 * @param {number} [endX=320] 
 * @param {number} [yPosition=doc.y - 2] 
*/

function generateHR(doc, startX = 55, endX = 320, yPosition = doc.y - 2) {
    doc.lineWidth(0.8)
        .strokeColor('gray')
        .moveTo(startX, yPosition) // Move to the start of the line
        .lineTo(endX, yPosition)   // Draw the line to the end position
        .stroke();                 // Apply the stroke to draw the line
    doc.moveDown(0.2);
}

/**
 * Generates an application section in the PDF document, including a logo, descriptive text, and app download buttons.
 *
 * @param {PDFDocument} doc
 * @param {Object} data
 * @param {number} [customX=30] 
 */

function generateAppSection(doc, data, customX = 30) {
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth * 0.4; // 40 % width of page 
    const logoWidth = 70; // Logo width 
    const logoHeight = 70; // Logo height

    // Calculating the center
    const logoX = customX + (contentWidth - logoWidth) / 2;
    doc.image('logo.png', logoX, doc.y, { width: logoWidth, height: logoHeight });

    doc.moveDown(6);
    const verticalSpaceAfterLogo = 50;
    doc.y += verticalSpaceAfterLogo;
    const text = 'This piece of paper will not give you tasty love';
    const text2 = 'The Yurplan app does';
    doc.fontSize(8).text(text, customX + 5, doc.y, { width: contentWidth, align: 'center' });
    doc.fontSize(8).text(text2, customX + 10, doc.y, { width: contentWidth, align: 'center' });

    doc.moveDown(2);

    const buttonWidth = 90;
    const buttonHeight = 35;
    const totalButtonWidth = buttonWidth * 2;
    const totalMargin = (contentWidth - totalButtonWidth) / 3;
    const iosX = customX + totalMargin;
    const androidX = iosX + buttonWidth + totalMargin;

    doc.image('ios.png', iosX, doc.y, { width: buttonWidth, height: buttonHeight });
    doc.image('android.png', androidX, doc.y, { width: buttonWidth, height: buttonHeight });

    // TODO:  Plz replace the url with real ones
    doc.link(iosX, doc.y, buttonWidth, buttonHeight, 'https://apps.apple.com/us/genre/ios/id36'); // Plz replace the url with real ones
    doc.link(androidX, doc.y, buttonWidth, buttonHeight, 'https://play.google.com/store/apps'); // Plz replace the url with real ones

    doc.moveDown(2);
}

/**
 * Creates an event section in the PDF document, including event details and dates.
 *
 * @param {PDFDocument} doc
 * @param {Object} data 
 * @param {Object} data.event 
 * @param {string} [data.event.name] 
 * @param {Object} [data.event.location] 
 * @param {Object} [data.event.location.address] 
 * @param {string} [data.event.location.address.city] 
 * @param {string} [data.event.location.address.lineOne] 
 * @param {string} [data.event.location.address.postalCode] 
 * @param {string} [data.event.location.address.state] 
 * @param {string} [data.event.location.name] 
*/

function createEvent(doc, data) {
    const startX = doc.x * 1.2;
    const contentWidth = 300;
    const lineHeight = 5;
    const reducedLineHeight = 7;
    const fillColor = "#444444";

    // Event name
    doc.fillColor(fillColor)
        .font('Helvetica-Bold')
        .fontSize(15)
        .text(`${data.event.name || ""}`, startX, doc.y, { width: contentWidth, align: 'left' });

    // Move down for the next line
    doc.moveDown();

    // Event city
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`City: ${data.event.location.address.city || ""}`, startX, doc.y, { width: contentWidth, align: 'left' });

    // Event address line one
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`Address Line: ${data.event.location.address.lineOne || ""}`, startX, doc.y + lineHeight, { width: contentWidth, align: 'left' });

    // Event postal code
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`Postal Code: ${data.event.location.address.postalCode || ""}`, startX, doc.y + 2 * lineHeight - 5, { width: contentWidth, align: 'left' });

    // Event state with reduced spacing
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`State: ${data.event.location.address.state || ""}`, startX, doc.y + 2 + lineHeight, { width: contentWidth, align: 'left' });

    // Event location name with reduced spacing
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`Location Name: ${data.event.location.name || ""}`, startX, doc.y + 2 + lineHeight, { width: contentWidth, align: 'left' });

    //show date    
    doc.moveDown(1);

    showDate(doc, data);
    doc
        .font('Helvetica')
        .fontSize(9)
        .text('Start Date' + '                       ' + 'End Date', startX, doc.y + lineHeight - 3, { width: contentWidth, align: 'left' });
}


/**
 * Creates an product section in the PDF document, including event details and dates.
 *
 * @param {PDFDocument} doc
 * @param {Object} data 
 * @param {Object} data.product 
 * @param {string} [data.product.name] 
 * @param {Object} [data.product.location] 
 * @param {Object} [data.product.location.address] 
 * @param {string} [data.product.location.address.city] 
 * @param {string} [data.product.location.address.lineOne] 
 * @param {string} [data.product.location.address.postalCode] 
 * @param {string} [data.product.location.address.state] 
 * @param {string} [data.product.location.name] 
*/
function createProduct(doc, data) {
    const startX = doc.x * 1.2;
    const contentWidth = 300;
    const lineHeight = 5;
    const reducedLineHeight = 7;
    const fillColor = "#444444";

    // Event name
    doc.fillColor(fillColor)
        .font('Helvetica-Bold')
        .fontSize(15)
        .text(`${data.product.name || ""}`, startX, doc.y, { width: contentWidth, align: 'left' });

    // Move down for the next line
    doc.moveDown();

    // Event city
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`City: ${data.product.location.address.city || ""}`, startX, doc.y, { width: contentWidth, align: 'left' });

    // Event address line one
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`Address Line: ${data.product.location.address.lineOne || ""}`, startX, doc.y + lineHeight, { width: contentWidth, align: 'left' });

    // Event postal code
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`Postal Code: ${data.product.location.address.postalCode || ""}`, startX, doc.y + 2 * lineHeight - 5, { width: contentWidth, align: 'left' });

    // Event state with reduced spacing
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`State: ${data.product.location.address.state || ""}`, startX, doc.y + 2 + lineHeight, { width: contentWidth, align: 'left' });

    // Event location name with reduced spacing
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`Location Name: ${data.product.location.name || ""}`, startX, doc.y + 2 + lineHeight, { width: contentWidth, align: 'left' });

    //show date    
    doc.moveDown(1);

    showDate(doc, data);
    doc
        .font('Helvetica')
        .fontSize(9)
        .text('Start Date' + '                       ' + 'End Date', startX, doc.y + lineHeight - 3, { width: contentWidth, align: 'left' });
}

/**
 * Creates a summary section for an event in the PDF document, including event details and dates.
 *
 * @param {PDFDocument} doc 
 * @param {Object} data 
 * @param {Object} data.event
 * @param {string} [data.event.name] 
 * @param {Object} [data.event.location] 
 * @param {Object} [data.event.location.address] 
 * @param {string} [data.event.location.address.city] 
 * @param {string} [data.event.location.address.lineOne] 
 * @param {string} [data.event.location.address.postalCode] 
 * @param {string} [data.event.location.address.state] 
 * @param {string} [data.event.location.name] 
*/

function createEventSummary(doc, data) {
    const startX = doc.x * 0.3;
    const contentWidth = 500;
    const lineHeight = 5;
    const reducedLineHeight = 7;

    // Event name
    doc.fillColor("#444444")
        .font('Helvetica-Bold')
        .fontSize(15)
        .text(`Event Name: ${data.event.name || ""}`, startX, doc.y, { width: contentWidth, align: 'left' });

    // Move down for the next line
    doc.moveDown();

    // Event city
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`City: ${data.event.location.address.city || ""}`, startX, doc.y, { width: contentWidth, align: 'left' });

    // Event address line one
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`Address Line: ${data.event.location.address.lineOne || ""}`, startX, doc.y + lineHeight, { width: contentWidth, align: 'left' });

    // Event postal code
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`Postal Code: ${data.event.location.address.postalCode || ""}`, startX, doc.y + 2 * lineHeight - 5, { width: contentWidth, align: 'left' });

    // Event state with reduced spacing
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`State: ${data.event.location.address.state || ""}`, startX, doc.y + 2 + lineHeight, { width: contentWidth, align: 'left' });

    // Event location name with reduced spacing
    doc
        .font('Helvetica')
        .fontSize(9)
        .text(`Location Name: ${data.event.location.name || ""}`, startX, doc.y + 2 + lineHeight, { width: contentWidth, align: 'left' });

    doc.moveDown(1);

    showDate(doc, data);
    doc
        .font('Helvetica')
        .fontSize(9)
        .text('Start Date' + '                       ' + 'End Date', startX, doc.y + lineHeight - 3, { width: contentWidth, align: 'left' });


    doc.moveDown(2);
}


/**
 * Generates a ticket section in the PDF document.
 *
 * @param {PDFDocument} doc 
 * @param {Object} data 
 * @param {number} [index=0] // default value index 0 overrided in the loop later on
*/
function generateTicket(doc, data, index = 0) {
    let tickets = data.event.tickets;

    if (!tickets || tickets.length <= index) {
        console.error("Invalid ticket data or index.");
        return;
    }

    let ticketOptions = tickets[index]?.options;
    let ticketResponsesLength = ticketOptions ? ticketOptions.length : 0;



    doc.fontSize(12).text(`Name: ${tickets[index].name || 'N/A'}`);

    doc.fontSize(8)
        .text(`Details: ${tickets[index].details || 'N/A'}`)
        .text(`ID: ${tickets[index].id || 'N/A'}`)
        .text(`Party: ${tickets[index]?.party ?? 'N/A'}`)
        .text(`Price: ${tickets[index].price || 0}`)
        .text(`Quantity: ${tickets[index].quantity || 0}`)
        .text(`Sale Start: ${tickets[index].saleStart || 'N/A'}`)

    //Plz uncomment it if you need the stripe id and product id to be printed as well

    // .text(`Stripe Price ID: ${tickets[index].stripePriceId || 'N/A'}`)
    // .text(`Stripe Product ID: ${tickets[index].stripeProductId || 'N/A'}`);


    // Check for ticket options and if any response object is present
    if (ticketOptions && Array.isArray(ticketOptions) && ticketResponsesLength > 0) {
        // Check if there is any response object present in the options array
        let responsePresent = ticketOptions.some(option => option && option.hasOwnProperty('response'));

        if (responsePresent) {
            doc.fontSize(10).text('Responses');
            for (let i = 0; i < ticketResponsesLength; i++) {
                if (ticketOptions[i] && ticketOptions[i].hasOwnProperty('response')) {
                    doc.fontSize(9).text('Title: ' + (ticketOptions[i].title || 'N/A'));
                    doc.fontSize(9).text('Responses: ' + (ticketOptions[i].response || 'N/A'));
                }
            }
        }
    }
    doc.moveDown(0.3);
}


/**
 * Generates a product section in the PDF document.
 *
 * @param {PDFDocument} doc 
 * @param {Object} data 
 * @param {number} [index=0] // default value index 0 overrided in the loop later on
*/
function generateProduct(doc, data, index = 0) {
    let tickets = data.product.tickets;

    if (!tickets || tickets.length <= index) {
        console.error("Invalid ticket data or index.");
        return;
    }

    let ticketOptions = tickets[index]?.options;
    let ticketResponsesLength = ticketOptions ? ticketOptions.length : 0;


    doc.fontSize(12).text(`Name: ${tickets[index].name || 'N/A'}`);

    doc.fontSize(8)
        .text(`Details: ${tickets[index].details || 'N/A'}`)
        .text(`ID: ${tickets[index].id || 'N/A'}`)
        .text(`Party: ${tickets[index]?.party ?? 'N/A'}`)
        .text(`Price: ${tickets[index].price || 0}`)
        .text(`Quantity: ${tickets[index].quantity || 0}`)
        .text(`Sale Start: ${tickets[index].saleStart || 'N/A'}`)

    //Plz uncomment it if you need the stripe id and product id to be printed as well

    // .text(`Stripe Price ID: ${tickets[index].stripePriceId || 'N/A'}`)
    // .text(`Stripe Product ID: ${tickets[index].stripeProductId || 'N/A'}`);


    // Check for ticket options and if any response object is present
    if (ticketOptions && Array.isArray(ticketOptions) && ticketResponsesLength > 0) {
        // Check if there is any response object present in the options array
        let responsePresent = ticketOptions.some(option => option && option.hasOwnProperty('response'));

        if (responsePresent) {
            doc.fontSize(10).text('Responses');
            for (let i = 0; i < ticketResponsesLength; i++) {
                if (ticketOptions[i] && ticketOptions[i].hasOwnProperty('response')) {
                    doc.fontSize(9).text('Title: ' + (ticketOptions[i].title || 'N/A'));
                    doc.fontSize(9).text('Responses: ' + (ticketOptions[i].response || 'N/A'));
                }
            }
        }
    }
    doc.moveDown(0.3);
}


/**
 * Formats a number as a currency string.
 *
 * @param {number} price 
 * @returns {string}
*/
function formatCurrency(price) {
    if (typeof price !== 'number' || isNaN(price)) {
        price = 0; // Default to 0 
    }
    return `$${price.toFixed(2)}`;
}

/**
 * Draws a circular image on the PDF document.
 *
 * @param {PDFDocument} doc 
 * @param {string} url 
*/

function createSellerImage(doc, url) {
    const imageUrl = url;
    const circleDiameter = 75;
    const pageWidth = doc.page.width;
    const x = (pageWidth - circleDiameter) / 2 + 120;
    const y = doc.y;

    doc.save()
        .circle(x + circleDiameter / 2, y + circleDiameter / 2, circleDiameter / 2)
        .fillColor('#FFDDC1') // Set the background color of the circle , you can change it as per your desire
        .fill()
        .stroke()
        .restore();

    doc.save()
        .circle(x + circleDiameter / 2, y + circleDiameter / 2, circleDiameter / 2)
        .clip()
        .image(imageUrl, x, y, { width: circleDiameter, height: circleDiameter }) // Fitted the image inside the circle
        .restore();
}

/**
 * Generates an invoice table on the PDF document.
 *
 * @param {PDFDocument} doc 
 * @param {Object} invoice 
 * @param {Array<Object>} invoice.items 
 * @param {number} [invoice.tax=0] 
*/

function generateInvoiceTable(doc, invoice) {
    let invoiceTableTop = doc.y + 20;

    // Generate header row
    generateTableHeader(doc, invoiceTableTop);

    let subtotal = 0;

    // Generate rows for items and calculate subtotal
    invoice.items.forEach((item, index) => {
        const position = invoiceTableTop + (index + 1) * 30; // Adjusted for spacing
        const lineTotal = (item.price || 0) * (item.quantity || 1);
        subtotal += lineTotal; // Add to subtotal

        generateTableRow(
            doc,
            position,
            item.name,
            formatCurrency(item.price || 0),
            item.quantity || 1,
            formatCurrency(lineTotal)
        );

        generateHr(doc, position + 20);
    });

    // Calculate total
    const tax = invoice.tax || 0; // If no tax is provided, default to 0
    const total = subtotal + tax;

    // Generate subtotal, tax, and total rows
    const subtotalPosition = invoiceTableTop + (invoice.items.length + 1) * 30;
    generateTableRow(doc, subtotalPosition, "", "", "Subtotal", formatCurrency(subtotal));
    generateTableRow(doc, subtotalPosition + 30, "", "", "Tax", formatCurrency(tax));
    generateTableRow(doc, subtotalPosition + 60, "", "", "Total", formatCurrency(total));
}

/**
 * Generates the header row for a table in the PDF document.
 *
 * @param {PDFDocument} doc 
 * @param {number} y 
*/

function generateTableHeader(doc, y) {
    const startX = 50;
    const spacing = 120;

    doc.font("Helvetica-Bold");

    // Set X position for each heading and draw it
    doc.text("Item", startX, y);
    doc.text("Unit Cost", startX + spacing, y, { align: "center" });
    doc.text("Quantity", startX + 2 * spacing, y, { align: "center" });
    doc.text("Line Total", startX + 3 * spacing, y, { align: "right" });
}



/**
 * Creates and formats item details in the PDF document.
 *
 * @param {PDFDocument} doc 
 * @param {Object} data 
 * @param {number} index 
 * @returns {Promise<void>} 
*/

async function createItems(doc, data, index) {
    let itemsData = data.items;

    if (index < 0 || index >= itemsData.length) {
        console.error('Index out of bounds:', index);
        return;
    }

    const item = itemsData[index];

    doc.moveDown(1);
    doc.fillColor("#444444").fontSize(12)
        .text(`Item ${index + 1}: ${item?.name || ""}`, { align: 'left' });

    doc.fontSize(10).text(`Price: $${item?.price || ""}`, { align: 'left' });
    doc.fontSize(10).text(`Quantity: ${item?.quantity || ""}`, { align: 'left' });
    doc.fontSize(10).text(`Type: ${item?.type || ""}`, { align: 'left' });
    doc.fontSize(10).text(`Details: ${item?.details || ""}`, { align: 'left' });


    //IF YOU WANT THE ITEM IMAGE TO BE SHOWN AS WELL, UNCOMMENT THE CODE

    // Display the image if available
    // if (item?.image) {
    //     try {
    //         const imageBuffer = await fetchImageBuffer(item.image);
    //         doc.image(imageBuffer, {
    //             fit: [100, 100], 
    //             align: 'left'
    //         });
    //     } catch (err) {
    //         console.error(`Failed to load image: ${err.message}`);
    //     }
    // }

    doc.moveDown(1);
    generateItemResponses(doc, data, index);
    doc.moveDown(1);
}

//create product items
async function createProductItems(doc, data, index) {
    let itemsData = data.items;

    if (index < 0 || index >= itemsData.length) {
        console.error('Index out of bounds:', index);
        return;
    }

    const item = itemsData[index];

    doc.moveDown(1);
    doc.fillColor("#444444").fontSize(12)
        .text(`Item ${index + 1}: ${item?.name || ""}`, { align: 'left' });

    doc.fontSize(10).text(`Price: $${item?.price || ""}`, { align: 'left' });
    doc.fontSize(10).text(`Quantity: ${item?.quantity || ""}`, { align: 'left' });
    doc.fontSize(10).text(`Type: ${item?.type || ""}`, { align: 'left' });
    doc.fontSize(10).text(`Details: ${item?.details || ""}`, { align: 'left' });


    //IF YOU WANT THE ITEM IMAGE TO BE SHOWN AS WELL, UNCOMMENT THE CODE

    // Display the image if available
    // if (item?.image) {
    //     try {
    //         const imageBuffer = await fetchImageBuffer(item.image);
    //         doc.image(imageBuffer, {
    //             fit: [100, 100], 
    //             align: 'left'
    //         });
    //     } catch (err) {
    //         console.error(`Failed to load image: ${err.message}`);
    //     }
    // }

    doc.moveDown(1);
    generateItemResponses(doc, data, index);
    doc.moveDown(1);
}


/**
 * Creates a section of static content in the PDF document.
 *
 * @param {PDFDocument} doc 
 * @param {Object} data 
 * @param {number} [topMargin=100] 
 */

function createStaticData(doc, data, topMargin = 100) {
    let dataString = data.header.usageBox || "";
    let title = dataString.title || "";
    let details = dataString.details || "";

    // Calculate the width for the box, which is 45% of the page width
    let boxWidth = doc.page.width * 0.45;

    // Set the font size for the title and calculate its height
    doc.fontSize(12);
    let titleHeight = doc.heightOfString(title, { width: boxWidth - 20 }); // Adjusting width for padding

    // Set the font size for details and calculate its height
    doc.fontSize(7);
    let detailsHeight = doc.heightOfString(details, { width: boxWidth - 30 }); // Adjusting width for padding

    // Calculate the total height needed for the box
    let boxHeight = titleHeight + detailsHeight + 20; // Adding some padding

    // Check if there's enough vertical space available, if not, move content to the next page
    if (doc.y + boxHeight + topMargin > doc.page.height) {
        doc.addPage(); // Add a new page if the content exceeds the page height
        doc.y = topMargin; // Reset the Y position
    }

    // Set the start positions
    let startX = doc.page.width * 0.05; // 5% from the left edge
    let startY = doc.y + topMargin; // Apply the top margin

    // Draw the rectangle dynamically based on content
    doc.rect(startX, startY, boxWidth, boxHeight).stroke();

    // Draw the title inside the box
    doc.fontSize(12).text(title, startX + 10, startY + 10, { width: boxWidth - 20, align: 'left' });

    // Draw the details below the title inside the box
    doc.fontSize(7).text(details, startX + 10, startY + titleHeight + 15, { width: boxWidth - 20, align: 'left' });

    // Now, calculate the start position for the right-side content
    let rightStartX = startX + boxWidth + 10; // 10 units gap between left and right content
    let contentWidth = doc.page.width - rightStartX - doc.page.width * 0.05; // Remaining width minus padding

    // Align the right-side content to the top of the left box
    let rightStartY = startY;

    // Render the "E-ticket Terms and Conditions" content on the right side
    doc.fontSize(10).text('E-ticket Terms and Conditions', rightStartX, rightStartY, { width: contentWidth, align: 'left' });

    // Render the first paragraph
    rightStartY += 20; // Add some space after the title
    doc.fontSize(5).text(
        'This E-Ticket is a contract, under French law, to the exclusion of all others legislation. This contract is a translation of its French version, which shall be the only authoritative text in the event of a dispute. This contract and the following Terms and Conditions binds yourself with the organiser of the event you attend to (hereafter "The Event"). The details of this contract appear on the E-Ticket. By buying this E-Ticket you chose to agree to the organiser\'s specific conditions, to the rules of procedure of the place where the event is hosted, to the rules of good behaviour established by the organiser, and to the dealer\'s general terms and conditions of sale if the E-Ticket was purchased from a dealer.',
        rightStartX,
        rightStartY,
        { width: contentWidth, align: 'left' }
    );

    // Render the subheading
    rightStartY += doc.heightOfString('This E-Ticket is a contract...') + 40; // Add some space after the first paragraph
    doc.fontSize(7).text('Validity of E-Tickets and access to the Event', rightStartX, rightStartY, { width: contentWidth, align: 'left' });

    // Render the second paragraph
    rightStartY += 15; // Add some space after the subheading
    doc.fontSize(5).text(
        'Except with the express agreement of the organiser, this E-Ticket cannot be refunded, is personal and cannot be given nor traded. Access to the Event is subject to the validity check of your E-Ticket. This E-Ticket is only valid for the specific place, session, date and time of the Event written on the entrance pass. For any event starting at a specific time, the organiser could refuse the access to the event after official opening time, which does not necessarily create an entitlement to refund. Each E-Ticket has a unique barcode, allowing one single person to access the event. This E-Ticket is also printable on plain white A4 size two-sided paper, and this without alteration to its print format and quality. Partially printed, dirty, damaged or unreadable E-Tickets can be considered as invalid and refused by the organiser. In case of bad print quality, you will need to print again your .pdf file. To verify the print quality, please make sure that every information on the E-Ticket and the barcode are legible. The distributor and the organiser disclaim all responsibility for anomalies that can occur while ordering, processing or printing the pass, since they did not do these actions; likewise they disclaim all responsibility in case of loss, theft or illicit use of the E-Ticket. During access control, you must have an official and valid ID with a photograph matching with the name written on the E-Ticket, when there is one: ID, passport, drivers\' licence, or residence permit. Family record book can be accepted for children. Access can be denied if no valid ID is shown. This ID and the E-Ticket must be kept until the end of the event. In some cases, the organiser can give you a 2-stub ticket (showing or not commissions). That ticket also has to be kept until the end of the event. Unless instructed otherwise by the organiser, if you decide to leave the event, exit is definitive and your E-Ticket will not be valid anymore.',
        rightStartX,
        rightStartY,
        { width: contentWidth, align: 'left' }
    );

    // Render the "Counterfeit, illicit payment" section
    rightStartY += doc.heightOfString('Except with the express agreement...') + 100; // Add some space after the second paragraph
    doc.fontSize(7).text('Counterfeit, illicit payment', rightStartX, rightStartY, { width: contentWidth, align: 'left' });

    // Render the third paragraph
    rightStartY += 15; // Add some space after the section heading
    doc.fontSize(5).text(
        'It is forbidden to reproduce, use a copy, duplicate, counterfeit this E-Ticket in any way, subject to prosecution. As far as this goes, getting an E-Ticket with an illicit or stolen payment, or without the owner\'s agreement will lead to lawsuits and the invalidity of the E-Ticket. To be valid, this E-Ticket must not have been appealed against or unpaid on the credit card used for the order. In these cases this E-Ticket will be considered as invalid. Finally, it is forbidden to film, photograph or record the event without the consent of the organiser, or this will be considered as an author and/or organiser rights counterfeit.',
        rightStartX,
        rightStartY,
        { width: contentWidth, align: 'left' }
    );

    // Render the "Event progress" section
    rightStartY += doc.heightOfString('It is forbidden to reproduce...') + 50; // Add some space after the third paragraph
    doc.fontSize(7).text('Event progress', rightStartX, rightStartY, { width: contentWidth, align: 'left' });

    // Render the fourth paragraph
    rightStartY += 15; // Add some space after the section heading
    doc.fontSize(5).text(
        'Events lie under the responsibility of the organiser himself. In case of cancellation or postponement of an event, the refund or exchange of this E-Ticket (freight charges, hotel, etc... being in any case excluded) will be submitted to the organiser\'s conditions.',
        rightStartX,
        rightStartY,
        { width: contentWidth, align: 'left' }
    );

    // Update doc.y to allow further content to be placed below the left-side box, regardless of right-side content height
    doc.y = startY + boxHeight + 10; // Only consider the left-side box height

    // Example: Further content on the left side, below the box
    doc.fontSize(10).text("  ", startX, doc.y, { width: boxWidth, align: 'left' });
    generateAppSection(doc, data);

}

/**
 * Generates and formats responses for a specific item in the PDF document.
 *
 * @param {PDFDocument} doc 
 * @param {Object} data 
 * @param {number} [index=0] //default value, overrided with the loop 
 * @returns {void} 
*/

function generateItemResponses(doc, data, index = 0) {
    let item = data.items[index];
    let responses = item.responses;

    // Check if the item has responses
    if (responses && responses.length > 0) {
        responses.forEach(responseItem => {
            // Write the title and response to the document
            doc.fontSize(10)
                .text(`Title: ${responseItem.title || ""}`, { align: 'left' });

            doc.fontSize(10)
                .text(`Response: ${responseItem.response || ""}`, { align: 'left' });

            // Add some space after each response
            doc.moveDown(1);
        });
    }
}



// Generate the PDF with the order object
generatePDF(order, 'order_invoice6.pdf');

// generatePDF(multiple, 'order_invoice6.pdf');


module.exports = {
    generatePDF
}