const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

    const user1Id = new ObjectId('652d0e81f702a9e6a2c3b1a1');
    const user2Id = new ObjectId('652d0e81f702a9e6a2c3b1a2');

    const users = [
        {
            _id: user1Id,
            username: 'admin',
            password: 'password', // In a real app, hash this!
            name: 'Admin User',
            isAdmin: true
        },
        {
            _id: user2Id,
            username: 'user',
            password: 'password',
            name: 'Normal User',
            isAdmin: false
        }
    ];

    const assignments = [
        {
          _id: new ObjectId('652d0e81f702a9e6a2c3b1c1'),
          nom: 'Devoir de Maths',
          dateDeRendu: new Date('2023-11-20'),
          rendu: false,
          description: 'Faire les exercices 1 à 5 du chapitre 3 sur les intégrales.',
          userId: user2Id
        },
        {
          _id: new ObjectId('652d0e81f702a9e6a2c3b1c2'),
          nom: 'Devoir de Français',
          dateDeRendu: new Date('2023-12-15'),
          rendu: true,
          description: 'Rédiger une dissertation sur le thème du romantisme.',
          userId: user1Id
        },
        {
          _id: new ObjectId('652d0e81f702a9e6a2c3b1c3'),
          nom: "Devoir d'Histoire",
          dateDeRendu: new Date('2023-11-20'),
          rendu: false,
          description: "Préparer un exposé sur la Révolution Française.",
          userId: user1Id
        },
        {
          _id: new ObjectId('652d0e81f702a9e6a2c3b1c4'),
          nom: "Devoir d'Anglais",
          dateDeRendu: new Date('2023-12-15'),
          rendu: false,
          description: "Écrire un essai sur l'impact de la technologie.",
          userId: user2Id
        },
    ];

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");

        const database = client.db('assignments_db');
        const assignmentsCollection = database.collection('assignments');
        const usersCollection = database.collection('users');

        // Clear the collection
        await assignmentsCollection.deleteMany({});
        await usersCollection.deleteMany({});
        console.log('Cleared the collections.');

        // Insert the new data
        const resultAssignments = await assignmentsCollection.insertMany(assignments);
        const resultUsers = await usersCollection.insertMany(users);
        
        console.log(`${resultAssignments.insertedCount} assignments were inserted.`);
        console.log(`${resultUsers.insertedCount} users were inserted.`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

run().catch(console.dir);