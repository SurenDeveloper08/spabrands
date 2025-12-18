const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const { header, footer, productsTable } = require("./emailComponents");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASS,
    },
});

const sendContactEmail = async (to, name, email, phone, subject, message) => {
    // Email subject
    const templatePath = path.join(__dirname, '../templates/contact.html');

    if (!fs.existsSync(templatePath)) {
        console.error('❌ contact template not found:', templatePath);
        return;
    }

    let html = fs.readFileSync(templatePath, 'utf-8');
    html = html.replace(/{{name}}/g, name)
        .replace(/{{email}}/g, email)
        .replace(/{{phone}}/g, phone)
        .replace(/{{subject}}/g, subject)
        .replace(/{{message}}/g, message);

    const mailOptions = {
        from: `"Eternica Beauty" <${process.env.SMTP_EMAIL}>`,
        to,
        subject: `Eternica Beauty: New Message from ${name}`,
        html,
    };

    await transporter.sendMail(mailOptions);
};

const adminEmailTemplate = (customer, products, totalPrice) => `
  ${header("New Order Received")}
  <div style="padding:20px;font-family:Arial,sans-serif;">
    <h3>Customer Details</h3>
    <p>Name: ${customer.fullName}</p>
    <p>Email: ${customer.email}</p>
    <p>Phone: ${customer.phone}</p>
    <p>Address: ${customer.fullAddress}</p>

    <h3>Order Details</h3>
    ${productsTable(products, true)} <!-- show price for admin -->

    <h3>Total Price: ${totalPrice.toFixed(2)}</h3>
    <p>Process this order as soon as possible.</p>
  </div>
  ${footer("Admin Dashboard: Check new orders")}
`;

const customerEmailTemplate = (customer, products, totalPrice) => `
  ${header("Your Order Confirmation")}
  <div style="padding:20px;font-family:Arial,sans-serif;">
    <p>Hi ${customer.fullName},</p>
    <p>Thank you for your order! Here is your order summary:</p>

    ${productsTable(products, false)} <!-- hide individual price for simplicity -->

    <h3 style="text-align:right;">Total: ${totalPrice.toFixed(2)}</h3>
    <p>Delivery charges are not included. Our team will call to confirm delivery and charges.</p>
  </div>
  ${footer()}
`;

// emailOptions: { to: string | array, subject: string, html: string }
const sendEmail = async (emailOptions) => {
    try {
        await transporter.sendMail({
            from: `"spabrands.me" <${process.env.SMTP_FROM_EMAIL}>`,
            to: emailOptions.to,
            subject: emailOptions.subject,
            html: emailOptions.html,
        });
        console.log(`Email sent to: ${emailOptions.to}`);
    } catch (err) {
        console.error("Email send error:", err);
        throw err;
    }
};

module.exports = { sendEmail, sendContactEmail, adminEmailTemplate, customerEmailTemplate };
