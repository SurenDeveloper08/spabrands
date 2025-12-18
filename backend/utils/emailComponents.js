// Header component
const header = (title, bgColor = "#fbb100") => `
  <div style="background-color:${bgColor};color:#000;text-align:center;padding:20px;font-size:24px;font-weight:bold;">
    ${title}
  </div>
`;

// Footer component
const footer = (text = "Thank you for shopping with us!") => `
  <div style="background-color:#000;color:#fff;text-align:center;padding:10px;font-size:14px;">
    ${text}
  </div>
`;

// Table component for products
const productsTable = (products, showPrice = true) => {
  const rows = products.map(p => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">${p.name}</td>
      <td style="padding:8px;border:1px solid #ddd">${p.brand}</td>
      <td style="padding:8px;border:1px solid #ddd">${p.color}</td>
      <td style="padding:8px;border:1px solid #ddd">${p.size}</td>
      ${showPrice ? `<td style="padding:8px;border:1px solid #ddd">${p.price.toFixed(2)}</td>` : ''}
      <td style="padding:8px;border:1px solid #ddd">${p.quantity}</td>
      <td style="padding:8px;border:1px solid #ddd">${p.subtotal.toFixed(2)}</td>
    </tr>
  `).join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin:20px 0">
      <thead>
        <tr>
          <th style="border:1px solid #ddd;padding:8px">Product</th>
          <th style="border:1px solid #ddd;padding:8px">Brand</th>
          <th style="border:1px solid #ddd;padding:8px">Color</th>
          <th style="border:1px solid #ddd;padding:8px">Size</th>
          ${showPrice ? `<th style="border:1px solid #ddd;padding:8px">Price</th>` : ''}
          <th style="border:1px solid #ddd;padding:8px">Quantity</th>
          <th style="border:1px solid #ddd;padding:8px">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

module.exports = { header, footer, productsTable };
