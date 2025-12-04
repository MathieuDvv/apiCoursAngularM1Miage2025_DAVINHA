const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SubmissionSchema = new Schema({
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now }
});

// Ensure unique submission per assignment (assuming 1 submission per assignment task)
SubmissionSchema.index({ assignmentId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Submission', SubmissionSchema);
