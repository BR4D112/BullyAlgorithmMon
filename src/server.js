const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const net = require('net');
const axios = require('axios');
const bodyParser = require('body-parser');
const app = express();

app.use(cors());

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let lastPort = 5123; // Puerto inicial crear server
let websocketSend;

const servers = [
    { ip: '192.168.128.3', id: 123, port: 8000, active: true, leadStatus: false }
    //{ ip: '192.168.128.4', port: 5002, active: false, difference: 0 },
];

let average = 0;


function updateServerDifferences() {
    let sum = 0;
    let count = 0;
    // Calculate the sum of differences and the count of active servers
    servers.forEach(server => {
        if (server.active) {
            sum += server.difference;
            count++;
            console.log(`Primera diferencia Server ${server.ip}:${server.port} difference: ${server.difference}`);
            sendLog(`LOG [${getFormattedDate().date}] ${server.ip} set new diference`);
        }
    });

    // Calculate the average difference
    let average = Math.floor(sum / (count + 1));

    // Subtract the average from each server's difference
    servers.forEach(server => {
        if (server.active) {
            server.difference -= average;
            console.log(`Segunda diferencia Server ${server.ip}:${server.port} difference: ${server.difference}`);
        }
    });
}

function createServer(id) {
    return new Promise((resolve, reject) => {
    lastPort += 1; // Incrementar el puerto
    const ip = '192.168.128.3'; // IP inicial
    const newServer = { ip: ip, id: id, port: lastPort, active: false, leadStatus: false };
    servers.push(newServer);

    const scriptPath = path.join(__dirname, 'serverCreator.sh');

    //const knownPorts = servers.map(server => server.port).join(','); //listar los puertos hasta ahora conocidos
    const knownPorts = servers.map(server => server.port).join(', ');

    // Ejecutar el script con ip, port y lista de puertos como parámetros
    exec(`${scriptPath} ${lastPort} ${id} ${knownPorts}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error al ejecutar el script: ${error}`);
            return;
        }
        console.log(`Salida del script: ${stdout}`);
        console.error(`Errores del script: ${stderr}`);
    });
    console.log(servers);
    currentLeng = false;
    hasChange["messageToprint"] = `servidor creado con ip: ${ip} y puerto: ${lastPort}`;
    //return newServer;
    resolve(newServer);
    });
}

function logServerNumbers() {
    let now = new Date();
    let timestamp = now.toISOString();

    let logMessage = `${firstTime} - Average difference: ${average}`;

    for (let i = 0; i < activeServerNumbers.length; i++) {
        logMessage += `, Difference for node ${i + 1}: ${activeServerNumbers[i].number}`;
    }

    console.log(logMessage);
}

let firstTime;

app.post('/createServer', (req, res) => {
    const newServer = createServer(req.body.id);
    res.json(newServer);
});

app.post('/stopServer', (req, res) => {
    const ip = req.body.ip;
    const port = req.body.port;

    // Find the server with the specified ip and port
    const server = servers.find(server => server.ip === ip && server.port === port);
    if (!server) {
        res.status(404).json({ message: 'Server not found' });
        return;
    }

    const scriptPath = path.join(__dirname, 'serverKiller.sh');

    exec(`${scriptPath} ${ip} ${port}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error stopping container: ${error}`);
            res.status(500).json({ message: 'Error stopping server' });
            return;
        }
        console.log(`Container stopped: ${stdout}`);
        res.json({ message: 'Server stopped successfully' });
    });
});

app.post('/timeReq', (req, res) => {
    const date = new Date().toISOString();

    servers.forEach(server => {
        if (server.active) {
            axios.get(`http://${server.ip}:${server.port}/getdiff`, {
                data: { date: date }
            })
                .then(function (response) {
                    server.difference = parseInt(response.data.difference);
                    console.log(date);
                    console.log(response.data);
                    console.log(server.difference);

                    updateServerDifferences();

                    // Send the updated difference to the Python server
                    axios.post(`http://${server.ip}:${server.port}/update-diff`, {
                        difference: server.difference
                    })
                        .then(function (response) {
                            console.log('Difference updated successfully');
                            sendLog(`LOG [${date}] ${server.ip} has new difference update`);
                        })
                        .catch(function (error) {
                            console.log('Failed to update difference: ', error);
                        });
                })
                .catch(function (error) {
                    console.log(error);
                });
        }
    });

    res.sendStatus(200);
});

let queue = [];

