const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const path = require('path');
const WebSocket = require('ws');
const mysql = require('mysql');


//SQL CONNECTION
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dbque',
});
//SQL DISPLAY ERROR
db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to the database');
    }
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));


//MAX HISTORY 5 PARA SA LENGTH HISTORY ARRAY ESULOD ANG DATA NGA QUEUE +1 TAGA PUSH
const queue = [];
const MAX_HISTORY = 5;
const history = [];


queue.push(1);


const server = require('http').createServer(app);


const wss = new WebSocket.Server({ server });

function broadcastQueueUpdate() {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                //SLICE PARA MAG -1 ANG HISTORY
                queueNumber: queue[0],
                history: history.slice(-MAX_HISTORY),
            }));
        }
    });
}
// CONNECT PARA SA MONITOR
wss.on('connection', (ws) => {

    ws.send(JSON.stringify({
        queueNumber: queue[0],
        history: history.slice(-MAX_HISTORY),
    }));
});
// CONNECTION PARA SA TELLER NGA MAG KUHA SA CURRENT NUMBER SA MONITOR TAS MAG +1 SA CURRENT NGA NUMBER
app.post('/enqueue', (req, res) => {
    const customerNumber = queue.length;
    queue.push(customerNumber);
    history.push(customerNumber);
    if (history.length > MAX_HISTORY) {
        history.shift();
    }
    broadcastQueueUpdate();
    res.json({ customerNumber });
});

// PARA MA VIEW ANG MGA USERS SA NODE JS
app.get('/teller', (req, res) => {
    res.sendFile(path.join(__dirname, 'teller.html'));
});
app.get('/monitor', (req, res) => {
    res.sendFile(path.join(__dirname, 'monitor.html'));
});
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});
//ADD SA TELLER SA DATABASE
app.post('/addTeller', (req, res) => {
    const { username, password, fullname } = req.body;


    if (!username || !password || !fullname) {
        res.status(400).json({ message: 'All fields are required' });
        return;
    }


    const insertQuery = 'INSERT INTO tblusers (user_username, user_password, user_fullname, user_role) VALUES (?, ?, ?, ?)';
    const values = [username, password, fullname, 1];

    db.query(insertQuery, values, (err, result) => {
        if (err) {
            console.error('Database error:', err);
            res.status(500).json({ message: 'Database error' });
        } else {
            res.status(200).json({ message: 'Teller added successfully' });
        }
    });
});


//LOGIN SA TELLER OG SA ADMIN
app.post('/login', (req, res) => {
    const { username, password } = req.body;


    if (!username || !password) {
        res.status(400).json({ message: 'Both username and password are required' });
        return;
    }


    db.query(
        'SELECT * FROM tblusers WHERE user_username = ? AND user_password = ?', [username, password],
        (err, results) => {
            console.log(results);
            if (err) {
                console.error('Database error:', err);
                res.status(500).json({ message: 'Database error' });
            } else if (results.length > 0) {
                console.log(results[0].user_role);
                if (results[0].user_role == 1) {
                    res.redirect('/teller');
                } else if (results[0].user_role == 2) {
                    res.redirect('/admin');
                }


            } else {
                res.status(401).json({ message: 'Invalid username or password' });
            }
        }
    );
});

// DEFUALT PORT KAY 3000 IF MAG CONFLICT SA XAMPP CHANGE LANG ANG PORT SA XAMPP 
const port = 3000;
server.listen(port, () => {
    console.log(`Queue System Backend is running on port ${port}`);
});