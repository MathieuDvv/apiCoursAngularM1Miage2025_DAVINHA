const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AssignmentSchema = new Schema({
    nom: String,
    dateDeRendu: Date,
    description: String,
    userId: { type: Schema.Types.ObjectId, ref: 'User' }
});

module.exports = mongoose.model('Assignment', AssignmentSchema);
