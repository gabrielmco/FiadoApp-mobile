const http = require('http');

function request(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api' + path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(body));
                    } else {
                        // For 404/500, still resolve to show error, or reject
                        resolve({ error: res.statusCode, body });
                    }
                } catch (e) {
                    resolve({ error: 'Invalid JSON', body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function run() {
    console.log('--- Verifying Backend Endpoints ---');

    try {
        // 1. Get Products
        console.log('Testing GET /products...');
        const products = await request('/products');
        console.log('Products:', Array.isArray(products) ? `OK (${products.length} found)` : products);

        // 2. Get Clients
        console.log('\nTesting GET /clients...');
        const clients = await request('/clients');
        console.log('Clients:', Array.isArray(clients) ? `OK (${clients.length} found)` : clients);

        // 3. Get Sales
        console.log('\nTesting GET /sales...');
        const sales = await request('/sales');
        console.log('Sales:', Array.isArray(sales) ? `OK (${sales.length} found)` : sales);

        // 4. Create Product (Test)
        console.log('\nTesting POST /products...');
        const newProd = await request('/products', 'POST', {
            name: "Test Product " + Date.now(),
            price: 10.50,
            cost: 5.00,
            trackStock: true,
            stock: 100
        });
        console.log('Created Product:', newProd.id ? 'OK' : newProd);

        // 5. Create Client (Test)
        console.log('\nTesting POST /clients...');
        const newClient = await request('/clients', 'POST', {
            name: "Test Client " + Date.now(),
            phone: "123456789"
        });
        console.log('Created Client:', newClient.id ? 'OK' : newClient);

    } catch (err) {
        console.error('Verification Failed:', err.message);
        console.log('Make sure the backend is running on port 3000!');
    }
}

run();