app.post('/addRequest', (req, res) => {
    const { email, count, scraping } = req.body;

    if (!email || !count || !scraping) {
        res.status(400).json({ message: 'Missing required fields' });
        return;
    }

    const newRequest = {
        email: email,
        count: count,
        scraping: scraping,
        active: false,
        difference: 0
    };

    queue.push(newRequest);
    res.status(200).json(newRequest);
});

let previousState = {
    servers: JSON.stringify(servers),
    queue: JSON.stringify(queue)
};

setInterval(() => {
    const currentState = {
        servers: JSON.stringify(servers),
        queue: JSON.stringify(queue)
    };

    if (currentState.servers !== previousState.servers || currentState.queue !== previousState.queue) {
        console.log('Servers:');
        servers.forEach((server, index) => {
            console.log(`Server ${index + 1}:`);
            console.log(`IP: ${server.ip}`);
            console.log(`Port: ${server.port}`);
            console.log(`Active: ${server.active}`);
        });

        console.log(`Total servers: ${servers.length}`);

        console.log('Queue:');
        queue.forEach((request, index) => {
            console.log(`Request ${index + 1}:`);
            console.log(`Email: ${request.email}`);
            console.log(`Count: ${request.count}`);
            console.log(`Scraping: ${request.scraping}`);
            console.log(`Active: ${request.active}`);
        });

        console.log(`Total requests in queue: ${queue.length}`);

        previousState = currentState;
    }

    servers.forEach(server => {
        if (server.active && queue.length > 0) {
            const request = queue.shift();
            const requestData = {
                email: request.email,
                count: request.count,
                scraping: request.scraping
            };
            server.active = false;
            axios.post(`http://${server.ip}:${server.port}/scrape`, requestData)
                .then(response => {
                    if (response.data.status === 'success') {
                        server.active = true;
                    }
                })
                .catch(error => {
                    console.error(error);
                });
        }
    });

    if (queue.length >= 6 && !servers.some(server => server.active)) {
        createServer('default-id').then(newServer => {
            servers.push(newServer);
            const request = queue.shift();
            newServer.active = true;
            axios.post(`http://${newServer.ip}:${newServer.port}/scrape`, request)
                .then(response => {
                    if (response.data.status === 'success') {
                        newServer.active = true;
                    }
                })
                .catch(error => {
                    console.error(error);
                });
        });
    }
}, 1000);

app.post('/leadStatus', (req, res) => {
    const { port, leadStatus } = req.body;
    console.log('cambiando el estado a lider');

    // Convert port to a number
    const portNumber = parseInt(port, 10);
    console.log(portNumber);

    // If a new leader is being assigned, ensure there is only one leader
    if (leadStatus) {
        servers.forEach(server => {
            server.leadStatus = false;
        });
    }

    // Find the server with the specified port
    const server = servers.find(server => server.port === portNumber);
    console.log(servers);
    if (!server) {
        res.status(404).json({ message: 'Server not found' });
    } else {
        // Update the leadStatus of the server
        server.leadStatus = leadStatus;
        res.json({ message: 'Lead status updated successfully' });
    }
});

function getFormattedDate() {
    const now = new Date();
    return {
        date: `${now.toISOString()}`
    }
}
function sendLog(messageIn) {
    wss.on("connection", (ws) => {
        ws.on('message', () => {
        })
        ws.send(`received: ${messageIn}`);
    })
}

function checkServerConnection(server) { // se obtiene la info del servidor 
    return new Promise((resolve) => {
        const socket = net.createConnection(server.port, server.ip, () => { // se intenta una conexion con ese servidor
            resolve(true);
            socket.end();
        });
        socket.on('error', () => {
            resolve(false);
        });
    });
}
let currentLeng = true;

const hasChange = {
    isNewCheck: true,
    messageToprint: "hay nuevos servidores"
};


/*
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log('received: %s', message);
    });
    // Verificar la conexión con los servidores cada segundo
    setInterval(async () => {
        for (let server of servers) {
            server.active = await checkServerConnection(server); // se cambia el atributo de active si acepta o rechaza la conexion
        }
        const toSend = currentLeng ? JSON.stringify(servers) : JSON.stringify(hasChange);
        ws.send(toSend);
        currentLeng = true;
        websocketSend = ws;
    }, 1000); // se verifica si los servidores estan ON cada  1 segundo
});
*/
server.listen(process.env.PORT || 8999, () => {
    const message = `Good Server started on port ${server.address().port}`;
    console.log(message);

    // Enviar el mensaje inicial a todos los clientes conectados
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'log', message }));
        }
    });
});