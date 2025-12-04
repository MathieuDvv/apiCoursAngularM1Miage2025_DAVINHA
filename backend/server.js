const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const assignment = require('./routes/assignments');
const User = require('./model/user');
const Assignment = require('./model/assignment');
const Submission = require('./model/submission');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uri = process.env.MONGO_URI;

if (!uri) {
    console.error("MONGO_URI not found in .env file. Please add it.");
    process.exit(1);
}

mongoose.connect(uri)
.then(
    () => {
        console.log('Connected to MongoDB via Mongoose!');
    },
    (err) => {
        console.log('Connection error: ', err);
    }
);

// --- Init DB Logic (Ported to Mongoose) ---
async function initDB() {
    // 1. Create Users
    const users = [];
    
    // Fixed users
    const user1Id = new mongoose.Types.ObjectId('652d0e81f702a9e6a2c3b1a1');
    const user2Id = new mongoose.Types.ObjectId('652d0e81f702a9e6a2c3b1a2');
    
    users.push({
        _id: user1Id,
        username: 'admin',
        password: 'password', 
        name: 'Admin User',
        isAdmin: true
    });
    
    users.push({
        _id: user2Id,
        username: 'user',
        password: 'password',
        name: 'Normal User',
        isAdmin: false
    });

    // Generate 18 more random users
    for (let i = 3; i <= 20; i++) {
        users.push({
            _id: new mongoose.Types.ObjectId(),
            username: `user${i}`,
            password: 'password',
            name: `User ${i}`,
            isAdmin: false // Optional: make some random admins if desired
        });
    }

    // 2. Create Assignments & Submissions
    const assignments = [];
    const submissions = [];
    const subjects = ['Maths', 'Français', 'Histoire', 'Anglais', 'Physique', 'SVT', 'Philo', 'Info', 'Art', 'Musique'];
    const actions = ['Devoir de', 'Projet de', 'Exposé sur', 'Exercices de', 'Révision de'];
    
    for (let i = 1; i <= 50; i++) {
        const subject = subjects[Math.floor(Math.random() * subjects.length)];
        const action = actions[Math.floor(Math.random() * actions.length)];
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const isRendu = Math.random() < 0.5;
        
        const assignmentId = new mongoose.Types.ObjectId();

        // Random date between 1 month ago and 2 months future
        const date = new Date();
        date.setDate(date.getDate() + Math.floor(Math.random() * 90) - 30);

        assignments.push({
            _id: assignmentId,
            nom: `${action} ${subject} #${i}`,
            dateDeRendu: date,
            // rendu: isRendu, // Removed from schema
            description: `Description détaillée pour le devoir de ${subject} numéro ${i}.`,
            userId: randomUser._id
        });

        if (isRendu) {
            submissions.push({
                assignmentId: assignmentId,
                userId: randomUser._id
            });
        }
    }

    try {
        await Assignment.deleteMany({});
        await User.deleteMany({});
        await Submission.deleteMany({});
        
        const resultAssignments = await Assignment.insertMany(assignments);
        const resultUsers = await User.insertMany(users);
        const resultSubmissions = await Submission.insertMany(submissions);
        
        console.log(`${resultAssignments.length} assignments were inserted.`);
        console.log(`${resultUsers.length} users were inserted.`);
        console.log(`${resultSubmissions.length} submissions were inserted.`);
        
        return { 
            assignments: resultAssignments.length, 
            users: resultUsers.length,
            submissions: resultSubmissions.length
        };
    } catch (err) {
        console.error("Error in initDB:", err);
        throw err;
    }
}

// --- Routes ---
const prefix = '/api';

// Status
app.get(prefix + '/status', (req, res) => {
    if (mongoose.connection.readyState === 1) {
        res.json({ dbConnected: true });
    } else {
        res.json({ dbConnected: false });
    }
});

// DB Init
app.post(prefix + '/db/init', async (req, res) => {
    try {
        const counts = await initDB();
        res.json({ message: 'Database initialized', counts });
    } catch (err) {
        res.status(500).json({ message: 'Database initialization failed', error: err.message });
    }
});

// Auth
app.post(prefix + '/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username, password });
        if (user) {
            // In a real app, generate a token here
            const userObj = user.toObject();
            const { password, ...userWithoutPassword } = userObj;
            res.json({ success: true, user: userWithoutPassword, token: 'fake-jwt-token' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Users
app.post(prefix + '/users', async (req, res) => {
    const user = new User(req.body);
    if (!user.username || !user.password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    try {
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Assignments
app.route(prefix + '/assignments')
  .get(assignment.getAssignments)
  .post(assignment.postAssignment);

app.route(prefix + '/assignments/:id')
  .get(assignment.getAssignment)
  .put(assignment.updateAssignment)
  .delete(assignment.deleteAssignment);

// Start server
app.listen(port, () => {
    console.log(`Server (Mongoose) listening at http://localhost:${port}`);
});