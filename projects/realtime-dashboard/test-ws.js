const WebSocket = require('ws');

// Wait 5 seconds before connecting to ensure server is ready
const ws = new WebSocket('ws://localhost:3000/ws');
    
    ws.on('open', () => {
        console.log('✅ WebSocket connected to server');
    });
    
    ws.on('message', (data) => {
        try {
            const json = JSON.parse(data);
            console.log('✅ Data received!');
            console.log('Timestamp:', json.timestamp);
            console.log('');
            console.log('TS Host (172.16.254.5):');
            console.log('  CPU1:', json.ts.cpu1 + '°C');
            console.log('  CPU2:', json.ts.cpu2 + '°C');
            console.log('  System:', json.ts.sys + '°C');
            console.log('  Fan1:', json.ts.fan1 + ' RPM');
            console.log('  Fan2:', json.ts.fan2 + ' RPM');
            console.log('  Fan5:', json.ts.fan5 + ' RPM');
            console.log('');
            console.log('Node2 Host (172.16.254.101):');
            console.log('  GPU0 Temp:', json.node2.gpu0_temp + '°C');
            console.log('  GPU1 Temp:', json.node2.gpu1_temp + '°C');
            console.log('  GPU0 VRAM:', json.node2.gpu0_mem + '/' + json.node2.gpu0_total + ' MiB');
            console.log('  GPU1 VRAM:', json.node2.gpu1_mem + '/' + json.node2.gpu1_total + ' MiB');
            console.log('  GPU0 Power:', json.node2.gpu0_power + 'W');
            console.log('  GPU1 Power:', json.node2.gpu1_power + 'W');
            console.log('  Total Power:', json.node2.total_power + 'W');
            console.log('  Est. Daily Cost: $' + json.node2.daily_cost);
            ws.close();
            process.exit(0);
        } catch (e) {
            console.log('❌ Parse error:', e.message);
        }
    });
    
    ws.on('error', (err) => {
        console.log('❌ WebSocket error:', err.message);
        process.exit(1);
    });
    
    setTimeout(() => {
        setTimeout(() => {
        console.log('⏱️ Timeout waiting for data');
        ws.close();
        process.exit(1);
    }, 15000);
}, 5000);
