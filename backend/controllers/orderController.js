const catchAsyncError = require('../middlewares/catchAsyncError');
const OrderCounter = require('../models/OrderCounter');
const Order = require('../models/orderModel');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const ErrorHandler = require('../utils/errorHandler');
const { sendEmail, adminEmailTemplate, customerEmailTemplate } = require('../utils/email');

exports.createOrder = async (req, res, next) => {
    try {
        const { customer, products } = req.body;

        if (!customer || !products || !products.length) {
            return res.status(400).json({ success: false, message: "Customer and products are required" });
        }

        let totalPrice = 0;
        const processedProducts = products.map(p => {
            const subtotal = p.price * p.quantity;
            totalPrice += subtotal;
            return { ...p, subtotal };
        });

        // Save order
        const order = await Order.create({
            customer,
            products: processedProducts,
            totalPrice,
        });

        await sendEmail({
            to: customer.email,
            subject: `${customer.fullName}, your order has been received`,
            html: customerEmailTemplate(customer, processedProducts, totalPrice),
        });

        await sendEmail({
            to: process.env.ADMIN_EMAIL1,
            subject: `New Order Received - ${customer.fullName}`,
            html: adminEmailTemplate(customer, processedProducts, totalPrice),
        });

        await sendEmail({
            to: process.env.ADMIN_EMAIL2,
            subject: `New Order Received - ${customer.fullName}`,
            html: adminEmailTemplate(customer, processedProducts, totalPrice),
        });

        res.status(201).json({
            success: true,
            message: "Order created successfully.",
            order
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getAllOrder = catchAsyncError(async (req, res, next) => {
    try {
        const orders = await Order.find({}).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: orders.length,
            orders
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

exports.getMyOrders = catchAsyncError(async (req, res, next) => {
    try {
        const userId = req.user._id;

        const orders = await Order.find({ user: userId }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            orders,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
exports.getOrderById = catchAsyncError(async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email')
            .populate('items.slug', 'productName image price');

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
})
exports.updateOrder = catchAsyncError(async (req, res, next) => {
    const { status } = req.body;
    const invoiceFile = req.file;

    if (status === 'Delivered' && !invoiceFile) {
        return res.status(400).json({ error: 'Invoice file is required for Delivered status.' });
    }

    const order = await Order.findById(req.params.id).populate('user'); // Assuming you need order details
    if (!order) {
        return res.status(404).json({ error: 'Order not found' });
    }

    const { shippingInfo, orderNumber } = order;
    const customerEmail = shippingInfo.email;
    const adminEmail1 = process.env.ADMIN_EMAIL1;
    const adminEmail2 = process.env.ADMIN_EMAIL2;
    const adminEmail3 = process.env.ADMIN_EMAIL3;
    const updateData = { orderStatus: status };
    if (invoiceFile) {
        const baseUrl =
            process.env.NODE_ENV === 'production'
                ? `${req.protocol}://${req.get('host')}`
                : process.env.BACKEND_URL;

        updateData.invoice = `${baseUrl}/uploads/invoices/${invoiceFile.filename}`;

    }

    await Order.findByIdAndUpdate(req.params.id, updateData);

    if (status === 'Ordered') {
        await sendEmail(customerEmail, 'customer', order, status, order.currency, order.eligible);
        await sendEmail(adminEmail1, 'admin', order, status, order.currency, order.eligible);
        await sendEmail(adminEmail2, 'admin', order, status, order.currency, order.eligible);
        await sendEmail(adminEmail3, 'admin', order, status, order.currency, order.eligible);
    }
    else if (status === 'Out for Delivery') {
        await sendEmail(customerEmail, 'customer', order, status, order.currency, order.eligible);
    }
    else if (status === 'Delivered') {
        await sendEmail(customerEmail, 'customer', order, status, order.currency, order.eligible, updateData?.invoice);
        await sendEmail(adminEmail1, 'admin', order, status, order.currency, order.eligible, updateData?.invoice);
        await sendEmail(adminEmail2, 'admin', order, status, order.currency, order.eligible, updateData?.invoice);
        await sendEmail(adminEmail3, 'admin', order, status, order.currency, order.eligible, updateData?.invoice);
    }
    res.status(200).json({
        success: true,
        message: 'Order status updated and emails sent',
    });
});

//Get Single Order - api/v1/order/:id
exports.getSingleOrder = catchAsyncError(async (req, res, next) => {
    const order = await Order.findById(req.params.id).populate('user', 'name email');
    if (!order) {
        return next(new ErrorHandler(`Order not found with this id: ${req.params.id}`, 404))
    }

    res.status(200).json({
        success: true,
        order
    })
})

//Get Loggedin User Orders - /api/v1/myorders
exports.myOrders = catchAsyncError(async (req, res, next) => {
    const orders = await Order.find({ user: req.user.id });

    res.status(200).json({
        success: true,
        orders
    })
})

//Admin: Get All Orders - api/v1/orders
exports.orders = catchAsyncError(async (req, res, next) => {
    const orders = await Order.find();

    let totalAmount = 0;

    orders.forEach(order => {
        totalAmount += order.totalPrice
    })

    res.status(200).json({
        success: true,
        totalAmount,
        orders
    })
})

//Admin: Delete Order - api/v1/order/:id
exports.deleteOrder = catchAsyncError(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        return next(new ErrorHandler(`Order not found with this id: ${req.params.id}`, 404))
    }

    await order.remove();
    res.status(200).json({
        success: true
    })
})

